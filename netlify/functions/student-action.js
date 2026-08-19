const { createClient } = require('@supabase/supabase-js');
const { createCalendarEvent } = require('./lib/google-calendar');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);
        const { action, token, data } = payload;

        if (!token) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Missing auth token.' }) };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

        // Construct the client using the user's token so that RLS evaluates auth.uid() correctly!
        const supabase = createClient(supabaseUrl, supabaseKey, {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        });

        // Verify the user token securely
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired auth token.' }) };
        }

        if (action === 'send_message') {
            const { content } = data;

            // Insert message securely bypassing RLS
            const { error: msgError } = await supabase.from('messages').insert([{
                user_id: user.id,
                content: content,
                is_from_admin: false
            }]);

            if (msgError) throw msgError;

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'book_slot') {
            const { bookingInserts } = data;

            if (!bookingInserts || !Array.isArray(bookingInserts) || bookingInserts.length === 0) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Invalid booking data.' }) };
            }

            // Force all bookings to belong to the authenticated user (ignore any user_id from client)
            const safeDates = bookingInserts.map(b => b.booking_date);

            // Conflict check using service role key — bypasses RLS, sees ALL users' bookings
            const serviceSupabase = createClient(
                process.env.SUPABASE_URL,
                process.env.SUPABASE_SERVICE_ROLE_KEY
            );

            const { data: conflicts } = await serviceSupabase
                .from('bookings')
                .select('booking_date')
                .in('booking_date', safeDates)
                .in('status', ['confirmed', 'rescheduled']);

            if (conflicts && conflicts.length > 0) {
                return { statusCode: 409, body: JSON.stringify({ error: 'One or more of these time slots have just been booked by another student. Please select a different time.' }) };
            }

            // Insert bookings
            const rows = bookingInserts.map(b => ({
                user_id: user.id,
                booking_date: b.booking_date,
                is_monthly: b.is_monthly,
                is_ten_lessons: b.is_ten_lessons,
                status: 'confirmed'
            }));

            const { error: insertError } = await serviceSupabase.from('bookings').insert(rows);
            if (insertError) throw insertError;

            // Deduct credits
            const { data: profile } = await serviceSupabase.from('profiles').select('credits, parent_name, child_name').eq('id', user.id).single();
            const newCredits = (profile?.credits || 0) - bookingInserts.length;
            await serviceSupabase.from('profiles').update({ credits: newCredits }).eq('id', user.id);

            // Sync to Google Calendar — best-effort, never blocks the booking response
            const studentLabel = [profile?.child_name, profile?.parent_name ? `(${profile.parent_name})` : null].filter(Boolean).join(' ') || user.email;
            await Promise.allSettled(rows.map(row => {
                const start = new Date(row.booking_date);
                const end = new Date(start.getTime() + 60 * 60 * 1000);
                return createCalendarEvent({
                    summary: `Geography Lesson - ${studentLabel}`,
                    description: `Booked via website. Student email: ${user.email}`,
                    startISO: start.toISOString(),
                    endISO: end.toISOString()
                });
            })).then(results => {
                results.forEach(r => { if (r.status === 'rejected') console.error('Calendar sync failed:', r.reason); });
            });

            return { statusCode: 200, body: JSON.stringify({ success: true, newCredits }) };
        }

        return { statusCode: 400, body: JSON.stringify({ error: 'Unknown student action.' }) };

    } catch (error) {
        console.error('Student Action Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
