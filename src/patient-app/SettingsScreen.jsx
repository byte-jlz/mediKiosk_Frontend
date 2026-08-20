import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentPatientProfile, logout, savePatientProfile } from '../services/authService';
import PhoneShell from './PhoneShell';
import './SettingsScreen.css';

const STORAGE_KEY = 'mkDarkMode';
const initialToggles = {
  pushNotifications: true,
  healthyReminder: true,
  darkMode: false,
  biometricLogin: true,
};

function loadInitialToggles() {
  const stored = localStorage.getItem(STORAGE_KEY);
  return {
    ...initialToggles,
    darkMode: stored === 'true',
  };
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const [toggles, setToggles] = useState(loadInitialToggles);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (toggles.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem(STORAGE_KEY, toggles.darkMode.toString());
  }, [toggles.darkMode]);

  function toggle(key) {
    setToggles((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleLogout() {
    await logout();
    navigate('/app');
  }

  function handlePasswordSave(e) {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      setFeedback('Password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedback('Passwords do not match.');
      return;
    }

    const currentProfile = getCurrentPatientProfile();
    if (!currentProfile) {
      setFeedback('No active patient account found.');
      return;
    }

    const updatedProfile = { ...currentProfile, password: newPassword };
    savePatientProfile(updatedProfile);
    setFeedback('Password updated successfully.');
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordForm(false);
  }

  return (
    <PhoneShell>
      <div className="mk-settings">
        <div className="mk-settings__scroll">
          <div className="mk-settings__header">
            <button className="mk-settings__close" onClick={() => navigate(-1)} aria-label="Close">
              ✕
            </button>
            <h1>Settings</h1>
          </div>

          <input className="mk-settings__search" placeholder="Search" disabled />

          <Section title="Notifications">
            <ToggleRow
              icon="🔔"
              label="Push notifications"
              sub="Receive alerts on device"
              checked={toggles.pushNotifications}
              onChange={() => toggle('pushNotifications')}
            />
            <ToggleRow
              icon="📱"
              label="Healthy reminder"
              sub="Daily check-in prompts"
              checked={toggles.healthyReminder}
              onChange={() => toggle('healthyReminder')}
            />
          </Section>

          <Section title="Appearance">
            <ToggleRow
              icon="☾"
              label="Dark mode"
              sub="Easier on the eyes at night"
              checked={toggles.darkMode}
              onChange={() => toggle('darkMode')}
            />
          </Section>

          <Section title="Security">
            <ToggleRow
              icon="🛡"
              label="Biometric login"
              sub="Use face ID / fingerprint"
              checked={toggles.biometricLogin}
              onChange={() => toggle('biometricLogin')}
            />
            <LinkRow icon="🔒" label="Change password" onClick={() => {
              setFeedback('');
              setShowPasswordForm((prev) => !prev);
            }} />
            <LinkRow icon="▦" label="Scan QR code" onClick={() => navigate('/app/qr-login')} />
            <LinkRow icon="📄" label="Privacy policy" />
          </Section>

          {showPasswordForm && (
            <form className="mk-settings__password-form" onSubmit={handlePasswordSave}>
              <label className="mk-settings__field">
                <span>New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
              </label>
              <label className="mk-settings__field">
                <span>Confirm password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                />
              </label>
              {feedback && <p className="mk-settings__feedback">{feedback}</p>}
              <button className="mk-settings__save" type="submit">Save password</button>
            </form>
          )}

          <Section title="More">
            <LinkRow icon="🌐" label="Language" trailing="ENGLISH" />
            <LinkRow icon="❓" label="Help & Support" />
          </Section>

          <button className="mk-settings__logout" onClick={handleLogout}>
            ⇥ Log out
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

function Section({ title, children }) {
  return (
    <div className="mk-settings__section">
      <p className="mk-settings__section-title">{title}</p>
      <div className="mk-settings__section-body">{children}</div>
    </div>
  );
}

function ToggleRow({ icon, label, sub, checked, onChange }) {
  return (
    <div className="mk-settings__row">
      <span className="mk-settings__row-icon">{icon}</span>
      <div className="mk-settings__row-text">
        <p className="mk-settings__row-label">{label}</p>
        <p className="mk-settings__row-sub">{sub}</p>
      </div>
      <button
        className={`mk-toggle${checked ? ' is-on' : ''}`}
        role="switch"
        aria-checked={checked}
        onClick={onChange}
      >
        <span className="mk-toggle__knob" />
      </button>
    </div>
  );
}

function LinkRow({ icon, label, trailing, onClick }) {
  return (
    <button className="mk-settings__row mk-settings__row--link" onClick={onClick}>
      <span className="mk-settings__row-icon">{icon}</span>
      <p className="mk-settings__row-label" style={{ flex: 1, textAlign: 'left' }}>
        {label}
      </p>
      {trailing && <span className="mk-settings__trailing">{trailing}</span>}
      <span className="mk-settings__chevron">›</span>
    </button>
  );
}
