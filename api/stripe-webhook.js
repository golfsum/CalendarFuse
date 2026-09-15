const Stripe = require('stripe');
const { getDb, admin } = require('./_firebase');

module.exports.config = { api: { bodyParser: false } };

async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function updateUserFromSubscription(subscription) {
  const uid = subscription.metadata && subscription.metadata.firebaseUid;
  if (!uid) return;
  const item = subscription.items && subscription.items.data && subscription.items.data[0];
  const periodEnd = item && item.current_period_end ? item.current_period_end : subscription.current_period_end;

  await getDb().collection('users').doc(uid).set({
    stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer && subscription.customer.id,
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: subscription.status,
    plan: ['active', 'trialing'].includes(subscription.status) ? 'pro' : 'free',
    currentPeriodEnd: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method not allowed');
  }
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).send('Stripe webhook is not configured');
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const rawBody = await getRawBody(req);
    const signature = req.headers['stripe-signature'];
    const event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET);

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const uid = session.metadata && session.metadata.firebaseUid;
      if (uid) {
        await getDb().collection('users').doc(uid).set({
          stripeCustomerId: session.customer || null,
          stripeSubscriptionId: session.subscription || null,
          billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }

    if (['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'].includes(event.type)) {
      await updateUserFromSubscription(event.data.object);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('stripe_webhook_error', error);
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }
};
