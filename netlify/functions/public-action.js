const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const payload = JSON.parse(event.body);
        const { action } = payload;

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        if (action === 'submit_contact_form') {
            const { name, email, message } = payload.data;

            // Check if user already exists
            let userId;
            const { data: profiles } = await supabase.from('profiles').select('id').eq('email', email).limit(1);

            if (profiles && profiles.length > 0) {
                userId = profiles[0].id;
            } else {
                // Generate secure random password
                const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

                // Create auth user
                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: email,
                    password: tempPassword,
                    email_confirm: true
                });

                if (authError) {
                    console.error("Auth Error:", authError);
                    throw new Error("Failed to create temporary user for contact form.");
                }

                userId = authData.user.id;

                // Create profile
                await supabase.from('profiles').insert([{
                    id: userId,
                    email: email,
                    child_name: "Contact Form Guest",
                    parent_name: name || "Website Visitor",
                    country: "Unknown",
                    credits: 0
                }]);
            }

            // Insert message
            const { error: msgError } = await supabase.from('messages').insert([{
                user_id: userId,
                content: message,
                is_from_admin: false
            }]);

            if (msgError) throw msgError;

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        return { statusCode: 400, body: JSON.stringify({ error: 'Unknown public action.' }) };

    } catch (error) {
        console.error('Public Action Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
