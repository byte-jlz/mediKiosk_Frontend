import { useCallback, useEffect, useMemo, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { watchQueue } from '../services/liveService';
import { getQueue, overrideTier, setVisitStatus } from '../services/clinicalService';
import Icon from '../components/Icon';
import { REVIEW_TEXT, TIER_ORDER, VITALS, alertsFor, cellStates, describeFlag, tierRank } from './vitalsDisplay';
import './QueueScreen.css';

const FALLBACK_MS = 15000;   // polling, only used while the live connection is down
const TIERS_HIGH_FIRST = [...TIER_ORDER].reverse();

export default function QueueScreen() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);
  const [filter, setFilter] = useState('all'); // all | critical | recheck
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getQueue();
      setItems(data.items);
      setError('');
      setUpdated(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    return watchQueue({ onChange: load, onStatus: (st) => setLive(st === 'live') });
  }, [load]);

  // while the live connection is down, keep the screen fresh by polling
  useEffect(() => {
    if (live) return undefined;
    const timer = setInterval(load, FALLBACK_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  // keep the same patient open across refreshes; if they leave the queue, open the first one
  const selected = useMemo(() => items.find((i) => i.id === selectedId) || items[0] || null, [items, selectedId]);

  const counts = useMemo(() => {
    const c = Object.fromEntries(TIER_ORDER.map((t) => [t, 0]));
    for (const i of items) c[i.tier] += 1;
    return c;
  }, [items]);

  const alerts = useMemo(() => new Map(items.map((i) => [i.id, alertsFor(i)])), [items]);
  const nCritical = items.filter((i) => alerts.get(i.id).critical.length > 0).length;
  const nRecheck = items.filter((i) => alerts.get(i.id).recheck.length > 0).length;
  const visible = items.filter((i) => {
    const a = alerts.get(i.id);
    return filter === 'critical' ? a.critical.length > 0 : filter === 'recheck' ? a.recheck.length > 0 : true;
  });

  return (
    <AdminLayout>
      <AdminHeader title="Patient queue" />
      <div className="mk-page mk-queue">
        {error && <p className="mk-queue__error" role="alert">{error}</p>}

        <div className="mk-queue__layout">
          <aside className="mk-queue__side" aria-label="Pending patient queue">
            <div className="mk-queue__side-head">
              <h2>Pending patients</h2>
              <span className="mk-queue__total">{items.length}</span>
              <button type="button" className="mk-queue__refresh" onClick={load} aria-label="Refresh queue" title="Refresh now">↻</button>
            </div>
            <div className="mk-queue__counts">
              {TIERS_HIGH_FIRST.map((t) => (
                <span key={t} className="mk-queue__count" data-tier={t}>
                  <i /> {t} <b>{counts[t]}</b>
                </span>
              ))}
            </div>

            {nCritical > 0 && (
              <button type="button" className="mk-queue__attention" onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}>
                <Icon name="alert" size={18} />
                <span>
                  <b>{nCritical} {nCritical === 1 ? 'patient has' : 'patients have'} a critical value</b>
                  <small>Check these first, whatever their tier</small>
                </span>
              </button>
            )}

            <div className="mk-queue__filters" role="group" aria-label="Filter the list">
              <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>All <b>{items.length}</b></button>
              <button type="button" className={filter === 'critical' ? 'is-on' : ''} onClick={() => setFilter('critical')}>Critical <b>{nCritical}</b></button>
              <button type="button" className={filter === 'recheck' ? 'is-on' : ''} onClick={() => setFilter('recheck')}>Re-check <b>{nRecheck}</b></button>
            </div>

            <ol className="mk-queue__rows">
              {loading && <li className="mk-queue__none">Loading…</li>}
              {!loading && visible.length === 0 && <li className="mk-queue__none">{items.length ? 'No patients match this filter.' : 'Nobody is waiting.'}</li>}
              {visible.map((item) => {
                const a = alerts.get(item.id);
                const hasCritical = a.critical.length > 0;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={`mk-queue__row${selected?.id === item.id ? ' is-selected' : ''}${hasCritical ? ' has-critical' : ''}`}
                      data-tier={item.tier}
                      onClick={() => setSelectedId(item.id)}
                    >
                      <span className="mk-queue__row-rank">{items.indexOf(item) + 1}</span>
                      <span className="mk-queue__row-main">
                        <span className="mk-queue__row-name">{item.patient_name}</span>
                        <span className="mk-queue__row-sub">
                          {item.status === 'in_progress' ? 'In progress' : `Waiting ${item.wait_minutes} min`}
                          {item.escalated && !item.overridden ? ' · moved up' : ''}
                        </span>
                        {(hasCritical || a.recheck.length > 0) && (
                          <span className="mk-queue__chips">
                            {hasCritical && <span className="mk-chip mk-chip--critical"><Icon name="alert" size={12} strokeWidth={2.4} /> Critical · {a.critical.join(', ')}</span>}
                            {a.recheck.length > 0 && <span className="mk-chip mk-chip--recheck"><Icon name="recheck" size={12} strokeWidth={2.4} /> Re-check · {a.recheck.join(', ')}</span>}
                          </span>
                        )}
                      </span>
                      <StatusBadge status={item.tier} />
                    </button>
                  </li>
                );
              })}
            </ol>
            <p className="mk-queue__stamp" data-live={live}>
              <i /> {live ? 'Live' : 'Reconnecting, checking every 15s'}
              {updated && ` · updated ${updated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
            </p>
          </aside>

          <section className="mk-queue__detail" aria-label="Patient vitals review">
            <h2 className="mk-queue__detail-title">Patient vitals review</h2>
            {selected ? (
              <ReviewCard key={selected.id} item={selected} rank={items.indexOf(selected) + 1} onChanged={load} />
            ) : (
              <p className="mk-queue__none">Select a patient from the list when someone is waiting.</p>
            )}
          </section>
        </div>
      </div>
    </AdminLayout>
  );
}

function ReviewCard({ item, rank, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [tier, setTier] = useState(item.tier);
  const [reason, setReason] = useState('');
  const [confirmLower, setConfirmLower] = useState(false);

  const { critical, recheck } = cellStates(item);
  const belowFloor = item.escalation_tier && tierRank(tier) < tierRank(item.escalation_tier);
  const notes = (item.review_reasons || []).filter((r) => REVIEW_TEXT[r]).map((r) => REVIEW_TEXT[r]);

  async function run(fn) {
    setBusy(true);
    setError('');
    try {
      await fn();
      await onChanged();
      setOverriding(false);
      setReason('');
      setConfirmLower(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mk-review" data-tier={item.tier}>
      <div className="mk-review__head">
        <span className="mk-review__rank">{rank}</span>
        <div className="mk-review__who">
          <p className="mk-review__name">{item.patient_name}</p>
          <p className="mk-review__sub">
            {item.kiosk_id} · waiting {item.wait_minutes} min · {item.status === 'in_progress' ? 'in progress' : 'waiting'}
          </p>
        </div>
        <StatusBadge status={item.tier} />
      </div>

      {item.escalated && !item.overridden && (
        <p className="mk-review__moved">
          Moved up from <b>{item.model_tier}</b> to <b>{item.tier}</b> because of a critical value. Staff can still change it.
        </p>
      )}

      <div className="mk-review__vitals">
        {VITALS.map((v) => (
          <div key={v.id} className={`mk-review__vital${critical.has(v.id) ? ' is-critical' : ''}`}>
            <span>{v.label}</span>
            <strong>{v.show(item.vitals)}</strong>
            {recheck.has(v.id) && <RecheckTag text={recheck.get(v.id)} />}
          </div>
        ))}
        {item.body?.bmi != null && (
          <div className="mk-review__vital">
            <span>BMI</span>
            <strong>{item.body.bmi}</strong>
          </div>
        )}
      </div>

      {(item.critical_flags?.length > 0 || notes.length > 0) && (
        <div className="mk-review__alerts">
          {item.critical_flags.map((f) => (
            <div key={f} className="mk-review__critical">⚠ Critical value: {describeFlag(f, item.vitals)}</div>
          ))}
          {notes.map((n) => (
            <div key={n} className="mk-review__note">{n}</div>
          ))}
        </div>
      )}

      {item.overridden && (
        <p className="mk-review__override">
          Staff changed this from {item.override?.from} to {item.tier}: “{item.override?.reason}” ({item.override?.by})
        </p>
      )}

      <div className="mk-review__actions">
        {item.status === 'waiting' && <Button disabled={busy} onClick={() => run(() => setVisitStatus(item.id, 'in_progress'))}>Start</Button>}
        <Button variant="secondary" disabled={busy} onClick={() => run(() => setVisitStatus(item.id, 'done'))}>Mark done</Button>
        <Button variant="ghost" disabled={busy} onClick={() => setOverriding((x) => !x)}>Change urgency</Button>
      </div>

      {overriding && (
        <form
          className="mk-review__form"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => overrideTier(item.id, tier, reason, confirmLower));
          }}
        >
          <select value={tier} onChange={(e) => setTier(e.target.value)} aria-label="New urgency">
            {TIERS_HIGH_FIRST.map((t) => <option key={t}>{t}</option>)}
          </select>
          <input placeholder="Reason (required)" value={reason} onChange={(e) => setReason(e.target.value)} required minLength={5} />
          <Button type="submit" disabled={busy || reason.trim().length < 5 || (belowFloor && !confirmLower)}>Save</Button>
          <Button variant="ghost" onClick={() => setOverriding(false)}>Cancel</Button>
          {belowFloor && (
            <label className="mk-review__confirm">
              <input type="checkbox" checked={confirmLower} onChange={(e) => setConfirmLower(e.target.checked)} />
              This patient has critical values (minimum {item.escalation_tier}). I have checked and want a lower tier.
            </label>
          )}
        </form>
      )}
      {error && <p className="mk-queue__error" role="alert">{error}</p>}
    </div>
  );
}

/** Calm grey "please re-check" tag with the explanation one tap away. No red, no model jargon. */
function RecheckTag({ text }) {
  return (
    <span className="mk-tag" tabIndex={0}>
      Re-check {text}
      <span className="mk-tag__info" aria-hidden="true">ⓘ</span>
      <span className="mk-tag__tip" role="tooltip">
        This reading is outside the range the screening tool was built on, so the urgency level is a guide only. Please use your own judgment.
      </span>
    </span>
  );
}