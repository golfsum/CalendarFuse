let authState = null;

async function loadFirebase() {
  const configResponse = await fetch('/api/config', { cache: 'no-store' });
  if (!configResponse.ok) throw new Error('Unable to load app configuration');
  const config = await configResponse.json();
  if (!config.authReady) throw new Error('CalendarFuse sign-in is not configured yet');

  const [{ initializeApp }, authMod] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js'),
  ]);
  const app = initializeApp(config.firebase);
  const auth = authMod.getAuth(app);
  authState = { auth, authMod, config };
  return authState;
}

export async function getAuthState() {
  return authState || loadFirebase();
}

export async function waitForUser() {
  const { auth, authMod } = await getAuthState();
  return new Promise((resolve) => {
    const stop = authMod.onAuthStateChanged(auth, (user) => {
      stop();
      resolve(user || null);
    });
  });
}

export async function requireUser(redirect = '/login') {
  const user = await waitForUser();
  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    location.replace(`${redirect}?next=${next}`);
    return null;
  }
  return user;
}

export async function signInEmail(email, password) {
  const { auth, authMod } = await getAuthState();
  return authMod.signInWithEmailAndPassword(auth, email, password);
}

export async function signUpEmail(email, password) {
  const { auth, authMod } = await getAuthState();
  return authMod.createUserWithEmailAndPassword(auth, email, password);
}

export async function signInGoogle() {
  const { auth, authMod } = await getAuthState();
  const provider = new authMod.GoogleAuthProvider();
  return authMod.signInWithPopup(auth, provider);
}

export async function signOutUser() {
  const { auth, authMod } = await getAuthState();
  return authMod.signOut(auth);
}

export async function apiFetch(path, options = {}) {
  const user = await requireUser();
  if (!user) throw new Error('Not signed in');
  const token = await user.getIdToken();
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  return fetch(path, { ...options, headers });
}
