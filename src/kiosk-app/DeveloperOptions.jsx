import { useEffect, useRef, useState } from 'react';
import Icon from './ui/Icon';
import { KioskButton } from './ui/KioskUI';
import { useKioskAgent } from '../services/kioskAgentService';
import DevTemperature from './dev/DevTemperature';
import DevSpo2 from './dev/DevSpo2';
import DevWeight from './dev/DevWeight';
import DevHeight from './dev/DevHeight';
import DevBpCamera from './dev/DevBpCamera';
import DevWifi from './dev/DevWifi';

// ============================================================
// Developer options - opened ONLY by the developer PIN on the hidden staff
// PIN pad (StaffShutdown.jsx). Not for health center staff: they only get the
// shutdown PIN. Calibration, Wi-Fi, restart and exit to desktop live here.
//
//   token    the developer session from the agent (staff_pin answer). Every
//            developer command sends it; closing this screen ends the session.
//   onClose  back to the start screen
//
// Calibration screens are in ./dev/ (part 2). Shut down works here without the
// staff PIN (the developer PIN already let you in). Wi-Fi is ./dev/DevWifi.jsx.
// Restart / Exit to desktop / Open terminal run hardware/kiosk_control.sh on the Pi.
// Staff only, so the text is English (not translated).
// ============================================================

const IDLE_CLOSE_MS = 120000; // 2 min without a touch -> close (never left open for a patient)

const CALIBRATION = [
  { key: 'temperature', icon: 'temp', title: 'Temperature', sub: 'Offset', color: 'temp' },
  { key: 'spo2', icon: 'drop', title: 'SpO₂', sub: 'Offset', color: 'breath' },
  { key: 'weight', icon: 'bmi', title: 'Weight', sub: 'Tare · known weight', color: 'bmi' },
  { key: 'height', icon: 'height', title: 'Height', sub: 'Sensor mount height', color: 'bmi' },
];

const SCREENS = {
  temperature: DevTemperature,
  spo2: DevSpo2,
  weight: DevWeight,
  height: DevHeight,
  bpcam: DevBpCamera,
  wifi: DevWifi,
};

// SYSTEM buttons. restart / desktop / terminal run hardware/kiosk_control.sh on the Pi.
const ACTIONS = {
  restart: {
    action: 'dev_system',
    payload: () => ({ op: 'restart' }),
    icon: 'retry',
    title: 'Restart the kiosk?',
    text: 'All kiosk programs stop and start again (about 30 seconds). This screen goes away meanwhile. Nothing saved is lost.',
    button: 'Restart',
    doneTitle: 'Restarting…',
    doneText: 'The kiosk screen comes back by itself in about 30 seconds.',
    simulated: 'Simulation - nothing restarts on this computer.',
  },
  desktop: {
    action: 'dev_system',
    payload: (stop) => ({ op: 'desktop', stop }),
    icon: 'monitor',
    title: 'Exit to desktop?',
    text: 'The kiosk screen closes and the Pi desktop shows, with the on-screen keyboard. To come back, tap the MediKiosk icon on the desktop.',
    button: 'Exit to desktop',
    doneTitle: 'Leaving the kiosk…',
    doneText: 'To come back: tap the MediKiosk icon on the desktop.',
    simulated: 'Simulation - the kiosk page stays open on this computer.',
    stopOption: true,
  },
  terminal: {
    action: 'dev_system',
    payload: () => ({ op: 'terminal' }),
    icon: 'terminal',
    title: 'Open a terminal?',
    text: 'The kiosk screen closes and a terminal opens in the MediKiosk_hardware folder, with the on-screen keyboard. The kiosk programs keep running. To come back, tap the MediKiosk icon on the desktop.',
    button: 'Open terminal',
    doneTitle: 'Opening the terminal…',
    doneText: 'To come back: tap the MediKiosk icon on the desktop.',
    simulated: 'Simulation - no terminal opens on this computer.',
  },
  shutdown: {
    action: 'dev_shutdown',
    payload: () => ({}),
    icon: 'power',
    danger: true,
    title: 'Shut down kiosk?',
    text: 'After you tap Shut down, wait until the screen goes black (about 20 seconds). Then you can unplug the kiosk.',
    button: 'Shut down',
    doneTitle: 'Shutting down…',
    doneText: 'Wait until the screen goes black (about 20 seconds). Then you can unplug the kiosk.',
    simulated: 'Simulation - this computer stays on.',
  },
};

function SystemDialog({ dialog, alsoStop, setAlsoStop, onRun, onCancel }) {
  const how = ACTIONS[dialog.kind];
  const done = dialog.phase === 'done';
  const sending = dialog.phase === 'sending';
  return (
    <div className="k-dialog k-staff k-dev__pad-dialog" role="alertdialog" aria-modal="true" aria-labelledby="k-dev-sys-title">
      <div className="k-dialog__box">
        <span className={`k-dialog__icon${how.danger && !done ? ' k-staff__icon--danger' : ''}`}>
          <Icon name={done ? 'clock' : how.icon} size={64} />
        </span>
        <h2 id="k-dev-sys-title" className="k-dialog__title">
          {done ? how.doneTitle : how.title}
        </h2>
        <p className="k-dialog__text">{done ? how.doneText : how.text}</p>
        {how.stopOption && !done && (
          <label className="k-dev__check">
            <input type="checkbox" checked={alsoStop} disabled={sending} onChange={(e) => setAlsoStop(e.target.checked)} />
            <span>
              <strong>Also stop the kiosk programs</strong>
              Needed when a tool must use the sensors or cameras (e.g. bp_camTEST.py).
            </span>
          </label>
        )}
        {dialog.msg && <p className="k-staff__error">{dialog.msg}</p>}
        {!done && (
          <div className="k-staff__actions">
            <KioskButton icon="check" className={how.danger ? 'k-staff__btn--danger' : ''} disabled={sending} onClick={onRun}>
              {sending ? 'Please wait…' : how.button}
            </KioskButton>
            <KioskButton variant="secondary" icon="x" disabled={sending} onClick={onCancel}>
              Cancel
            </KioskButton>
          </div>
        )}
      </div>
    </div>
  );
}

