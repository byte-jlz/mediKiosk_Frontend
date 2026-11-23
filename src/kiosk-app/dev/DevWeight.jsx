import { useEffect, useRef, useState } from 'react';
import { DevMessage, DevScreen, NumberField, useDev } from './devCommon';

// Weight calibration. The load cell's factor lives in the ESP32's flash, not in
// calibration.json (same steps as sensor_test.py --calibrate):
//   1. empty platform -> Tare
//   2. known weight on it -> type its kg -> Calibrate (the ESP32 uses the new factor at once)
//   3. check the live reading -> Save (into the ESP32) or Undo (puts the old factor back)
// While this screen is open the agent sends the live weight and does NOT auto-zero.

const WATCH_RENEW_MS = 60000; // the agent stops the live weight after 3 min - keep it going

export default function DevWeight({ token, onBack }) {
  const { agent, send } = useDev(token);
  const [kg, setKg] = useState(null);
  const [spread, setSpread] = useState(null);
  const [oldFactor, setOldFactor] = useState(null);
  const [newFactor, setNewFactor] = useState(null);
  const [savedFactor, setSavedFactor] = useState(null);
  const [tared, setTared] = useState(false);
  const [knownKg, setKnownKg] = useState('');
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState({ tone: 'info', text: 'Connecting to the scale…' });
  const alive = useRef(true);

  // live weight while this screen is open
  useEffect(() => {
    alive.current = true;
    if (!agent) return undefined;
    const off = agent.onDev((m) => {
      if (m.kind !== 'weight') return;
      setKg(m.kg);
      setSpread(m.spread_kg);
    });
    const watch = () =>
      send('dev_scale', { op: 'watch' }, 20000).then((r) => {
        if (!alive.current) return;
        if (r.ok) {
          setOldFactor((f) => f ?? r.factor);
          setMsg((m) => (m.text === 'Connecting to the scale…' ? { tone: 'info', text: '' } : m));
        } else setMsg({ tone: 'bad', text: r.message });
      });
    watch();
    const timer = setInterval(watch, WATCH_RENEW_MS);
    return () => {
      alive.current = false;
      off();
      clearInterval(timer);
      send('dev_scale', { op: 'stop' }); // auto-zero goes back on
    };
  }, [agent, send]);

  const run = async (op, payload, label, timeout = 20000) => {
    setBusy(label);
    setMsg({ tone: 'info', text: `${label}…` });
    const r = await send('dev_scale', { op, ...payload }, timeout);
    if (!alive.current) return null;
    setBusy('');
    setMsg({ tone: r.ok ? (r.warning ? 'bad' : 'ok') : 'bad', text: r.warning || r.message });
    return r.ok ? r : null;
  };

  const tare = async () => {
    const r = await run('tare', {}, 'Taring');
    if (r) {
      setTared(true);
      setMsg({ tone: r.steady ? 'ok' : 'bad', text: r.steady ? 'Zero set. Now put the known weight on.' : r.message });
    }
  };
  const calibrate = async () => {
    if (knownKg === '' || knownKg < 1) {
      setMsg({ tone: 'bad', text: 'Type the known weight in kg first (heavier is better, 5-20 kg).' });
      return;
    }
    const r = await run('calibrate', { kg: knownKg }, 'Calibrating (the weight settles 3 s)');
    if (r) {
      setNewFactor(r.factor);
      if (!r.warning) setMsg({ tone: 'ok', text: `Check the live reading shows ${knownKg} kg. Then Save, or Undo.` });
    }
  };
  const save = async () => {
    const r = await run('save', {}, 'Saving into the scale');
    if (r) {
      setSavedFactor(r.factor);
      setMsg({ tone: 'ok', text: 'Saved in the scale (keeps it after power off).' });
    }
  };
  const undo = async () => {
    const r = await run('restore', { factor: oldFactor }, 'Putting the old factor back');
    if (r) {
      if (savedFactor != null) {
        await run('save', {}, 'Saving the old factor');
      }
      setNewFactor(null);
      setSavedFactor(null);
      setMsg({ tone: 'ok', text: 'The old factor is back.' });
    }
  };

  const unsaved = newFactor != null && savedFactor !== newFactor;
  const steady = spread != null && spread < 0.15;

  return (
    <DevScreen
      title="Weight"
      color="bmi"
      sub="Do step 1, then step 2. You need something whose weight you know."
      onBack={onBack}
      bottom={
        <>
          <button
            type="button"
            className="k-dev__system"
            disabled={Boolean(busy) || (newFactor == null && savedFactor == null)}
            onClick={undo}
          >
            Undo changes
          </button>
          <button type="button" className="k-dev__system k-dev__system--primary" disabled={Boolean(busy) || !unsaved} onClick={save}>
            Save
          </button>
        </>
      }
    >
      <div className="k-dev__live">
        <div>
          <span className="k-dev__live-label">Scale now (live)</span>
          <span className="k-dev__live-value k-dev__live-value--big">{kg != null ? `${kg.toFixed(2)} kg` : '--'}</span>
        </div>
        <span className="k-dev__live-note">
          {kg == null ? 'Waiting for the scale…' : steady ? 'Steady' : 'Moving…'}
          {oldFactor != null && ` · factor ${(newFactor ?? oldFactor).toFixed(2)}${unsaved ? ' (not saved)' : ''}`}
        </span>
      </div>

      <div className="k-dev__stepcard">
        <span className="k-dev__stepnum">1</span>
        <span className="k-dev__stepcard-text">
          <span className="k-dev__stepcard-title">Empty the platform</span>
          <span className="k-dev__stepcard-sub">{tared ? 'Done' : 'Nothing and nobody on it'}</span>
        </span>
        <button type="button" className="k-dev__chip-btn k-dev__chip-btn--big" disabled={Boolean(busy)} onClick={tare}>
          Tare
        </button>
      </div>

      <div className="k-dev__stepcard k-dev__stepcard--column">
        <div className="k-dev__stepcard-row">
          <span className="k-dev__stepnum">2</span>
          <span className="k-dev__stepcard-title">Put the known weight in the centre</span>
        </div>
        <NumberField label="Its real weight" unit="kg" value={knownKg} onChange={setKnownKg} />
        <button
          type="button"
          className="k-dev__system k-dev__system--primary k-dev__wide"
          disabled={Boolean(busy) || !tared}
          onClick={calibrate}
        >
          Calibrate
        </button>
      </div>
      <DevMessage tone={msg.tone}>{busy ? `${busy}…` : msg.text}</DevMessage>
    </DevScreen>
  );
}
