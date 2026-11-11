import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import Icon from './ui/Icon';
import { KioskCard, TopBar } from './ui/KioskUI';
import { clearPatientSession, patientLoginWithQr } from '../services/authService';
import { useKioskAgent } from '../services/kioskAgentService';

// The QR cam is opened by the kiosk agent on the Pi (by its USB port, hub
// port 1.2), NOT by the browser: the BP cam is the same webcam model, so the
// browser can't tell the two apart and kept picking the BP cam. The agent
// decodes the code and sends us a small preview to aim with.
// See MediKiosk_hardware/agent/qr_reader.py.

const AGENT_GRACE_MS = 4000; // wait this long for the agent before saying the camera is offline

export default function KioskQrScanScreen() {
  const navigate = useNavigate();
  const { agent, agentOnline } = useKioskAgent();
  const busyRef = useRef(false);
  const previewUrlRef = useRef('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [scanKey, setScanKey] = useState(0); // bump to start a fresh QR scan on the agent
  const [agentMissing, setAgentMissing] = useState(false);
  const [cameraState, setCameraState] = useState('starting'); // starting | live | unavailable
  const [cameraError, setCameraError] = useState('');
  const [status, setStatus] = useState('idle'); // idle | verifying
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');

  const signIn = useCallback(
    async (value) => {
      if (busyRef.current) return;
      busyRef.current = true;
      setStatus('verifying');
      setError('');
      try {
        await patientLoginWithQr(value);
        navigate('/kiosk/signed-in');
      } catch (err) {
        setError(err.message || 'QR code not recognized.');
        setStatus('idle');
        // Short pause so the same invalid code isn't re-submitted straight away,
        // then look for a code again.
        setTimeout(() => {
          busyRef.current = false;
          setScanKey((k) => k + 1);
        }, 2000);
      }
    },
    [navigate]
  );

  // Agent offline for a few seconds -> say so (the typed code still works).
  useEffect(() => {
    if (agentOnline) {
      setAgentMissing(false);
      return undefined;
    }
    const t = setTimeout(() => setAgentMissing(true), AGENT_GRACE_MS);
    return () => clearTimeout(t);
  }, [agentOnline]);

  // One QR scan on the agent; restarted (scanKey) after a timeout or a rejected code.
  useEffect(() => {
    if (!agent || !agentOnline) return undefined;
    // keep showing "unavailable" while retrying - it turns "live" on the first preview frame
    setCameraState((c) => (c === 'live' || c === 'unavailable' ? c : 'starting'));
    let retry;
    const stop = agent.startQr({
      onPreview: (jpeg) => {
        const url = URL.createObjectURL(new Blob([jpeg], { type: 'image/jpeg' }));
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = url;
        setPreviewUrl(url);
        setCameraState('live');
      },
      onEvent: (ev) => {
        if (ev.phase === 'found' && ev.text) {
          signIn(ev.text);
        } else if (ev.phase === 'timeout') {
          setScanKey((k) => k + 1); // still on this screen - keep looking
        } else if (ev.phase === 'error') {
          console.warn('[qr] agent:', ev.error);
          setCameraState('unavailable');
          setCameraError('The QR camera isn’t working right now.');
          retry = setTimeout(() => setScanKey((k) => k + 1), 5000); // e.g. re-plugged - try again
        }
      },
    });
    return () => {
      clearTimeout(retry);
      stop();
    };
  }, [agent, agentOnline, scanKey, signIn]);

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    },
    []
  );

  const cameraShown = agentMissing ? 'unavailable' : cameraState;
  const cameraText = agentMissing ? 'The QR camera is offline.' : cameraError;

  function handleManualSubmit(e) {
    e.preventDefault();
    if (manualCode.trim()) signIn(manualCode);
    setManualCode('');
  }

  function continueAsGuest() {
    clearPatientSession();
    navigate('/kiosk/guest');
  }

  const statusText =
    status === 'verifying'
      ? 'Signing you in…'
      : cameraShown === 'starting'
        ? 'Starting camera…'
        : cameraShown === 'unavailable'
          ? cameraText
          : 'Looking for a code…';

  return (
    <KioskShell>
      <KioskCard>
        <TopBar onBack={() => navigate('/kiosk/welcome')} />

        <div className="k-hero">
          <h1 className="k-h1">Scan your QR code</h1>
          <p className="k-lead">
            {cameraShown === 'unavailable'
              ? 'Type the code below, or ask the clinic staff for help.'
              : 'Open the MediKiosk app and hold your QR code up to the camera.'}
          </p>
        </div>

        <div className={`k-camera is-${cameraShown}${status === 'verifying' ? ' is-verifying' : ''}`}>
          {previewUrl && cameraShown === 'live' && <img src={previewUrl} className="k-camera__video" alt="" />}
          <span className="k-camera__corner k-camera__corner--tl" />
          <span className="k-camera__corner k-camera__corner--tr" />
          <span className="k-camera__corner k-camera__corner--bl" />
          <span className="k-camera__corner k-camera__corner--br" />
          {cameraShown === 'live' && status !== 'verifying' && <span className="k-camera__scanline" />}
          <span className="k-camera__status" role="status">
            <span className="k-camera__status-dot" />
            {statusText}
          </span>
        </div>

        {error && (
          <p className="k-inline-error" role="alert">
            <Icon name="alert" size={30} />
            {error}
          </p>
        )}

        <div className="k-divider">
          <span>OR TYPE YOUR CODE</span>
        </div>

        {/* Works for typing a code and for USB QR scanners, which type the code then press Enter. */}
        <form className="k-codeform" onSubmit={handleManualSubmit}>
          <label htmlFor="k-qr-code" className="k-visually-hidden">
            QR code
          </label>
          <input
            id="k-qr-code"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Enter code"
            autoFocus={cameraShown === 'unavailable'}
            autoComplete="off"
          />
          <button type="submit" disabled={status === 'verifying' || !manualCode.trim()}>
            Sign in
          </button>
        </form>

        <footer className="k-footer k-footer--center">
          <button type="button" className="k-link" onClick={continueAsGuest}>
            No app? Continue as Guest
          </button>
        </footer>
      </KioskCard>
    </KioskShell>
  );
}
