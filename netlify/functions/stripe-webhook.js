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
                .select('credits')
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
