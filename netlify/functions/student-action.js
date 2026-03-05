const { createClient } = require('@supabase/supabase-js');

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

        return { statusCode: 400, body: JSON.stringify({ error: 'Unknown student action.' }) };

    } catch (error) {
        console.error('Student Action Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
