import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import {
  getKiosks,
  getRemovedKiosks,
  setKioskStatus,
  setKioskClinic,
  addKiosk,
  removeKiosk,
  restoreKiosk,
} from '../services/kiosksService';
import { getClinics } from '../services/clinicsService';
import { getCurrentStaff } from '../services/authService';
import './KiosksScreen.css';

function formatRemovedAt(timestamp) {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export default function KiosksScreen() {
  const [kiosks, setKiosks] = useState([]);
  const [removedKiosks, setRemovedKiosks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKiosk, setNewKiosk] = useState({ id: '', name: '', clinic: '' });
  const [clinics, setClinics] = useState([]);
  // Only a super admin registers, removes and restores kiosks; an admin sees and can deactivate their own clinic's kiosks.
  const isSuper = getCurrentStaff()?.accessRole === 'super_admin';

  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    try {
      const [active, removed, list] = await Promise.all([getKiosks(), isSuper ? getRemovedKiosks() : Promise.resolve([]), isSuper ? getClinics() : Promise.resolve([])]);
      setKiosks(active);
      setRemovedKiosks(removed);
      setClinics(list);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function act(fn) {
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    }
    refresh();
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleToggle(kiosk) {
    const nextStatus = kiosk.status === 'Deactivated' ? 'Online' : 'Deactivated';
    await act(() => setKioskStatus(kiosk.id, nextStatus));
  }

  async function handleMove(kiosk, clinic) {
    if (!clinic || clinic === kiosk.clinic) return;
    if (!window.confirm(`Move ${kiosk.name} to ${clinic}? From now on its check-ins show for ${clinic}'s staff, not ${kiosk.clinic || 'its old clinic'}'s.`)) return;
    await act(() => setKioskClinic(kiosk.id, clinic));
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newKiosk.name || !newKiosk.clinic) return;
    await act(() => addKiosk(newKiosk));
    setNewKiosk({ id: '', name: '', clinic: '' });
    setShowAddForm(false);
  }

  function startRegister(kiosk) {            // a kiosk that connected by itself: open the form with its ID filled in
    setNewKiosk({ id: kiosk.id, name: '', clinic: '' });
    setShowAddForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleRemove(kiosk) {
    setConfirmRemoveId(null);
    await act(() => removeKiosk(kiosk.id));
  }

  async function handleRestore(kiosk) {
    await act(() => restoreKiosk(kiosk.id));
  }

  // the registered spelling of this kiosk's clinic (stored names may differ in capital letters), so the dropdown shows the right entry
  const clinicValue = (k) => clinics.find((c) => c.name.trim().toLowerCase() === (k.clinic || '').trim().toLowerCase())?.name || k.clinic || '';

  const isRemovedTab = activeTab === 'removed';
  const visibleKiosks = isRemovedTab ? removedKiosks : kiosks;

  return (
    <AdminLayout>
      <AdminHeader title="Kiosks" />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__subtitle">
              {isSuper ? 'Register kiosks, assign them to a clinic, and deactivate units across all clinics.' : "Your clinic's kiosks. You can deactivate or reactivate a unit."}
            </p>
          </div>
          {isSuper && !isRemovedTab && (
            <div className="mk-page__actions">
              <Button onClick={() => setShowAddForm((v) => !v)}>+ Add kiosks</Button>
            </div>
          )}
        </div>

        {error && <p className="mk-kiosks__empty" role="alert">{error}</p>}
        <div className="mk-kiosks__tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={!isRemovedTab}
            className={`mk-kiosks__tab${!isRemovedTab ? ' is-active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            Active kiosks <span className="mk-kiosks__tab-count">{kiosks.length}</span>
          </button>
          {isSuper && <button
            type="button"
            role="tab"
            aria-selected={isRemovedTab}
            className={`mk-kiosks__tab${isRemovedTab ? ' is-active' : ''}`}
            onClick={() => {
              setActiveTab('removed');
              setShowAddForm(false);
              setConfirmRemoveId(null);
            }}
          >
            Removed kiosks <span className="mk-kiosks__tab-count">{removedKiosks.length}</span>
          </button>}
        </div>

        {isSuper && showAddForm && !isRemovedTab && (
          <form className="mk-kiosks__add-form" onSubmit={handleAdd}>
            <input
              placeholder="Kiosk ID (exactly as set on the kiosk, e.g. K-01)"
              aria-label="Kiosk ID"
              value={newKiosk.id}
              onChange={(e) => setNewKiosk((k) => ({ ...k, id: e.target.value.trim() }))}
              pattern="[A-Za-z0-9_-]{1,40}"
              required
            />
            <input
              placeholder="Kiosk name (e.g. Lobby — West Wing)"
              value={newKiosk.name}
              onChange={(e) => setNewKiosk((k) => ({ ...k, name: e.target.value }))}
              required
            />
            <select
              aria-label="Clinic"
              value={newKiosk.clinic}
              onChange={(e) => setNewKiosk((k) => ({ ...k, clinic: e.target.value }))}
              required
            >
              <option value="">{clinics.length ? 'Choose a clinic' : 'No clinics yet: add one on the Clinics page'}</option>
              {clinics.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
            <Button type="submit">Save</Button>
          </form>
        )}

        {loading ? (
          <p className="mk-kiosks__loading">Loading kiosks…</p>
        ) : visibleKiosks.length === 0 ? (
          <p className="mk-kiosks__empty">
            {isRemovedTab
              ? 'No removed kiosks. Kiosks you remove will appear here and can be restored.'
              : 'No active kiosks. Add one, or restore a kiosk from the Removed tab.'}
          </p>
        ) : (
          <div className="mk-kiosks__grid">
            {visibleKiosks.map((k) => (
              <div
                key={k.id}
                className={`mk-kiosks__card${isRemovedTab ? ' mk-kiosks__card--removed' : ''}`}
              >
                <div className="mk-kiosks__card-top">
                  <div className="mk-kiosks__icon">🖥</div>
                  <div className="mk-kiosks__title-block">
                    <p className="mk-kiosks__name">{k.name}</p>
                    <p className="mk-kiosks__meta">{k.id} · {k.clinic}</p>
                  </div>
                  {isRemovedTab ? (
                    <span className="mk-kiosks__removed-badge">Removed</span>
                  ) : k.registered === false ? (
                    <span className="mk-kiosks__unreg-badge">Not registered</span>
                  ) : (
                    <StatusBadge status={k.status} />
                  )}
                </div>

                <div className="mk-kiosks__stats">
                  <div>
                    <p className="mk-kiosks__stat-label">Last seen</p>
                    <p className="mk-kiosks__stat-value">{k.lastSeen ? new Date(k.lastSeen).toLocaleTimeString() : '—'}</p>
                  </div>
                  <div>
                    <p className="mk-kiosks__stat-label">Today</p>
                    <p className="mk-kiosks__stat-value">{k.today}</p>
                  </div>
                  <div>
                    <p className="mk-kiosks__stat-label">Firmware</p>
                    <p className="mk-kiosks__stat-value">{k.firmware}</p>
                  </div>
                </div>

                {isRemovedTab ? (
                  <>
                    <p className="mk-kiosks__removed-at">Removed {formatRemovedAt(k.removedAt)}</p>
                    <div className="mk-kiosks__actions">
                      <Button variant="secondary" onClick={() => handleRestore(k)}>
                        ↺ Restore kiosk
                      </Button>
                    </div>
                  </>
                ) : confirmRemoveId === k.id ? (
                  <div className="mk-kiosks__confirm">
                    <p className="mk-kiosks__confirm-text">
                      Remove this kiosk? You can restore it from the Removed tab.
                    </p>
                    <div className="mk-kiosks__actions">
                      <Button variant="ghost" onClick={() => setConfirmRemoveId(null)}>
                        Cancel
                      </Button>
                      <Button variant="danger" onClick={() => handleRemove(k)}>
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : k.registered === false ? (
                  isSuper ? <>
                    <p className="mk-kiosks__unreg-note">
                      This kiosk connected but is not registered, so its check-ins are on hold (nothing is lost). Register it to accept them.
                    </p>
                    <div className="mk-kiosks__actions">
                      <Button onClick={() => startRegister(k)}>Register this kiosk</Button>
                    </div>
                  </> : null
                ) : (
                  <>
                    {isSuper && (
                      <label className="mk-kiosks__clinic-pick">
                        <span>Clinic</span>
                        <select value={clinicValue(k)} onChange={(e) => handleMove(k, e.target.value)}>
                          {!clinics.some((c) => c.name === clinicValue(k)) && (
                            <option value={k.clinic || ''} disabled>{k.clinic ? `${k.clinic} (not a registered clinic)` : 'Choose a clinic'}</option>
                          )}
                          {clinics.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                      </label>
                    )}
                    <div className="mk-kiosks__actions">
                      <button
                        className="mk-kiosks__deactivate"
                        onClick={() => handleToggle(k)}
                      >
                        {k.status === 'Deactivated' ? '↻ Reactivate' : '⏻ Deactivate'}
                      </button>
                    </div>
                    {isSuper && <button
                      type="button"
                      className="mk-kiosks__remove"
                      onClick={() => setConfirmRemoveId(k.id)}
                    >
                      🗑 Remove kiosk
                    </button>}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}