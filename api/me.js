const { verifyRequest, ensureUserProfile } = require('./_firebase');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const decoded = await verifyRequest(req);
    const { ref } = await ensureUserProfile(decoded);
    const snap = await ref.get();
    const data = snap.data() || {};

    return res.status(200).json({
      uid: decoded.uid,
      email: decoded.email || data.email || null,
      displayName: decoded.name || data.displayName || null,
      plan: data.plan || 'free',
      subscriptionStatus: data.subscriptionStatus || 'none',
      currentPeriodEnd: data.currentPeriodEnd || null,
      billingReady: Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID),
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({ error: error.message || 'Unable to load account' });
  }
};
