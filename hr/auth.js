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
function dg(m) { try { if (window.S27diag) window.S27diag(m); } catch (e) { /* */ } }
function friendly(e) {
  const c = (e && e.code) || '';
  const map = {
    'auth/popup-closed-by-user': 'Het Google-venster werd gesloten.',
    'auth/popup-blocked': 'Pop-up geblokkeerd — sta pop-ups toe voor dit domein.',
    'auth/unauthorized-domain': 'Dit domein staat niet in Firebase → Authentication → Authorized domains.',
    'auth/operation-not-allowed': 'Google-login staat nog uit in Firebase (Sign-in method).',
    'auth/invalid-verification-code': 'Die code klopt niet — probeer opnieuw met een verse code.',
    'auth/missing-code': 'Geen code ingevoerd.',
  };
  return map[c] || ('Er ging iets mis' + (c ? ' (' + c + ')' : '') + '.');
}

// Tweede-factor-prompt (authenticator-code of SMS) — zelfstandige overlay, geen CSS-afhankelijkheid.
function promptMfaCode(msg) {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.setAttribute('style', 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(20,16,30,.55);backdrop-filter:blur(4px)');
    ov.innerHTML = '<div style="background:#FFFFFF;border-radius:20px;padding:28px 26px;width:340px;max-width:92vw;box-shadow:0 24px 70px rgba(35,15,35,.18);border:1px solid #E7DFD3;font-family:Nunito,system-ui,sans-serif;text-align:center">' +
      '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#230F23;margin-bottom:6px">Even verifiëren</div>' +
      '<div style="font-size:13.5px;color:#6B5B6B;margin-bottom:16px">' + msg + '</div>' +
      '<input id="s27mfa" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="width:100%;box-sizing:border-box;text-align:center;letter-spacing:.4em;font-size:22px;font-weight:700;padding:12px;border:1.5px solid #E7DFD3;border-radius:12px;outline:none;color:#230F23;background:#FFFFFF">' +
      '<div style="display:flex;gap:10px;margin-top:16px">' +
        '<button id="s27mfacancel" style="flex:1;padding:11px;border-radius:12px;border:1px solid #E7DFD3;background:#F1EBE2;font-weight:700;font-family:Montserrat,sans-serif;color:#3A2A3A;cursor:pointer">Annuleer</button>' +
        '<button id="s27mfaok" style="flex:1;padding:11px;border-radius:12px;border:none;background:linear-gradient(120deg,#3083dc,#5e50c8);color:#fff;font-weight:800;font-family:Montserrat,sans-serif;cursor:pointer">Bevestig</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    const inp = ov.querySelector('#s27mfa'); setTimeout(() => { try { inp.focus(); } catch (e) {} }, 50);
    const done = (v) => { try { document.body.removeChild(ov); } catch (e) {} resolve(v); };
    ov.querySelector('#s27mfaok').onclick = () => done((inp.value || '').replace(/\D/g, '').slice(0, 6));
    ov.querySelector('#s27mfacancel').onclick = () => done('');
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ov.querySelector('#s27mfaok').click(); });
  });
}

