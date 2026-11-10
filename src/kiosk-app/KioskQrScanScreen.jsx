import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import KioskShell from './KioskShell';
import Icon from './ui/Icon';
import { KioskCard, TopBar } from './ui/KioskUI';
import { clearPatientSession, patientLoginWithQr } from '../services/authService';
import { DEV_AUTH_BYPASS, devLoginPatient } from '../services/devAuth';

// Scan every few frames; decoding a full frame on each animation tick is wasteful on a Pi.
const SCAN_EVERY_N_FRAMES = 4;

export default function KioskQrScanScreen() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const busyRef = useRef(false);
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
        // Short pause so the same invalid code isn't re-submitted on every frame.
        setTimeout(() => {
          busyRef.current = false;
        }, 2000);
      }
    },
    [navigate]
  );

  useEffect(() => {
    let stream;
    let frameId;
    let frame = 0;
    let stopped = false;

    function tick() {
      if (stopped) return;
      frameId = requestAnimationFrame(tick);
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (busyRef.current || !video || !canvas || video.readyState < 2) return;
      if (++frame % SCAN_EVERY_N_FRAMES !== 0) return;

      const width = video.videoWidth;
      const height = video.videoHeight;
      if (!width || !height) return;
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, width, height);
      const code = jsQR(ctx.getImageData(0, 0, width, height).data, width, height, {
        inversionAttempts: 'dontInvert',
      });
      if (code?.data) signIn(code.data);
    }

    async function startCamera() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraState('unavailable');
        setCameraError(
          window.isSecureContext ? 'This kiosk has no camera access.' : 'The camera only works over https:// or on localhost.'
        );
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setCameraState('live');
        tick();
      } catch (err) {
        setCameraState('unavailable');
        setCameraError(err?.name === 'NotAllowedError' ? 'Camera permission was denied.' : 'No camera could be started.');
      }
    }

    startCamera();

    return () => {
      stopped = true;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [signIn]);

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
      : cameraState === 'starting'
        ? 'Starting camera…'
        : cameraState === 'unavailable'
          ? cameraError
          : 'Looking for a code…';

  return (
    <KioskShell>
      <KioskCard>
        <TopBar onBack={() => navigate('/kiosk/welcome')} />

        <div className="k-hero">
          <h1 className="k-h1">Scan your QR code</h1>
          <p className="k-lead">
            {cameraState === 'unavailable'
              ? 'Type the code below, or ask the clinic staff for help.'
              : 'Open the MediKiosk app and hold your QR code up to the camera.'}
          </p>
        </div>

        <div className={`k-camera is-${cameraState}${status === 'verifying' ? ' is-verifying' : ''}`}>
          <video ref={videoRef} className="k-camera__video" muted playsInline />
          <canvas ref={canvasRef} hidden />
          <span className="k-camera__corner k-camera__corner--tl" />
          <span className="k-camera__corner k-camera__corner--tr" />
          <span className="k-camera__corner k-camera__corner--bl" />
          <span className="k-camera__corner k-camera__corner--br" />
          {cameraState === 'live' && status !== 'verifying' && <span className="k-camera__scanline" />}
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
            autoFocus={cameraState === 'unavailable'}
            autoComplete="off"
          />
          <button type="submit" disabled={status === 'verifying' || !manualCode.trim()}>
            Sign in
          </button>
        </form>

        {DEV_AUTH_BYPASS && (
          <button
            type="button"
            className="k-devskip"
            onClick={() => {
              devLoginPatient();
              navigate('/kiosk/signed-in');
            }}
          >
            <span>DEV</span> Skip login as test patient
          </button>
        )}

        <footer className="k-footer k-footer--center">
          <button type="button" className="k-link" onClick={continueAsGuest}>
            No app? Continue as Guest
          </button>
        </footer>
      </KioskCard>
    </KioskShell>
  );
}
