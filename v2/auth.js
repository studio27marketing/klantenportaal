/* =============================================================================
 * Studio 27 Klantenportaal — Firebase Auth module (v2)
 * -----------------------------------------------------------------------------
 * Magic link (wachtwoordloos) + Google sign-in + VERPLICHTE TOTP-2FA.
 * Zie ../klantendashboard/AUTH_UPGRADE_PLAN.md.
 *
 * Wordt EERST los gevalideerd via auth-v2-test.html en raakt dashboard.js niet.
 * Pas na validatie integreren we dit in de widget (taak #7).
 *
 * ⚠️ Nog niet end-to-end getest (Firebase kan niet vanaf hier draaien) — we
 *    valideren samen; ik fix wat tijdens de eerste run opduikt.
 *
 * Publieke API (window.S27Auth, ook als ES-module-export):
 *   init({gatewayBase})  subscribe(cb)  setGateway(url)
 *   google()  emailLink(email)  completeEmailLink()
 *   mfaVerify(code)            ← challenge bij inloggen
 *   enrollBegin()/enrollVerify(code)  ← verplichte TOTP-setup, 1e login
 *   token()  call(endpoint, body)  logout()
 *
 * Subscriber-callback krijgt { phase, user?, email?, error? } met phase ∈
 *   loading | signed_out | email_sent | mfa_challenge | needs_enrollment | ready
 * ============================================================================= */

const FB_VERSION = '10.12.2'; // bump naar nieuwste 10.x/11.x als een import 404't
const G = `https://www.gstatic.com/firebasejs/${FB_VERSION}`;

const firebaseConfig = {
  apiKey: 'AIzaSyCrWaWq2nSUwa95HcbZ2UuXsJikAwWmNPk',
  authDomain: 'studio27-cloud.firebaseapp.com',
  projectId: 'studio27-cloud',
  storageBucket: 'studio27-cloud.firebasestorage.app',
  messagingSenderId: '1098598752169',
  appId: '1:1098598752169:web:e154b302007e8b95e96eb8',
};

const EMAIL_KEY = 's27_email_for_signin';

let auth = null;
let fb = {};                  // lazy-geladen firebase-auth exports
let gatewayBase = '';
let subscriber = () => {};
let pendingResolver = null;   // MFA-challenge resolver (inloggen)
let pendingTotpSecret = null; // TOTP-secret (enrollment)

function emit(phase, extra) {
  try { subscriber(Object.assign({ phase }, extra || {})); }
  catch (e) { console.error('[S27Auth] subscriber error', e); }
}

async function load() {
  const appMod = await import(`${G}/firebase-app.js`);
  fb = await import(`${G}/firebase-auth.js`);
  const app = appMod.initializeApp(firebaseConfig);
  auth = fb.getAuth(app);
}

function friendly(e) {
  const c = (e && e.code) || '';
  const map = {
    'auth/invalid-email': 'Ongeldig e-mailadres.',
    'auth/popup-closed-by-user': 'Het Google-venster werd gesloten.',
    'auth/popup-blocked': 'Pop-up geblokkeerd — sta pop-ups toe of gebruik de e-maillink.',
    'auth/invalid-verification-code': 'De code klopt niet. Probeer opnieuw.',
    'auth/unauthorized-domain': 'Dit domein staat niet in Firebase → Authentication → Settings → Authorized domains.',
    'auth/operation-not-allowed': 'Deze inlogmethode staat nog uit in Firebase (Sign-in method).',
    'auth/invalid-action-code': 'Deze inloglink is verlopen of al gebruikt. Vraag een nieuwe aan.',
    'auth/too-many-enrollment-attempts': 'Te veel pogingen. Wacht ~15 min, log opnieuw in en gebruik de 6-cijfercode uit je app (niet de sleutel).',
    'auth/missing-code': 'Vul de 6-cijfercode uit je authenticator-app in.',
    'auth/requires-recent-login': 'Je sessie is te oud voor deze actie — je bent uitgelogd. Log opnieuw in en stel meteen 2FA in.',
  };
  return map[c] || ('Er ging iets mis' + (c ? ' (' + c + ')' : '') + '.');
}

async function handleSignInError(e) {
  if (e && e.code === 'auth/multi-factor-auth-required') {
    pendingResolver = fb.getMultiFactorResolver(auth, e);
    emit('mfa_challenge');
    return;
  }
  emit('signed_out', { error: friendly(e) });
}

