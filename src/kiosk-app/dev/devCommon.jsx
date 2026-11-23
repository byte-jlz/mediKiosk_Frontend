import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import { useKioskAgent } from '../../services/kioskAgentService';

// ============================================================
// Shared pieces for the Developer options screens (developer PIN only).
// Staff/developer only, so the text is English (not translated).
// ============================================================

/** Frame of every developer sub-screen: back chip + badge, title, body, bottom buttons. */
export function DevScreen({ title, color, sub, onBack, children, bottom }) {
  return (
    <div className="k-dev" data-color={color} role="dialog" aria-modal="true" aria-labelledby="k-dev-title">
      <div className="k-dev__top">
        <button type="button" className="k-dev__back" onClick={onBack}>
          <Icon name="back" size={30} />
          Developer options
        </button>
        <span className="k-dev__badge">
          <Icon name="tool" size={32} />
          DEVELOPER
        </span>
      </div>
      <h1 id="k-dev-title" className="k-dev__title k-dev__title--step">
        {title}
      </h1>
      {sub && <p className="k-dev__sub">{sub}</p>}
      {children}
      {bottom && <div className="k-dev__bottom k-dev__actions">{bottom}</div>}
    </div>
  );
}

/** A short line under a control: grey info, green ok, or red problem. */
export function DevMessage({ tone = 'info', children }) {
  if (!children) return null;
  return (
    <p className={`k-dev__msg k-dev__msg--${tone}`} role="status">
      {children}
    </p>
  );
}

/** − value + with fixed steps. */
export function Stepper({ value, step, min, max, format, onChange, label }) {
  const round = (v) => Math.round(v * 1000) / 1000;
  return (
    <div className="k-dev__stepper">
      <button
        type="button"
        className="k-dev__step-btn"
        aria-label={`Lower ${label}`}
        disabled={value - step < min - 1e-9}
        onClick={() => onChange(round(value - step))}
      >
        −
      </button>
      <div className="k-dev__step-value">{format(value)}</div>
      <button
        type="button"
        className="k-dev__step-btn"
        aria-label={`Raise ${label}`}
        disabled={value + step > max + 1e-9}
        onClick={() => onChange(round(value + step))}
      >
        +
      </button>
    </div>
  );
}

/**
 * A number field that opens an on-screen number pad (the kiosk has no keyboard).
 *   value     the number or '' (shown in the field)
 *   onChange  called with the typed number when Done is tapped
 */
export function NumberField({ label, value, unit, onChange, placeholder = 'Tap to type' }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="k-dev__numfield" onClick={() => setOpen(true)}>
        <span className="k-dev__numfield-label">{label}</span>
        <span className={`k-dev__numfield-value${value === '' || value == null ? ' is-empty' : ''}`}>
          {value === '' || value == null ? placeholder : `${value} ${unit}`}
        </span>
      </button>
      {open && (
        <NumberPad
          title={label}
          unit={unit}
          initial={value === '' || value == null ? '' : String(value)}
          onCancel={() => setOpen(false)}
          onDone={(n) => {
            setOpen(false);
            onChange(n);
          }}
        />
      )}
    </>
  );
}

function NumberPad({ title, unit, initial, onDone, onCancel }) {
  const [text, setText] = useState(initial);
  const press = (k) =>
    setText((t) => {
      if (k === '.' && t.includes('.')) return t;
      if (t.length >= 7) return t;
      return t === '0' && k !== '.' ? k : t + k;
    });
  const n = parseFloat(text);
  const ok = text !== '' && Number.isFinite(n);
  return (
    <div className="k-dialog k-dev__pad-dialog" role="dialog" aria-modal="true" aria-label={title}>
      <div className="k-dialog__box">
        <h2 className="k-dialog__title k-dev__pad-title">{title}</h2>
        <div className="k-dev__pad-display">
          {text || '0'} <span>{unit}</span>
        </div>
        <div className="k-staff__pad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'].map((k) => (
            <button key={k} type="button" className="k-staff__key" onClick={() => press(k)}>
              {k}
            </button>
          ))}
          <button
            type="button"
            className="k-staff__key k-staff__key--small"
            aria-label="Delete last digit"
            onClick={() => setText((t) => t.slice(0, -1))}
          >
            <Icon name="back" size={44} />
          </button>
        </div>
        <div className="k-dev__grid">
          <button type="button" className="k-dev__system" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="k-dev__system k-dev__system--primary" disabled={!ok} onClick={() => onDone(n)}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

/** Developer commands with the session token: send(action, payload) -> Promise<reply>. */
export function useDev(token) {
  const { agent, connection, simulated } = useKioskAgent();
  const send = useCallback(
    (action, payload, timeoutMs) => {
      if (!agent || connection !== 'connected') {
        return Promise.resolve({ ok: false, message: 'Can’t reach the kiosk agent.' });
      }
      return agent.devRequest(token, action, payload, timeoutMs);
    },
    [agent, connection, token]
  );
  return { agent, send, simulated };
}

