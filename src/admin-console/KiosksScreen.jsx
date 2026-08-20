import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import { getKiosks, setKioskStatus, addKiosk } from '../services/kiosksService';
import './KiosksScreen.css';

export default function KiosksScreen() {
  const [kiosks, setKiosks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKiosk, setNewKiosk] = useState({ name: '', clinic: '' });

  async function refresh() {
    setLoading(true);
    const data = await getKiosks();
    setKiosks(data);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleToggle(kiosk) {
    const nextStatus = kiosk.status === 'Deactivated' ? 'Online' : 'Deactivated';
    await setKioskStatus(kiosk.id, nextStatus);
    refresh();
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!newKiosk.name || !newKiosk.clinic) return;
    await addKiosk(newKiosk);
    setNewKiosk({ name: '', clinic: '' });
    setShowAddForm(false);
    refresh();
  }

  return (
    <AdminLayout>
      <AdminHeader searchValue="" onSearchChange={() => {}} />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <p className="mk-page__eyebrow">Manage Kiosks</p>
            <h1 className="mk-page__title">Kiosks</h1>
            <p className="mk-page__subtitle">
              Provision new kiosks, edit settings, and deactivate units across all clinics.
            </p>
          </div>
          <div className="mk-page__actions">
            <Button onClick={() => setShowAddForm((v) => !v)}>+ Add kiosks</Button>
          </div>
        </div>

        {showAddForm && (
          <form className="mk-kiosks__add-form" onSubmit={handleAdd}>
            <input
              placeholder="Kiosk name (e.g. Lobby — West Wing)"
              value={newKiosk.name}
              onChange={(e) => setNewKiosk((k) => ({ ...k, name: e.target.value }))}
            />
            <input
              placeholder="Clinic"
              value={newKiosk.clinic}
              onChange={(e) => setNewKiosk((k) => ({ ...k, clinic: e.target.value }))}
            />
            <Button type="submit">Save</Button>
          </form>
        )}

        {loading ? (
          <p className="mk-kiosks__loading">Loading kiosks…</p>
        ) : (
          <div className="mk-kiosks__grid">
            {kiosks.map((k) => (
              <div key={k.id} className="mk-kiosks__card">
                <div className="mk-kiosks__card-top">
                  <div className="mk-kiosks__icon">🖥</div>
                  <div className="mk-kiosks__title-block">
                    <p className="mk-kiosks__name">{k.name}</p>
                    <p className="mk-kiosks__meta">{k.id} · {k.clinic}</p>
                  </div>
                  <StatusBadge status={k.status} />
                </div>

                <div className="mk-kiosks__stats">
                  <div>
                    <p className="mk-kiosks__stat-label">Uptime</p>
                    <p className="mk-kiosks__stat-value">{k.uptime}</p>
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

                <div className="mk-kiosks__actions">
                  <Button variant="ghost">Settings</Button>
                  <button
                    className="mk-kiosks__deactivate"
                    onClick={() => handleToggle(k)}
                  >
                    {k.status === 'Deactivated' ? '↻ Reactivate' : '⏻ Deactivate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
