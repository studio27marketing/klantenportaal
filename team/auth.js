/* =============================================================================
 * Studio 27 TEAMPORTAAL - Firebase Auth (staff-only)
 * -----------------------------------------------------------------------------
 * Zelfde Firebase-project (studio27-cloud) als het klantportaal. Medewerkers
 * loggen in met hun @studio27.be Google-account (Workspace-SSO = eigen 2FA-beleid,
 * geen app-TOTP). De gateway aanvaardt hun token via de staff-uitzondering.
 * Publieke API window.S27TeamAuth: init({gatewayBase}), subscribe(cb), google(),
 * token(force), logout(). Subscriber-phase: loading | signed_out | ready | no_access.
 * ============================================================================= */

const FB_VERSION = '10.12.2';
const G = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;

const firebaseConfig = {
  apiKey: 'AIzaSyCrWaWq2nSUwa95HcbZ2UuXsJikAwWmNPk',
  authDomain: 'studio27-cloud.firebaseapp.com',
  projectId: 'studio27-cloud',
  storageBucket: 'studio27-cloud.firebasestorage.app',
  messagingSenderId: '1098598752169',
  appId: '1:1098598752169:web:e154b302007e8b95e96eb8',
};

let auth = null;
let fb = {};
let gatewayBase = '';
let subscriber = () => {};

function emit(phase, extra) {
  try { subscriber(Object.assign({ phase }, extra || {})); }
  catch (e) { console.error('[S27TeamAuth] subscriber error', e); }
}
function friendly(e) {
  const c = (e && e.code) || '';
  const map = {
    'auth/popup-closed-by-user': 'Het Google-venster werd gesloten.',
    'auth/popup-blocked': 'Pop-up geblokkeerd — sta pop-ups toe voor dit domein.',
    'auth/unauthorized-domain': 'Dit domein staat niet in Firebase → Authentication → Authorized domains.',
    'auth/operation-not-allowed': 'Google-login staat nog uit in Firebase (Sign-in method).',
  };
  return map[c] || ('Er ging iets mis' + (c ? ' (' + c + ')' : '') + '.');
}

async function load() {
  const [appMod, authMod] = await Promise.all([import(`${G}/firebase-app.js`), import(`${G}/firebase-auth.js`)]);
  fb = authMod;
  const app = appMod.initializeApp(firebaseConfig);
  auth = fb.getAuth(app);
}

const S27TeamAuth = {
  async init(opts) {
    if (opts && opts.gatewayBase) gatewayBase = String(opts.gatewayBase).replace(/\/+$/, '');
    emit('loading');
    await load();
    fb.onAuthStateChanged(auth, (user) => {
      if (!user) { emit('signed_out'); return; }
      const email = String((user && user.email) || '').trim().toLowerCase();
      const isStaff = /@studio27\.be$/.test(email);
      if (isStaff) { emit('ready', { user, email }); return; }
      // Niet-@studio27.be account ingelogd: geen teamtoegang.
      emit('no_access', { email });
    });
  },
  subscribe(cb) { subscriber = cb || (() => {}); },
  async google() {
    try {
      const provider = new fb.GoogleAuthProvider();
      provider.setCustomParameters({ hd: 'studio27.be', prompt: 'select_account' });
      await fb.signInWithPopup(auth, provider);
    } catch (e) { emit('signed_out', { error: friendly(e) }); }
  },
  async token(force) { return auth && auth.currentUser ? auth.currentUser.getIdToken(!!force) : null; },
  async logout() { if (auth) await fb.signOut(auth); },
};

window.S27TeamAuth = S27TeamAuth;
export { S27TeamAuth };
