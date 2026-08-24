const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

// Must provide raw body for Stripe webhook signature verification
// By default, Netlify provides event.body as a string
exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const sig = event.headers['stripe-signature'];

    let stripeEvent;

    try {
        stripeEvent = stripe.webhooks.constructEvent(event.body, sig, endpointSecret);
    } catch (err) {
        console.error('Webhook signature verification failed:', err.message);
        return { statusCode: 400, body: `Webhook Error: ${err.message}` };
    }

    // Handle successful checkout
    if (stripeEvent.type === 'checkout.session.completed') {
        const session = stripeEvent.data.object;

        // Grab metadata we passed in during checkout creation
        const userId = session.metadata.userId;
        const creditsToAdd = parseInt(session.metadata.creditsToAdd, 10);

        // Connect to Supabase as Admin (to bypass RLS for server-side updates)
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Requires the secret service key in production

        // If no service key in env during dev, fallback to anon key (assuming RLS allows it, which currently requires uid match)
        // Since we are running in a backend context without the user's JWT, we MUST use the service_role key to update their profile securely.
        const supabase = createClient(
            supabaseUrl,
            supabaseServiceRoleKey || process.env.SUPABASE_ANON_KEY
        );

        try {
            // Get current credits
            const { data: profile, error: profileErr } = await supabase
                .from('profiles')
                .select('credits, parent_name, child_name')
                .eq('id', userId)
                .single();

            if (profileErr) throw profileErr;

            const newCredits = (profile.credits || 0) + creditsToAdd;

            // Update user's credits
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ credits: newCredits })
                .eq('id', userId);

            if (updateErr) throw updateErr;

            console.log(`Successfully added ${creditsToAdd} credits to user ${userId}`);

            // Email notification to Teacher Andrew
            if (process.env.RESEND_API_KEY) {
                const paid = typeof session.amount_total === 'number'
                    ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: (session.currency || 'gbp').toUpperCase() }).format(session.amount_total / 100)
                    : null;
                const studentName = profile.child_name || 'Unknown';
                const parentName = profile.parent_name || 'Unknown';
                await fetch('https://api.resend.com/emails', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        from: 'Teacher Andrew Site <newsletter@teacherandrewgeo.com>',
                        to: 'andrew100br@gmail.com',
                        subject: `Credit top-up: ${studentName} (+${creditsToAdd})`,
                        html: `
                            <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f8fafc;border-radius:10px;">
                              <h2 style="color:#1e3a5f;margin:0 0 8px;">Credits Purchased</h2>
                              <p style="color:#64748b;margin:0 0 20px;font-size:14px;">A client has topped up their lesson credits.</p>
                              <div style="background:#fff;border-radius:8px;padding:20px 24px;border:1px solid #e2e8f0;">
                                <p style="margin:0 0 6px;font-weight:700;color:#1e293b;font-size:16px;">${studentName} (${parentName})</p>
                                <p style="margin:0 0 4px;font-size:15px;color:#334155;">+${creditsToAdd} credit${creditsToAdd === 1 ? '' : 's'}${paid ? ` — paid ${paid}` : ''}</p>
                                <p style="margin:0;font-size:15px;color:#334155;">New balance: <strong>${newCredits}</strong> credit${newCredits === 1 ? '' : 's'}</p>
                              </div>
                              <p style="margin:20px 0 0;font-size:13px;color:#94a3b8;">Check the admin portal for full account details.</p>
                            </div>
                        `,
                    }),
                }).catch((emailErr) => console.error('Top-up email failed:', emailErr));
            }

        } catch (error) {
            console.error('Error updating Supabase:', error);
            // We return 500 here so Stripe retries the webhook later
            return { statusCode: 500, body: 'Error updating database.' };
        }
    }

    // Happy response to Stripe
    return {
        statusCode: 200,
        body: JSON.stringify({ received: true }),
    };
};
