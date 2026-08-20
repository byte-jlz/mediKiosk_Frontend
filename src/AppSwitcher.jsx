import { useLocation, useNavigate } from 'react-router-dom';
import './AppSwitcher.css';

/**
 * DEV-ONLY convenience control. Not part of the real product — in production
 * these three apps live on separate devices/domains (patient's phone, the
 * kiosk hardware, and the admin's browser), so a user would never see all
 * three at once. This is just here to make demoing the capstone easier.
 */
export default function AppSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();

  const apps = [
    { key: 'app', label: '📱 Patient App', path: '/app' },
    { key: 'kiosk', label: '🖥 Kiosk', path: '/kiosk' },
    { key: 'admin', label: '💻 Admin Console', path: '/admin' },
  ];

  const active = apps.find((a) => location?.pathname?.startsWith(`/${a.key}`))?.key;

  return (
    <div className="mk-switcher">
      <span className="mk-switcher__label">DEMO SWITCHER</span>
      {apps.map((app) => (
        <button
          key={app.key}
          className={`mk-switcher__btn${active === app.key ? ' is-active' : ''}`}
          onClick={() => navigate(app.path)}
        >
          {app.label}
        </button>
      ))}
    </div>
  );
}
