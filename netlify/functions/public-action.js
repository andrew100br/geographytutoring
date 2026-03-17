const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
            const { name, email, message, service } = payload.data;

            // 1. Send email quietly via FormSubmit AJAX endpoint
            try {
                await fetch('https://formsubmit.co/ajax/andrew100br@gmail.com', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({
                        name: name,
                        email: email,
                        message: message,
                        service: service || "N/A",
                        _subject: `New Inquiry from ${name}`
                    })
                });
            } catch(e) {
                console.error("FormSubmit Error", e);
                // Continue with DB save even if email notify fails
            }

            // 2. Save to database
            let userId;
            const { data: profiles } = await supabase.from('profiles').select('id').eq('email', email).limit(1);

            if (profiles && profiles.length > 0) {
                userId = profiles[0].id;
            } else {
                const tempPassword = Math.random().toString(36).slice(-10) + 'A1!';

                const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                    email: email,
                    password: tempPassword,
                    email_confirm: true
                });

                if (authError) {
                    throw new Error("Failed to create temporary user for contact form.");
                }

                userId = authData.user.id;

                await supabase.from('profiles').insert([{
                    id: userId,
                    email: email,
                    child_name: "Contact Form Guest",
                    parent_name: name || "Website Visitor",
                    country: "Unknown",
                    credits: 0
                }]);
            }

            const { error: msgError } = await supabase.from('messages').insert([{
                user_id: userId,
                content: message,
                is_from_admin: false
            }]);

            if (msgError) throw msgError;

            return { statusCode: 200, body: JSON.stringify({ success: true }) };
        }

        if (action === 'get_booked_slots') {
            const { data: bookings, error } = await supabase
                .from('bookings')
                .select('booking_date')
                .gte('booking_date', new Date().toISOString());

            if (error) throw error;

            const bookedDates = bookings.map(b => b.booking_date);
            return { statusCode: 200, body: JSON.stringify({ bookedSlots: bookedDates }) };
        }

        if (action === 'verify_checkout') {
            const { sessionId } = payload;
            if (!sessionId) {
                return { statusCode: 400, body: JSON.stringify({ error: 'Missing sessionId' }) };
            }

            const session = await stripe.checkout.sessions.retrieve(sessionId);
            return { 
                statusCode: 200, 
                body: JSON.stringify({ 
                    status: session.payment_status,
                    creditsToAdd: session.metadata.creditsToAdd 
                }) 
            };
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
