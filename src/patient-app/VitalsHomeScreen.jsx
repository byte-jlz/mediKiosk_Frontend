import { useEffect, useState, useMemo } from 'react';
import PhoneShell from './PhoneShell';
import BottomTabs from './BottomTabs';
import { getVitalsHistory } from '../services/vitalsService';
import { getCurrentPatientProfile } from '../services/authService';
import './VitalsHomeScreen.css';
import './BottomTabs.css';

export default function VitalsHomeScreen() {
  const currentPatient = getCurrentPatientProfile();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState(null);

  useEffect(() => {
    const patientId = currentPatient?.id || 'guest';
    const loadHistory = () => {
      getVitalsHistory(patientId).then((h) => {
        setHistory(h);
        setLoading(false);
      });
    };

    setLoading(true);
    loadHistory();
    // A new kiosk check-in adds another record to the list without a refresh.
    window.addEventListener('mk-admin-store-updated', loadHistory);

    return () => {
      window.removeEventListener('mk-admin-store-updated', loadHistory);
    };
  }, [currentPatient?.id]);

  const latest = history[0] || null;
  const lastSync = latest?.date || latest?.timestamp || 'No recent scan';

  const snapshotItems = useMemo(() => {
    if (!latest?.readings) {
      return [];
    }

    const readings = latest.readings;

    return [
      { label: 'HEART RATE', value: `${readings.heartRate?.value ?? '—'}`, unit: readings.heartRate?.unit || '' },
      { label: 'BLOOD PRESSURE', value: readings.bloodPressure ? `${readings.bloodPressure.systolic}/${readings.bloodPressure.diastolic}` : '—', unit: readings.bloodPressure?.unit || '' },
      { label: 'TEMPERATURE', value: `${readings.temperature?.value ?? '—'}`, unit: readings.temperature?.unit || '' },
      { label: 'SPO₂', value: `${readings.spo2?.value ?? '—'}`, unit: readings.spo2?.unit || '' },
      { label: 'BMI', value: `${readings.bmi?.value ?? '—'}`, unit: readings.bmi?.unit || '' },
      { label: 'RESPIRATION', value: `${readings.respiration?.value ?? '—'}`, unit: readings.respiration?.unit || '' },
    ];
  }, [latest]);

  const selectedItems = useMemo(() => {
    if (!selectedEntry?.readings) {
      return [];
    }

    const readings = selectedEntry.readings;

    return [
      { label: 'HEART RATE', value: `${readings.heartRate?.value ?? '—'}`, unit: readings.heartRate?.unit || '' },
      { label: 'BLOOD PRESSURE', value: readings.bloodPressure ? `${readings.bloodPressure.systolic}/${readings.bloodPressure.diastolic}` : '—', unit: readings.bloodPressure?.unit || '' },
      { label: 'TEMPERATURE', value: `${readings.temperature?.value ?? '—'}`, unit: readings.temperature?.unit || '' },
      { label: 'SPO₂', value: `${readings.spo2?.value ?? '—'}`, unit: readings.spo2?.unit || '' },
      { label: 'BMI', value: `${readings.bmi?.value ?? '—'}`, unit: readings.bmi?.unit || '' },
      { label: 'RESPIRATION', value: `${readings.respiration?.value ?? '—'}`, unit: readings.respiration?.unit || '' },
    ];
  }, [selectedEntry]);

  return (
    <PhoneShell>
      <div className="mk-vhome">
        <div className="mk-vhome__scroll">
          <div className="mk-vhome__top">
            <h1 className="mk-vhome__logo">MEDI-KIOSK</h1>
            <p className="mk-vhome__title">VITALS SNAPSHOT</p>
          </div>

          <div className="mk-vhome__sync-line">
            <span className="mk-vhome__sync-dot" />
            <span>Last sync — {lastSync}</span>
          </div>

          <div className="mk-vhome__snapshot-card">
            <div className="mk-vhome__snapshot-header">
              <div>
                <p className="mk-vhome__snapshot-label-card">Recent check-in</p>
                <p className="mk-vhome__snapshot-meta">{latest?.kioskName || 'No kiosk scanned yet'}</p>
              </div>
              <p className="mk-vhome__snapshot-time">{lastSync}</p>
            </div>

            {snapshotItems.length === 0 ? (
              <p className="mk-vhome__muted">No vital signs recorded yet for this account.</p>
            ) : (
              <div className="mk-vhome__snapshot-grid">
                {snapshotItems.map((item) => (
                  <div key={item.label} className="mk-vhome__snapshot-item">
                    <p className="mk-vhome__snapshot-item-label">{item.label}</p>
                    <p className="mk-vhome__snapshot-item-value">{item.value}</p>
                    <span className="mk-vhome__snapshot-item-unit">{item.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedEntry && (
            <div className="mk-vhome__detail-card">
              <div className="mk-vhome__detail-header">
                <div>
                  <p className="mk-vhome__detail-title">Check-in #{selectedEntry.recordNumber}</p>
                  <p className="mk-vhome__detail-meta">{selectedEntry.kioskName} • {selectedEntry.date || selectedEntry.timestamp}</p>
                </div>
                <button className="mk-vhome__view-btn mk-vhome__view-btn--secondary" onClick={() => setSelectedEntry(null)}>
                  Close
                </button>
              </div>

              <div className="mk-vhome__detail-grid">
                {selectedItems.map((item) => (
                  <div key={item.label} className="mk-vhome__detail-item">
                    <p className="mk-vhome__detail-item-label">{item.label}</p>
                    <p className="mk-vhome__detail-item-value">{item.value}</p>
                    <span className="mk-vhome__detail-item-unit">{item.unit}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mk-vhome__history-heading">
            <h2 className="mk-vhome__history-title">Check-in History</h2>
            {history.length > 0 && (
              <span className="mk-vhome__history-count">
                {history.length} {history.length === 1 ? 'record' : 'records'}
              </span>
            )}
          </div>
          <div className="mk-vhome__history-list">
            {loading && <p className="mk-vhome__muted">Loading history…</p>}
            {!loading && history.length === 0 && (
              <p className="mk-vhome__muted">No kiosk scans found yet. Your past vitals will appear here.</p>
            )}
            {history.map((entry, i) => (
              <div
                key={entry.id}
                className={`mk-vhome__history-row${selectedEntry?.id === entry.id ? ' mk-vhome__history-row--selected' : ''}`}
              >
                <div>
                  <p className="mk-vhome__history-kiosk">
                    Check-in #{entry.recordNumber}
                    {i === 0 && <span className="mk-vhome__history-latest">Latest</span>}
                  </p>
                  <p className="mk-vhome__history-date">{entry.kioskName}</p>
                  <p className="mk-vhome__history-date">{entry.date || entry.timestamp}</p>
                </div>
                <div className="mk-vhome__history-summary-value">
                  <p className="mk-vhome__history-value">{entry.primaryValue}</p>
                  <p className="mk-vhome__history-meta">{entry.status}</p>
                  <button
                    className="mk-vhome__view-btn"
                    onClick={() => setSelectedEntry(entry)}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <BottomTabs />
      </div>
    </PhoneShell>
  );
}
