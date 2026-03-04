const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { action, payload, password } = JSON.parse(event.body);

        // Very basic hardcoded admin authentication matching the frontend mockup
        if (password !== 'password123') {
            return {
                statusCode: 401,
                body: JSON.stringify({ error: 'Unauthorized. Incorrect admin password.' })
            };
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

        // Initialize Supabase admin client to bypass RLS policies safely
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
            const { bookingId, userId, currentCredits, refund } = payload;

            // Delete booking
            const { error: deleteError } = await supabase
                .from('bookings')
                .delete()
                .eq('id', bookingId);

            if (deleteError) throw deleteError;

            // Refund if needed
            if (refund) {
                const { error: refundError } = await supabase
                    .from('profiles')
                    .update({ credits: currentCredits + 1 })
                    .eq('id', userId);

                if (refundError) throw refundError;
            }

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'reschedule_booking') {
            const { bookingId, newIsoString } = payload;

            const { error } = await supabase
                .from('bookings')
                .update({ booking_date: newIsoString })
                .eq('id', bookingId);

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
