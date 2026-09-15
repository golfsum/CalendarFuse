const admin = require('firebase-admin');

function getAdminApp() {
  if (admin.apps.length) return admin.app();

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
  }

  const serviceAccount = JSON.parse(raw);
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function getDb() {
  getAdminApp();
  return admin.firestore();
}

async function verifyRequest(req) {
  const authHeader = req.headers.authorization || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error('Missing bearer token');
    error.statusCode = 401;
    throw error;
  }

  getAdminApp();
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (cause) {
    const error = new Error('Invalid or expired authentication token');
    error.statusCode = 401;
    error.cause = cause;
    throw error;
  }
}

async function ensureUserProfile(decoded) {
  const db = getDb();
  const ref = db.collection('users').doc(decoded.uid);
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : {};

  const profile = {
    email: decoded.email || existing.email || null,
    displayName: decoded.name || existing.displayName || null,
    lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!snap.exists) {
    profile.createdAt = admin.firestore.FieldValue.serverTimestamp();
    profile.plan = 'free';
    profile.subscriptionStatus = 'none';
  }

  await ref.set(profile, { merge: true });
  return { ref, data: { ...existing, ...profile } };
}

module.exports = { admin, getAdminApp, getDb, verifyRequest, ensureUserProfile };
