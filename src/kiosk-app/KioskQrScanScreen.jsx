import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import KioskShell from './KioskShell';
import Button from '../components/Button';
import { patientLoginWithQr } from '../services/authService';
import './KioskQrScreens.css';

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
        navigate('/kiosk/vitals');
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
          window.isSecureContext
            ? 'This device has no camera access.'
            : 'The camera only works over https:// or on localhost.'
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
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was denied.'
            : 'No camera could be started.'
        );
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

  return (
    <KioskShell>
      <div className="mk-kqr mk-kqr--dark">
        <button className="mk-kqr__back" onClick={() => navigate('/kiosk')} aria-label="Go back">
          ←
        </button>

        <div className={`mk-kqr__camera${cameraState === 'live' ? ' is-scanning' : ''}`}>
          <video ref={videoRef} className="mk-kqr__video" muted playsInline />
          <canvas ref={canvasRef} hidden />
          {cameraState === 'live' && <span className="mk-kqr__camera-pulse" />}
          {cameraState === 'starting' && <p className="mk-kqr__camera-msg">Starting camera…</p>}
          {cameraState === 'unavailable' && <p className="mk-kqr__camera-msg">{cameraError}</p>}
          {status === 'verifying' && <p className="mk-kqr__camera-msg is-overlay">Signing you in…</p>}
        </div>

        {error && (
          <p className="mk-kqr__error" role="alert">
            {error}
          </p>
        )}

        <p className="mk-kqr__subtitle">
          {cameraState === 'unavailable'
            ? 'Use the QR scanner, or ask the clinic staff for help.'
            : 'Hold your patient QR code up to the camera'}
        </p>

        {/* Works for typing a code and for USB QR scanners, which type the code then press Enter. */}
        <form className="mk-kqr__manual" onSubmit={handleManualSubmit}>
          <input
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            placeholder="Scan or enter code"
            autoFocus={cameraState === 'unavailable'}
            aria-label="QR code"
            autoComplete="off"
          />
          <Button type="submit" variant="secondary" disabled={status === 'verifying' || !manualCode.trim()}>
            Sign in
          </Button>
        </form>
      </div>
    </KioskShell>
  );
}