// Een verse login is vereist voor MFA-acties; anders schoon uitloggen zodat de
// gebruiker opnieuw kan inloggen en meteen kan enrollen.
async function reauthIfNeeded(e) {
  if (e && e.code === 'auth/requires-recent-login') {
    try { await fb.signOut(auth); } catch (_) {}
  }
}

const S27Auth = {
  async init(opts) {
    if (opts && opts.gatewayBase) gatewayBase = String(opts.gatewayBase).replace(/\/+$/, '');
    emit('loading');
    await load();

    fb.onAuthStateChanged(auth, (user) => {
      if (!user) { emit('signed_out'); return; }
      const enrolled = (fb.multiFactor(user).enrolledFactors) || [];
      if (enrolled.length === 0) emit('needs_enrollment', { user }); // verplichte 2FA-setup
      else emit('ready', { user });
    });

    // Terugkomst via e-maillink?
    if (fb.isSignInWithEmailLink(auth, window.location.href)) {
      await this.completeEmailLink();
    }
  },

  subscribe(cb) { subscriber = cb || (() => {}); },
  setGateway(url) { gatewayBase = String(url || '').replace(/\/+$/, ''); },

  async google() {
    try { await fb.signInWithPopup(auth, new fb.GoogleAuthProvider()); }
    catch (e) { await handleSignInError(e); }
  },

  async emailLink(email) {
    const url = window.location.origin + window.location.pathname; // moet een authorized domain zijn
    await fb.sendSignInLinkToEmail(auth, email, { url, handleCodeInApp: true });
    window.localStorage.setItem(EMAIL_KEY, email);
    emit('email_sent', { email });
  },

  async completeEmailLink() {
    let email = window.localStorage.getItem(EMAIL_KEY);
    if (!email) email = window.prompt('Bevestig je e-mailadres om in te loggen');
    if (!email) return;
    try {
      await fb.signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem(EMAIL_KEY);
      history.replaceState(null, '', window.location.origin + window.location.pathname); // link-params opruimen
    } catch (e) { await handleSignInError(e); }
  },

  // 2FA-challenge bij inloggen (account heeft al een authenticator)
  async mfaVerify(code) {
    if (!pendingResolver) throw new Error('Geen 2FA-challenge actief.');
    try {
      const hint = pendingResolver.hints.find((h) => h.factorId === fb.TotpMultiFactorGenerator.FACTOR_ID)
        || pendingResolver.hints[0];
      const assertion = fb.TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code);
      await pendingResolver.resolveSignIn(assertion);
      pendingResolver = null;
    } catch (e) { throw new Error(friendly(e)); }
  },

  // Verplichte TOTP-setup bij eerste login
  async enrollBegin() {
    try {
      const mfaUser = fb.multiFactor(auth.currentUser);
      const session = await mfaUser.getSession();
      pendingTotpSecret = await fb.TotpMultiFactorGenerator.generateSecret(session);
      const label = auth.currentUser.email || 'klant';
      return {
        qrUrl: pendingTotpSecret.generateQrCodeUrl(label, 'Studio 27 Klantenportaal'),
        secret: pendingTotpSecret.secretKey,
      };
    } catch (e) { await reauthIfNeeded(e); throw new Error(friendly(e)); }
  },
  async enrollVerify(code) {
    if (!pendingTotpSecret) throw new Error('Geen 2FA-setup actief.');
    try {
      const assertion = fb.TotpMultiFactorGenerator.assertionForEnrollment(pendingTotpSecret, code);
      await fb.multiFactor(auth.currentUser).enroll(assertion, 'Authenticator app');
      pendingTotpSecret = null;
      emit('ready', { user: auth.currentUser }); // onAuthStateChanged vuurt hier niet opnieuw
    } catch (e) { await reauthIfNeeded(e); throw new Error(friendly(e)); }
  },

  async token(force) { return auth && auth.currentUser ? auth.currentUser.getIdToken(!!force) : null; },

  // Helper voor de end-to-end test: roept de gateway aan met het ID-token
  async call(endpoint, body) {
    const t = await this.token();
    if (!t) throw new Error('Niet ingelogd.');
    if (!gatewayBase) throw new Error('Geen gateway-URL ingesteld.');
    const res = await fetch(`${gatewayBase}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
      body: JSON.stringify(body || {}),
    });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch (e) { data = { _raw: text }; }
    return { ok: res.ok, status: res.status, data };
  },

  async logout() { if (auth) await fb.signOut(auth); },
};

window.S27Auth = S27Auth;
export { S27Auth };
