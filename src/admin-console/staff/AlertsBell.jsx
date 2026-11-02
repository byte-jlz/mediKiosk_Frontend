import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { acknowledgeAlert } from '../../services/triageService';
import { useLiveEvents, useNow, useStaffQueue } from './staffHooks';
import { fmtTime, waitingFor } from './triageFormat';
import './staff.css';

/** Short two-tone chime (Web Audio). Browsers may block it until the page is clicked once. */
function chime() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.18 + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.18);
      osc.stop(ctx.currentTime + i * 0.18 + 0.17);
    });
    setTimeout(() => ctx.close(), 800);
  } catch {
    // no sound available - the toast is still shown
  }
}

/**
 * "Receive priority alerts" (Clinic Staff). The bell counts High Risk
 * patients still waiting whose alert nobody acknowledged; a new one pops up
 * as a toast with a chime, on whatever staff page is open.
 */
export default function AlertsBell() {
  const navigate = useNavigate();
  const { data } = useStaffQueue();
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [busy, setBusy] = useState('');
  const wrapRef = useRef(null);
  const alerts = data?.alerts || [];

  const onEvent = useCallback((event) => {
    if (event.type !== 'alert' || !event.checkIn) return;
    chime();
    setToasts((t) => [event.checkIn, ...t.filter((x) => x.id !== event.checkIn.id)].slice(0, 3));
  }, []);
  useLiveEvents(onEvent);

  // a toast goes away by itself once the alert is handled (by anyone)
  useEffect(() => {
    if (!data) return;
    const openIds = new Set((data.alerts || []).map((a) => a.id));
    setToasts((t) => t.filter((x) => openIds.has(x.id)));
  }, [data]);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    window.addEventListener('click', onClick);
    return () => window.removeEventListener('click', onClick);
  }, [open]);

  async function handleAck(id) {
    setBusy(id);
    try {
      await acknowledgeAlert(id);
    } catch {
      // the queue refresh shows the real state either way
    } finally {
      setBusy('');
    }
  }

  function openCheckIn(id) {
    setOpen(false);
    setToasts((t) => t.filter((x) => x.id !== id));
    navigate(`/admin/queue/${id}`);
  }

  return (
    <div className="mk-alerts" ref={wrapRef}>
      <button
        type="button"
        className={`mk-admin-header__bell${alerts.length ? ' mk-alerts__bell--on' : ''}`}
        aria-label={`Priority alerts: ${alerts.length} open`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        🔔
        {alerts.length > 0 && <span className="mk-alerts__count">{alerts.length}</span>}
      </button>

      {open && (
        <div className="mk-alerts__panel" role="dialog" aria-label="Priority alerts">
          <p className="mk-alerts__title">Priority alerts</p>
          {alerts.length === 0 && <p className="mk-alerts__empty">No open High Risk alerts.</p>}
          {alerts.map((a) => (
            <div key={a.id} className="mk-alerts__item">
              <button type="button" className="mk-alerts__main" onClick={() => openCheckIn(a.id)}>
                <strong>{a.patientName}</strong>
                <span>{a.urgencyReasons[0] || 'High Risk'}</span>
                <span className="mk-alerts__meta">
                  {a.kioskName} · {fmtTime(a.createdAt)} · waiting {waitingFor(a.createdAt, now)}
                </span>
              </button>
              <button
                type="button"
                className="mk-alerts__ack"
                disabled={busy === a.id}
                onClick={() => handleAck(a.id)}
              >
                Acknowledge
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="mk-toasts" aria-live="assertive">
        {toasts.map((t) => (
          <div key={t.id} className="mk-toast" role="alert">
            <div className="mk-toast__head">
              <span className="mk-toast__tag">HIGH RISK</span>
              <button
                type="button"
                className="mk-toast__close"
                aria-label="Dismiss"
                onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))}
              >
                ✕
              </button>
            </div>
            <p className="mk-toast__name">{t.patientName}</p>
            <p className="mk-toast__why">{t.urgencyReasons[0] || 'High Risk check-in'}</p>
            <p className="mk-toast__meta">{t.kioskName} · {fmtTime(t.createdAt)}</p>
            <div className="mk-toast__actions">
              <button type="button" className="mk-toast__open" onClick={() => openCheckIn(t.id)}>
                Open patient
              </button>
              <button type="button" className="mk-toast__ack" onClick={() => handleAck(t.id)}>
                Acknowledge
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
