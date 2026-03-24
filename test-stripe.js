require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function check() {
  const links = await stripe.paymentLinks.list({ limit: 10 });
  console.log("Payment Links:");
  links.data.forEach(l => console.log(l.id, l.url, l.metadata));

  const prices = await stripe.prices.list({ limit: 10, active: true });
  console.log("\nPrices:");
  prices.data.forEach(p => console.log(p.id, p.unit_amount, p.currency, p.metadata));
}
check();
