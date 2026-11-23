import { useEffect, useRef, useState } from 'react';
import Icon from './ui/Icon';
import { KioskButton } from './ui/KioskUI';
import DeveloperOptions from './DeveloperOptions';
import { useKioskAgent } from '../services/kioskAgentService';

// ============================================================
// Staff-only PIN pad. Opened by pressing and holding the clock on the start
// screen for 5 s (StaffClock.jsx). It just says "Staff access" - nothing on
// screen tells anyone there are two PINs:
//
//   staff shutdown PIN -> "Shut down kiosk?" -> the kiosk agent turns the Pi off
//                         cleanly (pulling the plug can corrupt the SD card)
//   developer PIN      -> Developer options (DeveloperOptions.jsx)
//
// Both PINs are checked by the AGENT, from /etc/medikiosk/shutdown_pin and
// /etc/medikiosk/dev_pin on the Pi. This page never knows them (anything in the
// page's code or .env can be read by anyone with the browser's dev tools).
// See MediKiosk_hardware/agent/README.md.
//
// Staff only, so the text is English (not translated).
// ============================================================

const PIN_LENGTH = 4;
const IDLE_CLOSE_MS = 30000; // panel left alone -> closes by itself
const ANSWER_TIMEOUT_MS = 8000; // no answer from the agent -> show a problem
const NO_AGENT = 'Can’t reach the kiosk agent. Is the Agent window running?';
const NO_ANSWER = 'The kiosk agent didn’t answer. Is the Agent window running?';

export default function StaffShutdown({ onClose }) {
  const { agent, connection } = useKioskAgent();
  const [pin, setPin] = useState('');
  // 'pin' | 'checking' | 'confirm' | 'sending' | 'off' | 'developer'
  const [phase, setPhase] = useState('pin');
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState(null);
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

  // left alone on the PIN pad or the shutdown question -> close (never left open for the next patient)
  useEffect(() => {
    if (phase !== 'pin' && phase !== 'confirm') return undefined;
    const timer = setTimeout(onClose, IDLE_CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase, pin, error, onClose]);

  const press = (digit) => {
    setError('');
    setPin((p) => (p.length < PIN_LENGTH ? p + digit : p));
  };
  const backspace = () => setPin((p) => p.slice(0, -1));

  // ask the agent; `onAnswer` gets its reply, a missing answer goes back to the PIN pad
  const ask = (busyPhase, send, onAnswer) => {
    if (!agent || connection !== 'connected') {
      setError(NO_AGENT);
      return;
    }
    setPhase(busyPhase);
    stopReply.current();
    clearTimeout(answerTimer.current);
    answerTimer.current = setTimeout(() => {
      stopReply.current();
      setPin('');
      setPhase('pin');
      setError(NO_ANSWER);
    }, ANSWER_TIMEOUT_MS);
    stopReply.current = send((msg) => {
      clearTimeout(answerTimer.current);
      onAnswer(msg);
    });
  };

  const backToPad = (message) => {
    stopReply.current();
    setPin('');
    setPhase('pin');
    setError(message);
  };

  // step 1: what does this PIN open?
  const checkPin = () => {
    if (pin.length !== PIN_LENGTH) return;
    ask(
      'checking',
      (reply) => agent.staffPin(pin, reply),
      (msg) => {
        stopReply.current();
        if (!msg.ok) return backToPad(msg.message || 'Wrong PIN.');
        if (msg.opens === 'developer' && msg.token) {
          setPin(''); // the developer screens don't need it any more
          setDevToken(msg.token);
          setPhase('developer');
          return;
        }
        setPhase('confirm'); // keep the PIN: the shutdown command checks it again
      }
    );
  };

  // step 2 (shutdown PIN): really shut down
  const shutDown = () => {
    ask(
      'sending',
      (reply) => agent.shutdown(pin, reply),
      (msg) => {
        if (msg.ok) {
          if (msg.message === 'simulated') {
            // laptop / SIMULATE=1: the PIN was right, but the computer stays on
            return backToPad('PIN OK - simulation, so this computer stays on.');
          }
          setPhase('off');
        } else {
          backToPad(msg.message || 'The kiosk could not shut down.');
        }
      }
    );
  };

  if (phase === 'developer') {
    return <DeveloperOptions token={devToken} onClose={onClose} />;
  }

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

  if (phase === 'confirm' || phase === 'sending') {
    const sending = phase === 'sending';
    return (
      <div className="k-dialog k-staff" role="alertdialog" aria-modal="true" aria-labelledby="k-staff-title">
        <div className="k-dialog__box">
          <span className="k-dialog__icon k-staff__icon--danger">
            <Icon name="power" size={64} />
          </span>
          <h2 id="k-staff-title" className="k-dialog__title">
            Shut down kiosk?
          </h2>
          <p className="k-dialog__text">
            After you tap Shut down, wait until the screen goes black (about 20 seconds). Then you can unplug
            the kiosk.
          </p>
          <div className="k-staff__actions">
            <KioskButton icon="check" className="k-staff__btn--danger" disabled={sending} onClick={shutDown}>
              {sending ? 'Shutting down…' : 'Shut down'}
            </KioskButton>
            <KioskButton variant="secondary" icon="x" disabled={sending} onClick={onClose}>
              Cancel
            </KioskButton>
          </div>
        </div>
      </div>
    );
  }

  const checking = phase === 'checking';
  return (
    <div className="k-dialog k-staff" role="dialog" aria-modal="true" aria-labelledby="k-staff-title">
      <div className="k-dialog__box">
        <span className="k-dialog__icon">
          <Icon name="lock" size={64} />
        </span>
        <h2 id="k-staff-title" className="k-dialog__title">
          Staff access
        </h2>
        <p className="k-dialog__text">Enter your 4-digit PIN.</p>

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
            <button key={d} type="button" className="k-staff__key" disabled={checking} onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <span />
          <button type="button" className="k-staff__key" disabled={checking} onClick={() => press('0')}>
            0
          </button>
          <button
            type="button"
            className="k-staff__key k-staff__key--small"
            disabled={checking || !pin}
            onClick={backspace}
            aria-label="Delete last digit"
          >
            <Icon name="back" size={44} />
          </button>
        </div>

        <KioskButton icon="check" disabled={checking || pin.length !== PIN_LENGTH} onClick={checkPin}>
          {checking ? 'Checking…' : 'Continue'}
        </KioskButton>
        <KioskButton variant="secondary" icon="x" disabled={checking} onClick={onClose}>
          Cancel
        </KioskButton>
      </div>
    </div>
  );
}
