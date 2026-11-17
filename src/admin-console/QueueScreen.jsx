import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { watchQueue } from '../services/liveService';
import { getQueue, overrideTier, setVisitStatus } from '../services/clinicalService';
import Icon from '../components/Icon';
import {
  CONFIDENCE_CUTOFF, REVIEW_TEXT, TIER_ORDER, VITALS, alertsFor, cellStates, confidenceOf, describeFlag,
  formatSex, isUnsure, tierPercents, tierRank,
} from './vitalsDisplay';
import './QueueScreen.css';

const FALLBACK_MS = 15000;   // polling, only used while the live connection is down
const TIERS_HIGH_FIRST = [...TIER_ORDER].reverse();
const clock = (d, opts) => d.toLocaleTimeString([], opts);
const oneDecimal = (n) => Math.round(Number(n) * 10) / 10;   // 170.157 -> 170.2, 158 -> 158 (display only)

export default function QueueScreen() {
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState(null);
  const [filter, setFilter] = useState('all'); // all | critical | unsure
  const [live, setLive] = useState(false);
  const [below, setBelow] = useState(0);       // rows hidden under the fold of the list
  const listRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await getQueue();
      setItems(data.items.filter((i) => i.patient_ref)); // named patients only, no guests
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
  const nUnsure = items.filter(isUnsure).length;
  const visible = items.filter((i) => (filter === 'critical' ? alerts.get(i.id).critical.length > 0 : filter === 'unsure' ? isUnsure(i) : true));

  // "+N more below" under the list
  const measure = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const edge = el.scrollTop + el.clientHeight + 4;
    setBelow([...el.children].filter((li) => li.offsetTop + li.offsetHeight > edge + 8).length);
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, visible.length, loading]);

  return (
    <AdminLayout>
      <AdminHeader title="Patient queue" />
      <div className="mk-page mk-queue">
        {error && <p className="mk-queue__error" role="alert">{error}</p>}

        <div className="mk-queue__layout">
          <aside className="mk-queue__side" aria-label="Pending patient queue">
            <div className="mk-queue__side-head">
              <h2>Pending patients</h2>
              <span className="mk-queue__total">{items.length} in queue</span>
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
                <span className="mk-queue__attention-icon" aria-hidden="true">!</span>
                <b>{nCritical} {nCritical === 1 ? 'patient has' : 'patients have'} a critical value</b>
              </button>
            )}

            <div className="mk-queue__filters" role="group" aria-label="Filter the list">
              <button type="button" className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>All <b>{items.length}</b></button>
              <button type="button" className={filter === 'critical' ? 'is-on' : ''} onClick={() => setFilter('critical')}>With Critical Vital <b>{nCritical}</b></button>
              <button type="button" className={filter === 'unsure' ? 'is-on' : ''} onClick={() => setFilter('unsure')}>Low model confidence <b>{nUnsure}</b></button>
            </div>

            <ol className="mk-queue__rows" ref={listRef} onScroll={measure}>
              {loading && <li className="mk-queue__none">Loading…</li>}
              {!loading && visible.length === 0 && <li className="mk-queue__none">{items.length ? 'No patients match this filter.' : 'Nobody is waiting.'}</li>}
              {visible.map((item) => (
                <QueueRow
                  key={item.id}
                  item={item}
                  rank={items.indexOf(item) + 1}
                  critical={alerts.get(item.id).critical}
                  selected={selected?.id === item.id}
                  onSelect={() => setSelectedId(item.id)}
                />
              ))}
            </ol>
            {below > 0 && <p className="mk-queue__more">+{below} more below.</p>}
            <p className="mk-queue__stamp" data-live={live}>
              <i /> {live ? 'Live' : 'Reconnecting, checking every 15s'}
              {updated && ` · updated ${clock(updated, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
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

function QueueRow({ item, rank, critical, selected, onSelect }) {
  const probs = tierPercents(item);
  const unsure = isUnsure(item);
  return (
    <li>
      <button
        type="button"
        className={`mk-queue__row${selected ? ' is-selected' : ''}${critical.length ? ' has-critical' : ''}`}
        data-tier={item.tier}
        onClick={onSelect}
      >
        <span className="mk-queue__row-top">
          <span className="mk-queue__row-rank">{rank}</span>
          <span className="mk-queue__row-name">{item.patient_name}</span>
          <StatusBadge status={item.tier} />
        </span>
        <span className="mk-queue__row-meta">
          <span className="mk-queue__row-sub">
            {item.status === 'in_progress' ? 'In progress' : `Waiting ${item.wait_minutes} min`}
            {item.escalated && !item.overridden ? ' · moved up' : ''}
          </span>
          {unsure && <span className="mk-unsure"><i aria-hidden="true">?</i>Low model confidence</span>}
        </span>
        {probs && (
          <span className="mk-queue__pills">
            {probs.map((p) => (
              <span key={p.tier} className={`mk-pill${p.tier === item.model_tier ? ' is-predicted' : ''}`} data-tier={p.tier}>
                {p.tier} - {p.pct}%
              </span>
            ))}
          </span>
        )}
        {critical.length > 0 && (
          <span className="mk-chip mk-chip--critical"><Icon name="alert" size={12} strokeWidth={2.4} /> Critical · {critical.join(', ')}</span>
        )}
      </button>
    </li>
  );
}

function ReviewCard({ item, rank, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [overriding, setOverriding] = useState(false);
  const [tier, setTier] = useState(item.tier);
  const [reason, setReason] = useState('');
  const [confirmLower, setConfirmLower] = useState(false);

  const { critical } = cellStates(item);
  const belowFloor = item.escalation_tier && tierRank(tier) < tierRank(item.escalation_tier);
  const notes = (item.review_reasons || []).filter((r) => REVIEW_TEXT[r]).map((r) => REVIEW_TEXT[r]);
  const probs = tierPercents(item);
  const confidence = confidenceOf(item);
  const unsure = isUnsure(item);
  const arrived = new Date(item.captured_at);
  const body = item.body || {};

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
        <span className="mk-review__bar" />
        <div className="mk-review__who">
          <h3 className="mk-review__name"><span>{rank}</span> {item.patient_name}</h3>
          <p className="mk-review__sub">Kiosk {item.kiosk_id}</p>
        </div>
        <span className="mk-review__badges">
          {unsure && <span className="mk-unsure"><i aria-hidden="true">?</i>Low model confidence</span>}
          <StatusBadge status={item.tier} />
        </span>
      </div>

      {item.escalated && !item.overridden && (
        <p className="mk-review__moved">
          Moved up from <b>{item.model_tier}</b> to <b>{item.tier}</b> because of a critical value. Staff can still change it.
        </p>
      )}

      <div className="mk-review__section mk-review__card">
        <h4><small>Patient Profile</small></h4>
        <div className="mk-review__grid mk-review__grid--5 mk-review__grid--plain">
          <Fact label="Age" value={item.patient_age != null ? `${item.patient_age} yrs` : '—'} />
          <Fact label="Sex" value={formatSex(item.patient_sex)} />
          <Fact label="Height" value={body.height_cm != null ? `${oneDecimal(body.height_cm)} cm` : '—'} />
          <Fact label="Weight" value={body.weight_kg != null ? `${oneDecimal(body.weight_kg)} kg` : '—'} />
          <Fact label="BMI" value={body.bmi != null ? oneDecimal(body.bmi) : '—'} />
        </div>
        {/* <p className="mk-review__foot">For staff reference only. These don’t affect the tier, confidence or queue order.</p> */}
      </div>

      <div className="mk-review__section">
        <h4>Arrival</h4>
        <div className="mk-review__grid mk-review__grid--3 mk-review__grid--filled">
          <Fact label="Arrived" value={clock(arrived, { hour: 'numeric', minute: '2-digit' })} />
          <Fact label="Waiting" value={item.status === 'in_progress' ? 'In progress' : `${item.wait_minutes} min`} />
          <Fact label="Kiosk" value={item.kiosk_id} />
        </div>
      </div>

      <div className="mk-review__section mk-review__card">
        <div className="mk-review__result-head">
          <h4>Model confidence distribution</h4>
          {confidence != null && (
            <span className={`mk-confidence${unsure ? ' is-unsure' : ''}`} title={`Below ${CONFIDENCE_CUTOFF}% counts as low confidence`}>Confidence {confidence}%</span>
          )}
        </div>
        {probs ? (
          <div className="mk-bars">
            {probs.map((p) => (
              <div key={p.tier} className="mk-bars__row" data-tier={p.tier}>
                <span className={p.tier === item.model_tier ? 'is-predicted' : ''}>{p.tier}</span>
                <span className="mk-bars__track"><i style={{ width: `${p.pct}%` }} /></span>
                <b>{p.pct}%</b>
              </div>
            ))}
          </div>
        ) : (
          <p className="mk-review__foot">No probabilities were sent with this check-in.</p>
        )}
      </div>

      <div className="mk-review__section">
        <h4>Vital signs <small>· used by the model</small></h4>
        <div className="mk-review__grid mk-review__grid--vitals">
          {VITALS.map((v) => (
            <div key={v.id} className={`mk-vital${critical.has(v.id) ? ' is-critical' : ''}`}>
              <span>{v.label}</span>
              <VitalValue text={v.show(item.vitals)} />
              {critical.has(v.id) && <em className="mk-vital__flag" title={flagText(item, v)}>⚠ Critical</em>}
            </div>
          ))}
        </div>
      </div>

      {notes.length > 0 && (
        <div className="mk-review__alerts">
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

/** Hover text for a critical tile, e.g. "SpO₂ 88 % (91 or lower)". */
function flagText(item, vital) {
  return (item.critical_flags || [])
    .filter((f) => vital.keys.some((k) => f.startsWith(k)))
    .map((f) => describeFlag(f, item.vitals))
    .join('; ');
}

/** "118/76 mmHg" -> big number with a small unit */
function VitalValue({ text }) {
  const [value, ...unit] = text.split(' ');
  return <strong>{value}{unit.length > 0 && <small>{unit.join(' ')}</small>}</strong>;
}

function Fact({ label, value }) {
  return (
    <div className="mk-fact">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}