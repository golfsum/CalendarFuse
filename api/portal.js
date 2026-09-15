const Stripe = require('stripe');
const { verifyRequest, ensureUserProfile } = require('./_firebase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Billing is not configured yet' });

  try {
    const decoded = await verifyRequest(req);
    const { data } = await ensureUserProfile(decoded);
    if (!data.stripeCustomerId) return res.status(400).json({ error: 'No billing profile found yet' });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const origin = `https://${req.headers.host || 'calendarfuse.com'}`;
    const session = await stripe.billingPortal.sessions.create({
      customer: data.stripeCustomerId,
      return_url: `${origin}/account`,
    });
    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('portal_error', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to open billing portal' });
  }
};
