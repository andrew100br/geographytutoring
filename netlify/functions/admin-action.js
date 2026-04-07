const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { action, payload, password } = JSON.parse(event.body);

        // Very basic hardcoded admin authentication matching the frontend mockup
        if (password !== 'EnaPatchy!10') {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized. Incorrect admin password.' })
            };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

        // Initialize Supabase admin client to bypass RLS policies safely
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (action === 'get_dashboard_data') {
            const { data: profiles, error } = await supabase.from('profiles').select('*');
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ profiles }) };
        }

        if (action === 'delete_user') {
            const { userId } = payload;

            // Cleanup foreign keys first
            await supabase.from('bookings').delete().eq('user_id', userId);
            await supabase.from('messages').delete().eq('user_id', userId);
            await supabase.from('profiles').delete().eq('id', userId);

            // Delete from Auth
            const { error } = await supabase.auth.admin.deleteUser(userId);
            if (error) throw error;

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'add_user') {
            const { email, password, childName, parentName, country } = payload;

            const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                email: email,
                password: password,
                email_confirm: true
            });

            if (authError) throw authError;

            const { error: profileError } = await supabase.from('profiles').insert([{
                id: authData.user.id,
                email: email,
                child_name: childName,
                parent_name: parentName,
                country: country,
                credits: 0
            }]);

            if (profileError) throw profileError;

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'edit_user') {
            const { userId, childName, parentName, country, credits } = payload;
            const updateData = {
                child_name: childName,
                parent_name: parentName,
                country: country
            };
            if (credits !== undefined && credits !== null) {
                const parsedCredits = parseInt(credits, 10);
                if (!isNaN(parsedCredits) && parsedCredits >= 0) {
                    updateData.credits = parsedCredits;
                }
            }
            const { error: updateError } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', userId);

            if (updateError) throw updateError;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'send_message') {
            const { userId, content } = payload;
            const { error } = await supabase.from('messages').insert([{
                user_id: userId,
                content: content,
                is_from_admin: true
            }]);

            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'cancel_booking') {
            const { bookingId, userId, refund } = payload;

            // Soft-delete the booking by marking status as cancelled
            const { error: deleteError } = await supabase
                .from('bookings')
                .update({ status: 'cancelled' })
                .eq('id', bookingId);

            if (deleteError) throw deleteError;

            // Refund if needed dynamically from DB
            if (refund) {
                const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                const currentCredits = profile ? parseInt(profile.credits, 10) || 0 : 0;
                
                const { error: refundError } = await supabase
                    .from('profiles')
                    .update({ credits: currentCredits + 1 })
                    .eq('id', userId);

                if (refundError) throw refundError;
            }

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'reschedule_booking') {
            const { bookingId, newIsoString, refund, userId } = payload;

            // 1. Fetch the old booking to clone it
            const { data: oldBooking, error: fetchError } = await supabase
                .from('bookings')
                .select('*')
                .eq('id', bookingId)
                .single();
            if (fetchError) throw fetchError;

            // 2. Check the new slot isn't already taken by another booking
            const { data: conflict } = await supabase
                .from('bookings')
                .select('id')
                .eq('booking_date', newIsoString)
                .in('status', ['confirmed', 'rescheduled'])
                .neq('id', bookingId);
            if (conflict && conflict.length > 0) {
                return {
                    statusCode: 409,
                    body: JSON.stringify({ error: 'That time slot is already booked. Please choose a different time.' })
                };
            }

            // 3. Mark the old booking as amended
            const { error: updateError } = await supabase
                .from('bookings')
                .update({ status: 'amended' })
                .eq('id', bookingId);
            if (updateError) throw updateError;

            // 4. Insert a new booking with the new date, marked as rescheduled so the
            //    student can clearly see their lesson was moved (amber badge on calendar)
            const { error: insertError } = await supabase
                .from('bookings')
                .insert([{
                    user_id: oldBooking.user_id,
                    booking_date: newIsoString,
                    is_monthly: oldBooking.is_monthly,
                    is_ten_lessons: oldBooking.is_ten_lessons,
                    status: 'rescheduled'
                }]);
            if (insertError) throw insertError;

            if (refund && userId) {
                const { data: profile } = await supabase.from('profiles').select('credits').eq('id', userId).single();
                const currentCredits = profile ? parseInt(profile.credits, 10) || 0 : 0;
                
                const { error: refundError } = await supabase
                    .from('profiles')
                    .update({ credits: currentCredits + 1 })
                    .eq('id', userId);

                if (refundError) throw refundError;
            }

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'block_slot') {
            const { slotIso } = payload;
            // Use a fixed sentinel UUID as user_id (user_id is NOT NULL in DB).
            // This UUID will never match a real user profile.
            const BLOCKED_SENTINEL = '00000000-0000-0000-0000-000000000000';
            const { error } = await supabase.from('bookings').insert([{
                user_id: BLOCKED_SENTINEL,
                booking_date: slotIso,
                is_monthly: false,
                is_ten_lessons: false,
                status: 'blocked'
            }]);
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'unblock_slot') {
            const { slotIso } = payload;
            const { error } = await supabase.from('bookings')
                .delete()
                .eq('booking_date', slotIso)
                .eq('status', 'blocked');
            if (error) throw error;
            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Unknown action specified.' })
        };

    } catch (error) {
        console.error('Admin Action Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
