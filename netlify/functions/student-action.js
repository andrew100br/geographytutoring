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
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseServiceKey);

        // Verify the user token securely via Admin API
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        if (authError || !user) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Invalid or expired auth token.' }) };
        }

        if (action === 'send_message') {
            const { content } = data;

            // Failsafe: Upsert their profile so the foreign key constraint NEVER fails
            const pendingProfileStr = event.headers['x-pending-profile'];
            let parentName = "Website Member";
            let childName = "Student";
            if (pendingProfileStr) {
                try {
                    const pData = JSON.parse(pendingProfileStr);
                    parentName = pData.parent_name || parentName;
                    childName = pData.child_name || childName;
                } catch (e) { }
            }

            // Using the service key, upsert profile to guarantee existence
            await supabase.from('profiles').upsert({
                id: user.id,
                email: user.email,
                parent_name: parentName,
                child_name: childName,
                credits: 0 // Will not overwrite existing credits if we use conflict rules, but let's just do a distinct lookup first
            }, { onConflict: 'id', ignoreDuplicates: true });

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
