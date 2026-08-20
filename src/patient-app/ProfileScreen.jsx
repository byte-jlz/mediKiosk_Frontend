import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneShell from './PhoneShell';
import BottomTabs from './BottomTabs';
import { getCurrentPatientProfile, savePatientProfile } from '../services/authService';
import { mockCurrentPatient } from '../mocks/mockPatients';
import './ProfileScreen.css';
import './BottomTabs.css';

const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];

function loadProfile() {
  return getCurrentPatientProfile() || mockCurrentPatient;
}

export default function ProfileScreen() {
  const navigate = useNavigate();
  const [savedProfile, setSavedProfile] = useState(loadProfile);
  const [draftProfile, setDraftProfile] = useState(savedProfile);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (savedProfile) {
      savePatientProfile(savedProfile);
    }
  }, [savedProfile]);

  const activeProfile = editing ? draftProfile : savedProfile;
  const initials =
    (activeProfile.firstName?.[0] || '') +
    (activeProfile.lastName?.[0] || activeProfile.id?.[0] || '');

  const fields = [
    { label: 'Last Name', key: 'lastName', type: 'text' },
    { label: 'First Name', key: 'firstName', type: 'text' },
    { label: 'Middle Name', key: 'middleName', type: 'text' },
    { label: 'Address', key: 'address', type: 'text' },
    { label: 'Birthday', key: 'birthday', type: 'date' },
    { label: 'Blood Type', key: 'bloodType', type: 'select' },
    { label: 'Email', key: 'email', type: 'email' },
  ];

  function updateField(key, value) {
    setDraftProfile((prev) => ({ ...prev, [key]: value }));
  }

  function handleStartEdit() {
    setDraftProfile(savedProfile);
    setEditing(true);
  }

  function handleCancelEdit() {
    setDraftProfile(savedProfile);
    setEditing(false);
  }

  function handleSave() {
    setSavedProfile(draftProfile);
    setEditing(false);
  }

  return (
    <PhoneShell>
      <div className="mk-profile">
        <div className="mk-profile__scroll">
          <button
            className="mk-profile__settings"
            onClick={() => navigate('/app/settings')}
            aria-label="Settings"
          >
            ⚙
          </button>

          <div className="mk-profile__avatar">{initials.toUpperCase() || 'PT'}</div>
          <h1 className="mk-profile__name">
            {activeProfile.lastName?.toUpperCase()}, {activeProfile.firstName}
          </h1>
          <p className="mk-profile__id">Patient ID · {activeProfile.id}</p>

          <div className="mk-profile__fields">
            {fields.map((field) => (
              <div key={field.label} className="mk-profile__field">
                <span className="mk-profile__field-label">{field.label}</span>
                {editing ? (
                  field.type === 'select' ? (
                    <select
                      className="mk-profile__input"
                      value={activeProfile[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    >
                      <option value="">Select</option>
                      {BLOOD_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="mk-profile__input"
                      type={field.type}
                      value={activeProfile[field.key] || ''}
                      onChange={(e) => updateField(field.key, e.target.value)}
                    />
                  )
                ) : (
                  <span className="mk-profile__field-value">
                    {activeProfile[field.key] || '—'}
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mk-profile__save-bar">
            {editing ? (
              <>
                <button className="mk-profile__save" onClick={handleSave}>
                  Save changes
                </button>
                <button className="mk-profile__cancel" onClick={handleCancelEdit}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="mk-profile__edit" onClick={handleStartEdit}>
                Edit profile
              </button>
            )}
          </div>
        </div>

        <BottomTabs />
      </div>
    </PhoneShell>
  );
}
