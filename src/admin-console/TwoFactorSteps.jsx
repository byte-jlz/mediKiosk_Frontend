import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import Button from '../components/Button';
import { mfaFinish, mfaStart, staffEmailCode, staffLoginCode } from '../services/authService';

// The extra sign-in steps shown inside the staff sign-in card (see AdminLoginScreen):
//   CodeStep      every later sign-in: the 6-digit code from the authenticator app, or a recovery code
//   SetupStep     first sign-in: link the authenticator app (QR code) and prove it works
//   RecoveryStep  shown once after setup: the one-time recovery codes

export function CodeStep({ mfaToken, onSignedIn, onBack }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setNote('');
    if (!code.trim()) return setError('Enter the code from your authenticator app.');
    setLoading(true);
    try {
      onSignedIn(await staffLoginCode(mfaToken, code));
    } catch (err) {
      setError(err.message || 'That code did not work. Try again.');
      if (err.status === 401 && /expired/i.test(err.message)) onBack(); // the 5-minute step timed out: start again
    } finally {
      setLoading(false);
    }
  }

  async function handleEmail() {
    setError('');
    setNote('');
    try {
      await staffEmailCode(mfaToken);
      setNote('We emailed you a 6-digit code. Type it above. It works once and expires in 10 minutes.');
    } catch (err) {
      setError(err.status === 404 ? 'Emailed codes are not available. Use your authenticator app or a recovery code.' : err.message);
    }
  }

  return (
    <form className="mk-login__form" onSubmit={handleSubmit}>
      <div className="mk-login__brand">
        <h1 className="mk-login__step-title">Two-step verification</h1>
        <p className="mk-login__tagline">Open your authenticator app and enter the 6-digit code for MediKiosk.</p>
      </div>

      <label className="mk-login__field">
        <span>Code</span>
        <input
          className="mk-login__code"
          value={code}
          autoFocus
          autoComplete="one-time-code"
          inputMode="text"
          maxLength={13}
          placeholder="123456"
          onChange={(e) => setCode(e.target.value)}
        />
      </label>
      <p className="mk-login__hint">Lost your phone? Type one of your recovery codes here instead (like <code>a1b2c3-d4e5f6</code>).</p>

      {error && <p className="mk-login__error" role="alert">{error}</p>}
      {note && <p className="mk-login__note" role="status">{note}</p>}

      <Button type="submit" disabled={loading}>{loading ? 'VERIFYING…' : 'VERIFY'}</Button>
      <div className="mk-login__links">
        <button type="button" className="mk-login__link" onClick={handleEmail}>Email me a code instead</button>
        <button type="button" className="mk-login__link" onClick={onBack}>Back to sign in</button>
      </div>
    </form>
  );
}

export function SetupStep({ setupToken, onEnabled, onBack }) {
  const [setup, setSetup] = useState(null); // { secret, otpauthUri }
  const [qr, setQr] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    mfaStart(setupToken)
      .then(async (s) => {
        const url = await QRCode.toDataURL(s.otpauthUri, { width: 360, margin: 2, errorCorrectionLevel: 'M' });
        if (!cancelled) { setSetup(s); setQr(url); }
      })
      .catch((err) => !cancelled && setError(err.message || 'Could not start the setup. Go back and sign in again.'));
    return () => { cancelled = true; };
  }, [setupToken]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!code.trim()) return setError('Enter the 6-digit code your app shows.');
    setLoading(true);
    try {
      onEnabled(await mfaFinish(setupToken, code));
    } catch (err) {
      setError(err.message || 'That code did not work. Try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="mk-login__form" onSubmit={handleSubmit}>
      <div className="mk-login__brand">
        <h1 className="mk-login__step-title">Set up two-step verification</h1>
        <p className="mk-login__tagline">Staff accounts need an authenticator app (Google Authenticator, Microsoft Authenticator, Authy…).</p>
      </div>

      <ol className="mk-login__steps">
        <li>Scan this QR code with the app.</li>
        <li>Type the 6-digit code it shows.</li>
      </ol>

      <div className="mk-login__qr">
        {qr ? <img src={qr} alt="QR code to add MediKiosk to your authenticator app" /> : <span>{error ? '' : 'Preparing…'}</span>}
      </div>
      {setup && (
        <p className="mk-login__hint">
          Can&apos;t scan? Enter this key in the app: <code className="mk-login__secret">{setup.secret}</code>
        </p>
      )}

      <label className="mk-login__field">
        <span>Code from the app</span>
        <input className="mk-login__code" value={code} autoComplete="one-time-code" inputMode="numeric" maxLength={7} placeholder="123456" onChange={(e) => setCode(e.target.value)} />
      </label>

      {error && <p className="mk-login__error" role="alert">{error}</p>}

      <Button type="submit" disabled={loading || !setup}>{loading ? 'CHECKING…' : 'TURN ON & SIGN IN'}</Button>
      <div className="mk-login__links">
        <button type="button" className="mk-login__link" onClick={onBack}>Back to sign in</button>
      </div>
    </form>
  );
}

export function RecoveryStep({ codes, onDone }) {
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const text = codes.join('\n');

  function copy() {
    navigator.clipboard?.writeText(text).then(() => setCopied(true)).catch(() => {});
  }

  function download() {
    const url = URL.createObjectURL(new Blob([`MediKiosk recovery codes\nEach code works once.\n\n${text}\n`], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medikiosk-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mk-login__form">
      <div className="mk-login__brand">
        <h1 className="mk-login__step-title">Save your recovery codes</h1>
        <p className="mk-login__tagline">If you lose your phone, each of these codes lets you sign in once. They are shown only now.</p>
      </div>

      <ul className="mk-login__codes">
        {codes.map((c) => <li key={c}><code>{c}</code></li>)}
      </ul>
      <div className="mk-login__links">
        <button type="button" className="mk-login__link" onClick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
        <button type="button" className="mk-login__link" onClick={download}>Download .txt</button>
      </div>

      <label className="mk-login__check">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
        <span>I have saved these codes somewhere safe.</span>
      </label>
      <Button disabled={!saved} onClick={onDone}>CONTINUE</Button>
    </div>
  );
}
