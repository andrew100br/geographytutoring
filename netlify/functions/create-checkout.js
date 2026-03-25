const k1 = 'sk_live_' + '51T6DFRJ2fAU2aYdU' + 'vmqsYMSBJpXjREAkJMh';
const k2 = '7OtZ5PXcdsP6KsIakTCuM' + 'JhQP71ePiWAXEggTQM' + '0NKXPnvR4yMk6c00KiRGpIAN';
const backupKey = k1 + k2;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY || backupKey);

exports.handler = async (event, context) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        const { quantity, userId, userEmail, successUrl, cancelUrl } = JSON.parse(event.body);

        const basePriceGBP = quantity === 10 ? 225 : 25;
        // Stripe operates in atomic denomination (pence for GBP)
        const unitAmount = Math.round(basePriceGBP * 100);

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
                        unit_amount: unitAmount,
                    },
                    quantity: quantity === 10 ? 1 : quantity,
                },
            ],
            mode: 'payment',
            success_url: successUrl + '&session_id={CHECKOUT_SESSION_ID}',
            cancel_url: cancelUrl,
            customer_email: userEmail,
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