// Instel-overlay: toont de TOTP-sleutel + een veld voor de bevestigingscode.
function promptTotpEnroll(secretKey, otpauthUrl) {
  return new Promise((resolve) => {
    const pretty = String(secretKey || '').replace(/(.{4})/g, '$1 ').trim();
    const ov = document.createElement('div');
    ov.setAttribute('style', 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(20,16,30,.55);backdrop-filter:blur(4px);padding:16px');
    ov.innerHTML = '<div style="background:#FFFFFF;border-radius:20px;padding:26px 24px;width:390px;max-width:94vw;box-shadow:0 24px 70px rgba(35,15,35,.18);border:1px solid #E7DFD3;font-family:Nunito,system-ui,sans-serif;text-align:left;max-height:92vh;overflow:auto">'
      + '<div style="font-family:Montserrat,sans-serif;font-weight:800;font-size:18px;color:#230F23;margin-bottom:4px">2-staps verificatie instellen</div>'
      + '<div style="font-size:13px;color:#6B5B6B;margin-bottom:14px">Open je authenticator-app (Google Authenticator, Microsoft Authenticator, …) → tik op <b>“+”</b> → <b>“Setupsleutel invoeren”</b>, en gebruik:</div>'
      + '<div style="font-size:11px;color:#9E919E;margin-bottom:3px">Accountnaam</div><div style="font-weight:700;color:#230F23;margin-bottom:12px">Studio 27 Teamportaal</div>'
      + '<div style="font-size:11px;color:#9E919E;margin-bottom:3px">Sleutel</div>'
      + '<div style="font-family:ui-monospace,Menlo,monospace;font-size:15px;font-weight:700;letter-spacing:.06em;color:#230F23;background:#FAF7F2;border:1px solid #E7DFD3;border-radius:10px;padding:11px 12px;word-break:break-all">' + pretty + '</div>'
      + '<button id="s27kc" type="button" style="margin:8px 0 16px;font-size:12px;font-weight:700;padding:9px;border:1px solid #E7DFD3;border-radius:9px;background:#F1EBE2;color:#3A2A3A;cursor:pointer;width:100%">📋 Sleutel kopiëren</button>'
      + '<div style="font-size:13px;color:#6B5B6B;margin-bottom:8px">Typ daarna de <b>6-cijferige code</b> die de app toont:</div>'
      + '<input id="s27ec" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" style="width:100%;box-sizing:border-box;text-align:center;letter-spacing:.4em;font-size:22px;font-weight:700;padding:12px;border:1.5px solid #E7DFD3;border-radius:12px;outline:none;color:#230F23;background:#FFFFFF">'
      + '<div style="display:flex;gap:10px;margin-top:16px">'
      + '<button id="s27ex" type="button" style="flex:1;padding:11px;border-radius:12px;border:1px solid #E7DFD3;background:#F1EBE2;font-weight:700;font-family:Montserrat,sans-serif;color:#3A2A3A;cursor:pointer">Annuleer</button>'
      + '<button id="s27eok" type="button" style="flex:1;padding:11px;border-radius:12px;border:none;background:linear-gradient(120deg,#3083dc,#5e50c8);color:#fff;font-weight:800;font-family:Montserrat,sans-serif;cursor:pointer">Activeer</button>'
      + '</div></div>';
    document.body.appendChild(ov);
    const inp = ov.querySelector('#s27ec'); setTimeout(() => { try { inp.focus(); } catch (e) {} }, 50);
    const done = (v) => { try { document.body.removeChild(ov); } catch (e) {} resolve(v); };
    ov.querySelector('#s27kc').onclick = function () { try { navigator.clipboard.writeText(String(secretKey || '')); this.textContent = '✓ Gekopieerd'; } catch (e) {} };
    ov.querySelector('#s27ex').onclick = () => done('');
    ov.querySelector('#s27eok').onclick = () => done((inp.value || '').replace(/\D/g, '').slice(0, 6));
    inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') ov.querySelector('#s27eok').click(); });
  });
}

// Voltooi de tweede-factor-stap als Firebase die vraagt (auth/multi-factor-auth-required).
async function resolveMfa(error) {
  const resolver = fb.getMultiFactorResolver(auth, error);
  const hints = resolver.hints || [];
  const totpId = fb.TotpMultiFactorGenerator && fb.TotpMultiFactorGenerator.FACTOR_ID;
  const phoneId = fb.PhoneMultiFactorGenerator && fb.PhoneMultiFactorGenerator.FACTOR_ID;
  let hint = hints.find((h) => h.factorId === totpId) || hints[0];
  if (!hint) throw error;
  dg('tweede factor: ' + ((hint && hint.factorId) || '?'));
  if (totpId && hint.factorId === totpId) {
    const code = await promptMfaCode('Voer de 6-cijferige code uit je authenticator-app in.');
    if (!code) { dg('geen code ingevoerd'); emit('signed_out'); return; }
    dg('code ingevoerd (' + code.length + ' cijfers) → verifiëren…');
    const assertion = fb.TotpMultiFactorGenerator.assertionForSignIn(hint.uid, code);
    await resolver.resolveSignIn(assertion);
    dg('tweede factor OK ✓');
    return;
  }
  if (phoneId && hint.factorId === phoneId) {
    const holder = document.createElement('div'); holder.style.display = 'none'; document.body.appendChild(holder);
    const verifier = new fb.RecaptchaVerifier(auth, holder, { size: 'invisible' });
    const provider = new fb.PhoneAuthProvider(auth);
    const verificationId = await provider.verifyPhoneNumber({ multiFactorHint: hint, session: resolver.session }, verifier);
    const code = await promptMfaCode('Voer de code in die we per SMS stuurden.');
    if (!code) { emit('signed_out'); return; }
    const cred = fb.PhoneAuthProvider.credential(verificationId, code);
    const assertion = fb.PhoneMultiFactorGenerator.assertion(cred);
    await resolver.resolveSignIn(assertion);
    return;
  }
  throw error;
}

async function load() {
  const [appMod, authMod] = await Promise.all([import(`${G}/firebase-app.js`), import(`${G}/firebase-auth.js`)]);
  fb = authMod;
  const app = appMod.initializeApp(firebaseConfig);
  auth = fb.getAuth(app);
  // sessie laten overleven (indexedDB → local → session), zodat je niet terug naar login valt.
  try { await fb.setPersistence(auth, fb.indexedDBLocalPersistence); }
  catch (e) { try { await fb.setPersistence(auth, fb.browserLocalPersistence); } catch (e2) { /* default */ } }
}

const S27TeamAuth = {
  async init(opts) {
    if (opts && opts.gatewayBase) gatewayBase = String(opts.gatewayBase).replace(/\/+$/, '');
    emit('loading');
    await load();
    // terugkeer van een redirect-login (mobiel/PWA) afhandelen, incl. tweede factor.
    try { await fb.getRedirectResult(auth); }
    catch (e) {
      if (e && e.code === 'auth/multi-factor-auth-required') { try { await resolveMfa(e); } catch (e2) { emit('signed_out', { error: friendly(e2) }); } }
    }
    fb.onAuthStateChanged(auth, (user) => {
      dg('onAuthStateChanged: ' + (user ? (user.email || 'user zonder email') : 'GEEN user'));
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
    dg('login geklikt');
    const provider = new fb.GoogleAuthProvider();
    provider.setCustomParameters({ hd: 'studio27.be', prompt: 'select_account' });
    // Enkel in de GEÏNSTALLEERDE app (standalone) kan een popup geen venster openen → redirect.
    // In een gewone (mobiele) browser-tab is een popup betrouwbaarder dan een cross-domein-redirect
    // op Safari. Wordt de popup geblokkeerd, dan valt de catch hieronder alsnog terug op redirect.
    let standalone = false;
    try { standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) { standalone = false; }
    if (standalone) { try { await fb.signInWithRedirect(auth, provider); } catch (e) { emit('signed_out', { error: friendly(e) }); } return; }
    try {
      await fb.signInWithPopup(auth, provider);
      dg('Google-popup OK');
    } catch (e) {
      dg('popup → ' + ((e && e.code) || e));
      if (e && e.code === 'auth/multi-factor-auth-required') {
        try { await resolveMfa(e); }   // tweede factor afhandelen → onAuthStateChanged doet de rest
        catch (e2) { dg('MFA-fout: ' + ((e2 && e2.code) || e2)); emit('signed_out', { error: friendly(e2) }); }
        return;
      }
      // popup geblokkeerd/niet ondersteund (mobiele browser) → terugvallen op redirect
      const fallbackCodes = ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request', 'auth/web-storage-unsupported'];
      if (e && fallbackCodes.indexOf(e.code) >= 0) {
        dg('popup geblokkeerd → redirect');
        try { await fb.signInWithRedirect(auth, provider); } catch (e3) { emit('signed_out', { error: friendly(e3) }); }
        return;
      }
      emit('signed_out', { error: friendly(e) });
    }
  },
  // Eerste keer: TOTP (2-staps) instellen. Vereist eerst een Google-sessie; daarna
  // genereren we een sleutel, jij voegt ze toe in je authenticator en bevestigt met een code.
  async enrollTotp() {
    dg('2-staps instellen gestart');
    try {
      if (!auth.currentUser) {
        const provider = new fb.GoogleAuthProvider();
        provider.setCustomParameters({ hd: 'studio27.be', prompt: 'select_account' });
        try { await fb.signInWithPopup(auth, provider); dg('Google-popup OK (voor enroll)'); }
        catch (e) {
          if (e && e.code === 'auth/multi-factor-auth-required') { dg('je hebt AL 2-staps ingesteld'); emit('signed_out', { error: 'Je hebt al 2-staps verificatie ingesteld. Log gewoon in met je bestaande code. Lukt dat niet (toestel kwijt)? Laat de tweede factor verwijderen in de Firebase-console.' }); return; }
          if (e && ['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].indexOf(e.code) >= 0) { await fb.signInWithRedirect(auth, provider); return; }
          throw e;
        }
      }
      const user = auth.currentUser;
      if (!user) { emit('signed_out', { error: 'Geen sessie — probeer opnieuw.' }); return; }
      if (!/@studio27\.be$/.test(String(user.email || '').toLowerCase())) { emit('no_access', { email: user.email }); return; }
      const mfaUser = fb.multiFactor(user);
      const session = await mfaUser.getSession();
      const secret = await fb.TotpMultiFactorGenerator.generateSecret(session);
      const otpauthUrl = secret.generateQrCodeUrl(user.email || 'teamlid', 'Studio 27 Teamportaal');
      dg('sleutel gegenereerd');
      const code = await promptTotpEnroll(secret.secretKey, otpauthUrl);
      if (!code) { dg('enroll geannuleerd'); return; }
      const assertion = fb.TotpMultiFactorGenerator.assertionForEnrollment(secret, code);
      await mfaUser.enroll(assertion, 'Authenticator');
      dg('2-staps ingesteld ✓ — je bent nu aangemeld');
      emit('ready', { user, email: String(user.email || '').trim().toLowerCase() });
    } catch (e) {
      dg('enroll-fout: ' + ((e && e.code) || (e && e.message) || e));
      emit('signed_out', { error: friendly(e) });
    }
  },
  async token(force) { return auth && auth.currentUser ? auth.currentUser.getIdToken(!!force) : null; },
  async logout() { if (auth) await fb.signOut(auth); },
};

window.S27TeamAuth = S27TeamAuth;
export { S27TeamAuth };
