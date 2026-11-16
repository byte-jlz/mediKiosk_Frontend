import { useEffect, useRef, useState } from 'react';
import Icon from './ui/Icon';
import { KioskButton } from './ui/KioskUI';
import { useKioskAgent } from '../services/kioskAgentService';

// ============================================================
// Staff-only shutdown panel. Opened by pressing and holding the clock on the
// start screen for 5 s (StartScreen.jsx). Staff type the 4-digit PIN and the
// kiosk agent turns the Pi off cleanly - so nobody has to pull the plug
// (that can corrupt the SD card).
//
// The PIN is checked by the AGENT, from /etc/medikiosk/shutdown_pin on the Pi.
// This page never knows it (anything in the page's code or .env can be read
// by anyone with the browser's dev tools). See MediKiosk_hardware/agent/README.md.
//
// Staff only, so the text is English (not translated).
// ============================================================

const PIN_LENGTH = 4;
const IDLE_CLOSE_MS = 30000; // panel left alone -> closes by itself
const ANSWER_TIMEOUT_MS = 8000; // no answer from the agent -> show a problem

export default function StaffShutdown({ onClose }) {
  const { agent, connection } = useKioskAgent();
  const [pin, setPin] = useState('');
  const [phase, setPhase] = useState('pin'); // 'pin' | 'sending' | 'off'
  const [error, setError] = useState('');
  const stopReply = useRef(() => {});
  const answerTimer = useRef(null);

  // stop listening for the agent's answer when the panel closes
  useEffect(
    () => () => {
      stopReply.current();
      clearTimeout(answerTimer.current);
    },
    []
  );

  // left alone while typing the PIN -> close (so it never stays open for the next patient)
  useEffect(() => {
    if (phase !== 'pin') return undefined;
    const timer = setTimeout(onClose, IDLE_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase, pin, error, onClose]);

  const press = (digit) => {
    setError('');
    setPin((p) => (p.length < PIN_LENGTH ? p + digit : p));
  };
  const backspace = () => setPin((p) => p.slice(0, -1));

  const shutDown = () => {
    if (pin.length !== PIN_LENGTH) return;
    if (!agent || connection !== 'connected') {
      setError('Can’t reach the kiosk agent. Is the Agent window running?');
      return;
    }
    setPhase('sending');
    stopReply.current();
    clearTimeout(answerTimer.current);
    answerTimer.current = setTimeout(() => {
      stopReply.current();
      setPin('');
      setPhase('pin');
      setError('The kiosk agent didn’t answer. Is the Agent window running?');
    }, ANSWER_TIMEOUT_MS);
    stopReply.current = agent.shutdown(pin, (msg) => {
      clearTimeout(answerTimer.current);
      if (msg.ok) {
        if (msg.message === 'simulated') {
          // laptop / SIMULATE=1: the PIN was right, but the computer stays on
          stopReply.current();
          setPin('');
          setPhase('pin');
          setError('PIN OK - simulation, so this computer stays on.');
          return;
        }
        setPhase('off');
      } else {
        setPin('');
        setPhase('pin');
        setError(msg.message || 'The kiosk could not shut down.');
      }
    });
  };

  if (phase === 'off') {
    return (
      <div className="k-dialog k-staff" role="alertdialog" aria-modal="true" aria-labelledby="k-staff-title">
        <div className="k-dialog__box">
          <span className="k-dialog__icon">
            <Icon name="clock" size={64} />
          </span>
          <h2 id="k-staff-title" className="k-dialog__title">
            Shutting down…
          </h2>
          <p className="k-dialog__text">
            Wait until the screen goes black (about 20 seconds). Then you can unplug the kiosk.
          </p>
        </div>
      </div>
    );
  }

  const sending = phase === 'sending';
  return (
    <div className="k-dialog k-staff" role="dialog" aria-modal="true" aria-labelledby="k-staff-title">
      <div className="k-dialog__box">
        <span className="k-dialog__icon">
          <Icon name="lock" size={64} />
        </span>
        <h2 id="k-staff-title" className="k-dialog__title">
          Staff: shut down kiosk
        </h2>
        <p className="k-dialog__text">Enter the 4-digit staff PIN.</p>

        <div className="k-staff__dots" aria-label={`${pin.length} of ${PIN_LENGTH} digits entered`}>
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span key={i} className={`k-staff__dot${i < pin.length ? ' is-filled' : ''}`} />
          ))}
        </div>
        <p className="k-staff__error" role="status">
          {error}
        </p>

        <div className="k-staff__pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" className="k-staff__key" disabled={sending} onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <span />
          <button type="button" className="k-staff__key" disabled={sending} onClick={() => press('0')}>
            0
          </button>
          <button
            type="button"
            className="k-staff__key k-staff__key--small"
            disabled={sending || !pin}
            onClick={backspace}
            aria-label="Delete last digit"
          >
            <Icon name="back" size={44} />
          </button>
        </div>

        <KioskButton icon="check" disabled={sending || pin.length !== PIN_LENGTH} onClick={shutDown}>
          {sending ? 'Checking…' : 'Shut down kiosk'}
        </KioskButton>
        <KioskButton variant="secondary" icon="x" disabled={sending} onClick={onClose}>
          Cancel
        </KioskButton>
      </div>
    </div>
  );
}