/** The calibration numbers (calibration.json) as they were when the screen opened. */
export function useCalibration(send) {
  const [cal, setCal] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let alive = true;
    send('dev_cal_get').then((r) => {
      if (!alive) return;
      if (r.ok) setCal(r);
      else setError(r.message || 'Could not read the calibration.');
    });
    return () => {
      alive = false;
    };
  }, [send]);
  return { cal, error };
}

/**
 * Run one normal scan from a developer screen (no session = nothing is saved),
 * e.g. a finger reading for SpO2 or a height reading. The screen shows the
 * agent's prompts and a Ready button, like the kiosk wizard does.
 *   state: { phase: 'idle'|'running'|'done'|'failed', message, waitingStep, result }
 */
export function useDevScan(agent, vital) {
  const [state, setState] = useState({ phase: 'idle' });
  const scanId = useRef(null);

  useEffect(
    () => () => {
      if (scanId.current) agent?.cancel(scanId.current); // leaving the screen stops the reading
    },
    [agent]
  );

  const start = () => {
    if (!agent) return;
    setState({ phase: 'running', message: 'Starting…' });
    const { id, done } = agent.scan(vital, null, (msg) => {
      setState((s) => ({
        ...s,
        message: msg.message || s.message,
        waitingStep: msg.phase === 'awaiting_confirm' ? msg.step : msg.phase === 'confirmed' ? null : s.waitingStep,
      }));
    });
    scanId.current = id;
    done.then((res) => {
      scanId.current = null;
      setState(
        res.ok
          ? { phase: 'done', result: res }
          : { phase: 'failed', message: res.error || 'The reading did not work.' }
      );
    });
  };

  const ready = () => {
    if (scanId.current && state.waitingStep) agent.confirm(scanId.current, state.waitingStep);
  };

  const cancel = () => {
    if (scanId.current) agent.cancel(scanId.current);
  };

  return { state, start, ready, cancel };
}

/** The prompt + Ready button while a useDevScan reading runs. */
export function DevScanStatus({ scan, label }) {
  const { state } = scan;
  if (state.phase !== 'running') return null;
  return (
    <div className="k-dev__scan">
      <span className="k-dev__scan-label">{label}</span>
      <span className="k-dev__scan-msg">{state.message}</span>
      <div className="k-dev__grid">
        <button type="button" className="k-dev__system" onClick={scan.cancel}>
          Stop
        </button>
        <button
          type="button"
          className="k-dev__system k-dev__system--primary"
          disabled={!state.waitingStep}
          onClick={scan.ready}
        >
          Ready
        </button>
      </div>
    </div>
  );
}

export const fmtSigned = (v, digits, unit) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(digits)} ${unit}`;

/**
 * Draft + Save + Undo for numbers kept in hardware/calibration.json.
 *   keys   e.g. ['TEMP_OFFSET_C']
 * Save writes the draft. Undo puts back what was there when the screen opened
 * (writing it again if it was already saved).
 */
export function useCalDraft(send, keys) {
  const { cal, error } = useCalibration(send);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(null); // what is in calibration.json right now
  const [msg, setMsg] = useState({ tone: 'info', text: '' });
  const [busy, setBusy] = useState(false);
  const original = useRef(null);

  useEffect(() => {
    if (!cal) return;
    const pick = Object.fromEntries(keys.map((k) => [k, cal.values[k]]));
    original.current = pick;
    setSaved(pick);
    setDraft(pick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cal]);

  const write = async (values, note, okText) => {
    setBusy(true);
    const r = await send('dev_cal_set', { values, note });
    setBusy(false);
    if (!r.ok) {
      setMsg({ tone: 'bad', text: r.message || 'Could not save.' });
      return false;
    }
    const now = Object.fromEntries(keys.map((k) => [k, r.values[k]]));
    setSaved(now);
    setDraft(now);
    setMsg({ tone: 'ok', text: okText });
    return true;
  };

  const changed = draft && saved && keys.some((k) => draft[k] !== saved[k]);
  const differsFromOriginal = saved && original.current && keys.some((k) => saved[k] !== original.current[k]);

  return {
    loading: !cal && !error,
    error,
    draft,
    setDraft: (patch) => {
      setMsg({ tone: 'info', text: '' });
      setDraft((d) => ({ ...d, ...patch }));
    },
    saved,
    original: original.current,
    changed,
    busy,
    msg,
    setMsg,
    save: (note) => write(draft, note, 'Saved. The kiosk uses it from the next reading.'),
    undo: () => {
      if (differsFromOriginal) return write(original.current, 'undo (developer options)', 'Put back the old values.');
      setDraft(saved);
      setMsg({ tone: 'info', text: '' });
      return Promise.resolve(true);
    },
    canUndo: changed || differsFromOriginal,
  };
}

/** Save + Undo buttons used at the bottom of the calibration screens. */
export function SaveUndo({ draft, onSave, blocked = false }) {
  return (
    <>
      <button type="button" className="k-dev__system" disabled={draft.busy || !draft.canUndo} onClick={draft.undo}>
        Undo changes
      </button>
      <button
        type="button"
        className="k-dev__system k-dev__system--primary"
        disabled={draft.busy || blocked || !draft.changed}
        onClick={onSave || (() => draft.save())}
      >
        {draft.busy ? 'Saving…' : 'Save'}
      </button>
    </>
  );
}
