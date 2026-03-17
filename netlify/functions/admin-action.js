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

            // Delete booking
            const { error: deleteError } = await supabase
                .from('bookings')
                .delete()
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