export default function DeveloperOptions({ token, onClose }) {
  const { agent, simulated } = useKioskAgent();
  const idleTimer = useRef(null);
  const [screen, setScreen] = useState(null); // null = this menu, else a key of SCREENS
  // the SYSTEM buttons: a confirm dialog, then the agent does it
  const [dialog, setDialog] = useState(null); // null | { kind, phase: 'confirm'|'sending'|'done', msg }
  const [alsoStop, setAlsoStop] = useState(false);
  const open = (kind) => {
    setAlsoStop(false);
    setDialog({ kind, phase: 'confirm', msg: '' });
  };

  const runAction = async () => {
    const { kind } = dialog;
    const how = ACTIONS[kind];
    setDialog({ kind, phase: 'sending', msg: '' });
    const r = agent
      ? await agent.devRequest(token, how.action, how.payload(alsoStop))
      : { ok: false, message: 'Can’t reach the kiosk agent.' };
    if (r.ok && r.message !== 'simulated') {
      setDialog({ kind, phase: 'done', msg: '' });
      return;
    }
    setDialog({ kind, phase: 'confirm', msg: r.ok ? how.simulated : r.message || 'It did not work.' });
  };

  // Close and the idle timer both end the developer session on the agent.
  // (Not in an effect clean-up: React's StrictMode runs those once right after
  // the first render, which would end the session at once. If the page itself
  // goes away, the agent ends the session 10 min after its last command.)
  const close = () => {
    clearTimeout(idleTimer.current);
    agent?.devEnd(token);
    onClose();
  };
  const closeRef = useRef(close);
  closeRef.current = close;

  // any touch keeps it open; 2 min without one closes it
  const touched = () => {
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => closeRef.current(), IDLE_CLOSE_MS);
  };
  useEffect(() => {
    touched();
    return () => clearTimeout(idleTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Screen = screen && SCREENS[screen];
  if (Screen) {
    return (
      <div className="k-dev__host" onPointerDown={touched}>
        <Screen token={token} onBack={() => setScreen(null)} />
      </div>
    );
  }

  return (
    <div
      className="k-dev"
      role="dialog"
      aria-modal="true"
      aria-labelledby="k-dev-title"
      onPointerDown={touched}
    >
      <div className="k-dev__top">
        <span className="k-dev__badge">
          <Icon name="tool" size={32} />
          DEVELOPER
        </span>
        <span className="k-dev__muted">Closes after 2 min idle</span>
      </div>

      <h1 id="k-dev-title" className="k-dev__title">
        Developer options
      </h1>
      <p className="k-dev__sub">{simulated ? 'Agent connected · simulated sensors' : 'Agent connected'}</p>

      <h2 className="k-dev__section">CALIBRATION</h2>
      <div className="k-dev__grid">
        {CALIBRATION.map((c) => (
          <button key={c.key} type="button" className="k-dev__tile" data-color={c.color} onClick={() => setScreen(c.key)}>
            <Icon name={c.icon} size={56} />
            <span className="k-dev__tile-title">{c.title}</span>
            <span className="k-dev__tile-sub">{c.sub}</span>
          </button>
        ))}
        <button type="button" className="k-dev__row k-dev__row--wide" data-color="bp" onClick={() => setScreen('bpcam')}>
          <Icon name="camera" size={56} />
          <span className="k-dev__row-text">
            <span className="k-dev__tile-title">Blood pressure camera</span>
            <span className="k-dev__tile-sub">SYS / DIA / PUL boxes · reading settings</span>
          </span>
        </button>
      </div>

      <h2 className="k-dev__section">NETWORK</h2>
      <button type="button" className="k-dev__row" onClick={() => setScreen('wifi')}>
        <Icon name="wifi" size={60} />
        <span className="k-dev__row-text">
          <span className="k-dev__tile-title">Wi-Fi</span>
          <span className="k-dev__tile-sub">Networks, connection status, IP address</span>
        </span>
      </button>

      <h2 className="k-dev__section">SYSTEM</h2>
      <div className="k-dev__grid">
        <button type="button" className="k-dev__system" onClick={() => open('restart')}>
          Restart kiosk
        </button>
        <button type="button" className="k-dev__system" onClick={() => open('desktop')}>
          Exit to desktop
        </button>
        <button type="button" className="k-dev__system k-dev__system--terminal" onClick={() => open('terminal')}>
          <Icon name="terminal" size={44} stroke={2.4} />
          Open terminal
        </button>
        <button type="button" className="k-dev__system k-dev__system--danger" onClick={() => open('shutdown')}>
          <Icon name="power" size={44} stroke={2.4} />
          Shut down kiosk
        </button>
      </div>

      <div className="k-dev__bottom">
        <KioskButton icon="home" onClick={close}>
          Close · back to Start
        </KioskButton>
      </div>

      {dialog && (
        <SystemDialog
          dialog={dialog}
          alsoStop={alsoStop}
          setAlsoStop={setAlsoStop}
          onRun={runAction}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
