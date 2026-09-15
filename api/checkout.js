const Stripe = require('stripe');
const { verifyRequest, ensureUserProfile } = require('./_firebase');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_PRICE_ID) {
    return res.status(503).json({ error: 'Billing is not configured yet' });
  }

  try {
    const decoded = await verifyRequest(req);
    const { ref, data } = await ensureUserProfile(decoded);
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let customerId = data.stripeCustomerId || null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: decoded.email || undefined,
        name: decoded.name || undefined,
        metadata: { firebaseUid: decoded.uid, product: 'CalendarFuse' },
      });
      customerId = customer.id;
      await ref.set({ stripeCustomerId: customerId }, { merge: true });
    }

    const origin = `https://${req.headers.host || 'calendarfuse.com'}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      allow_promotion_codes: true,
      client_reference_id: decoded.uid,
      metadata: { firebaseUid: decoded.uid, product: 'CalendarFuse' },
      subscription_data: {
        metadata: { firebaseUid: decoded.uid, product: 'CalendarFuse' },
      },
      success_url: `${origin}/account?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/account?checkout=cancelled`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error) {
    console.error('checkout_error', error);
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to start checkout' });
  }
};
