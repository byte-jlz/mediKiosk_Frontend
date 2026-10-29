import { useCallback, useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import {
  activateKiosk,
  addKiosk,
  deactivateKiosk,
  getKiosks,
  updateKiosk,
} from '../services/kiosksService';
import { connectionLabel, fmtAgo } from './kioskFormat';
import './KiosksScreen.css';
import './PatientRecordsScreen.css';   // shared modal + form styles

/**
 * "Manage kiosk" (Super Admin) «extend» add kiosk / edit kiosk settings /
 * deactivate kiosk. The live connection comes from each kiosk's agent over MQTT.
 */
export default function KiosksScreen() {
  const [kiosks, setKiosks] = useState(null);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);      // null | 'new' | kiosk
  const [confirmOff, setConfirmOff] = useState(null); // kiosk to deactivate
  const [busy, setBusy] = useState('');

  const refresh = useCallback(() => {
    getKiosks()
      .then((rows) => {
        setKiosks(rows);
        setError('');
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 10000);   // keep the connection status fresh
    return () => clearInterval(t);
  }, [refresh]);

  async function toggle(k) {
    setBusy(k.id);
    try {
      if (k.status === 'Deactivated') await activateKiosk(k.id);
      else await deactivateKiosk(k.id);
      setConfirmOff(null);
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy('');
    }
  }

  return (
    <AdminLayout>
      <AdminHeader showSearch={false} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Manage Kiosks</p>
            <h1 className="mk-page__title">Kiosks</h1>
            <p className="mk-page__subtitle">
              Register new kiosks, edit their settings, and deactivate a kiosk to stop new check-ins on it.
            </p>
          </div>
          <div className="mk-page__actions">
            <Button onClick={() => setEditing('new')}>+ Add kiosk</Button>
          </div>
        </div>

        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}
        {!kiosks && !error && <p className="mk-kiosks__loading">Loading kiosks…</p>}
        {kiosks && kiosks.length === 0 && <p className="mk-kiosks__empty">No kiosks yet. Add your first one.</p>}

        {kiosks && kiosks.length > 0 && (
          <div className="mk-kiosks__grid">
            {kiosks.map((k) => {
              const off = k.status === 'Deactivated';
              return (
                <div key={k.id} className={`mk-kiosks__card${off ? ' mk-kiosks__card--removed' : ''}`}>
                  <div className="mk-kiosks__card-top">
                    <div className="mk-kiosks__icon">🖥</div>
                    <div className="mk-kiosks__title-block">
                      <p className="mk-kiosks__name">{k.name}</p>
                      <p className="mk-kiosks__meta">{k.id} · {k.clinic}</p>
                    </div>
                    <StatusBadge status={off ? 'Deactivated' : 'Active'} />
                  </div>
                  {k.notes && <p className="mk-kiosks__notes">{k.notes}</p>}
                  <div className="mk-kiosks__stats">
                    <div>
                      <p className="mk-kiosks__stat-label">Connection</p>
                      <p className="mk-kiosks__stat-value">{connectionLabel(k.connection)}</p>
                    </div>
                    <div>
                      <p className="mk-kiosks__stat-label">Check-ins today</p>
                      <p className="mk-kiosks__stat-value">{k.checkInsToday}</p>
                    </div>
                    <div>
                      <p className="mk-kiosks__stat-label">Last status</p>
                      <p className="mk-kiosks__stat-value">{fmtAgo(k.lastSeen)}</p>
                    </div>
                  </div>

                  {confirmOff?.id === k.id ? (
                    <div className="mk-kiosks__confirm">
                      <p className="mk-kiosks__confirm-text">
                        Deactivate {k.id}? Patients won&apos;t be able to start a check-in on it until you
                        activate it again.
                      </p>
                      <div className="mk-kiosks__actions">
                        <Button variant="ghost" onClick={() => setConfirmOff(null)}>Cancel</Button>
                        <Button variant="danger" disabled={busy === k.id} onClick={() => toggle(k)}>
                          Deactivate
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="mk-kiosks__actions">
                      <Button variant="ghost" onClick={() => setEditing(k)}>⚙ Settings</Button>
                      <button
                        type="button"
                        className="mk-kiosks__deactivate"
                        disabled={busy === k.id}
                        onClick={() => (off ? toggle(k) : setConfirmOff(k))}
                      >
                        {off ? '↻ Activate' : '⏻ Deactivate'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {editing && (
        <KioskFormModal
          kiosk={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            refresh();
          }}
        />
      )}
    </AdminLayout>
  );
}

function KioskFormModal({ kiosk, onClose, onSaved }) {
  const isEdit = Boolean(kiosk);
  const [form, setForm] = useState({
    name: kiosk?.name || '', clinic: kiosk?.clinic || '', notes: kiosk?.notes || '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (isEdit) {
        await updateKiosk(kiosk.id, form);
        onSaved();
      } else {
        setCreated(await addKiosk(form));
        setSaving(false);
      }
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (created) {
    return (
      <div className="mk-patients__modal-backdrop" onClick={onSaved}>
        <div className="mk-patients__modal mk-patients__modal--confirm" onClick={(e) => e.stopPropagation()}>
          <h2>Kiosk {created.id} added</h2>
          <p className="mk-patients__confirm-text">
            To connect the Raspberry Pi, start its agent with <code>KIOSK_ID={created.id}</code> and set{' '}
            <code>VITE_KIOSK_ID={created.id}</code> in the kiosk tablet&apos;s <code>.env</code>. It shows as
            online here once the agent connects.
          </p>
          <div className="mk-patients__form-actions">
            <Button onClick={onSaved}>Done</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mk-patients__modal-backdrop" onClick={onClose}>
      <form className="mk-patients__modal mk-patients__modal--confirm" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <button type="button" className="mk-patients__modal-close" onClick={onClose} aria-label="Close">✕</button>
        <h2>{isEdit ? `${kiosk.id} settings` : 'Add kiosk'}</h2>
        <p className="mk-patients__modal-subtitle">
          {isEdit ? 'The kiosk ID cannot be changed.' : 'The kiosk ID (K-01, K-02, …) is assigned when you save.'}
        </p>
        <div className="mk-patients__form-grid mk-kiosks__form-grid">
          <label className="mk-patients__form-field is-full">
            <span>Kiosk name <em aria-hidden="true">*</em></span>
            <input value={form.name} onChange={set('name')} required autoFocus placeholder="e.g. Lobby — West Wing" />
          </label>
          <label className="mk-patients__form-field is-full">
            <span>Clinic <em aria-hidden="true">*</em></span>
            <input value={form.clinic} onChange={set('clinic')} required placeholder="e.g. Northgate Clinic" />
          </label>
          <label className="mk-patients__form-field is-full">
            <span>Notes</span>
            <input value={form.notes} onChange={set('notes')} placeholder="Location details, hardware, contact…" />
          </label>
        </div>
        {error && <p className="mk-patients__form-error" role="alert">{error}</p>}
        <div className="mk-patients__form-actions">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : isEdit ? 'Save settings' : 'Add kiosk'}</Button>
        </div>
      </form>
    </div>
  );
}
