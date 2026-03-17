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

            // Use native HTTPS to ensure it works on all Node versions reliably without fetch
            const https = require('https');
            const postData = JSON.stringify({
                name: name,
                email: email,
                message: message,
                service: service || "N/A",
                _subject: `New Inquiry from ${name}`
            });

            const host = event.headers.host || 'teacher-andrew.com';
            const origin = event.headers.origin || `https://${host}`;
            const referer = event.headers.referer || `https://${host}/`;

            const options = {
                hostname: 'formsubmit.co',
                path: '/ajax/andrew100br@gmail.com',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'Origin': origin,
                    'Referer': referer,
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };

            return new Promise((resolve) => {
                const req = https.request(options, (res) => {
                    let responseBody = '';
                    res.on('data', (chunk) => responseBody += chunk);
                    res.on('end', () => {
                        resolve({ statusCode: 200, body: JSON.stringify({ success: true, response: responseBody }) });
                    });
                });

                req.on('error', (e) => {
                    console.error("FormSubmit Error", e);
                    resolve({ statusCode: 500, body: JSON.stringify({ error: 'Failed to send message.' }) });
                });

                req.write(postData);
                req.end();
            });
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
            // FIX: The frontend sends the sessionId inside payload.payload
            const sessionId = payload.payload ? payload.payload.sessionId : payload.sessionId;
            
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
