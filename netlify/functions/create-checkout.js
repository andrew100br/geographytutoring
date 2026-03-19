const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { quantity, userId, userEmail, successUrl, cancelUrl } = JSON.parse(event.body);

        // Define the lesson bundle price and product description
        const unitAmount = 2500; // £25.00 in pence

        // Create a Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: quantity === 10 ? '10-Lesson Geography Bundle' : 'Geography Lesson Credit',
                            description: quantity === 10 ? 'A bundle of 10 lesson credits at a discounted rate.' : 'A single lesson credit.',
                        },
                        // If it's the 10-bundle, we charge 225 instead of 250
                        unit_amount: quantity === 10 ? 22500 : unitAmount,
                    },
                    // If it's a 10 bundle, we are buying '1' bundle item
                    quantity: quantity === 10 ? 1 : quantity,
                },
            ],
            mode: 'payment',
            success_url: successUrl + '&session_id={CHECKOUT_SESSION_ID}',
            cancel_url: cancelUrl,
            customer_email: userEmail,
            // Pass the user ID and exact credit amount as metadata so the webhook knows who to give credits to
            metadata: {
                userId: userId,
                creditsToAdd: quantity
            }
        });

        // Return the session ID to the frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ sessionId: session.id, url: session.url })
        };

    } catch (error) {
        console.error('Stripe Checkout Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
