import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentStaff, staffLogout, staffPath } from '../services/authService';
import { sessionEvent } from '../services/api';
import Icon from './Icon';
import logoFull from '../assets/logo-full.png';
import logoMark from '../assets/logo-mark-white.png';
import './Sidebar.css';

// What each role sees. Clinic staff work the queue; admins manage accounts and kiosks; only the super admin sees audit logs.
const NAV_ITEMS = [
  { page: 'queue', label: 'Queue', icon: 'queue', roles: ['clinic_staff'] },
  { page: 'dashboard', label: 'Overview', icon: 'grid', end: true, roles: ['clinic_staff', 'admin', 'super_admin'] },
  { page: 'patients', label: 'Patients', icon: 'patients', roles: ['clinic_staff', 'admin', 'super_admin'] },
  { page: 'staff', label: 'Staff', icon: 'staff', roles: ['admin', 'super_admin'] },
  { page: 'kiosks', label: 'Kiosks', icon: 'kiosk', roles: ['admin', 'super_admin'] },
  { page: 'kiosks-activity', label: 'Activity', icon: 'activity', roles: ['clinic_staff', 'admin', 'super_admin'] },
  { page: 'audit-logs', label: 'Audit', icon: 'audit', roles: ['super_admin'] },
];

export default function Sidebar() {
  const role = getCurrentStaff()?.accessRole;
  const items = NAV_ITEMS.filter((item) => item.roles.includes(role));
  return (
    <aside className="mk-sidebar">
      <img className="mk-sidebar__logo" src={logoMark} alt="MediKiosk" />
      <nav className="mk-sidebar__nav" aria-label="Main">
        {items.map((item) => (
          <NavLink
            key={item.page}
            to={staffPath(item.page)}
            end={item.end}
            className={({ isActive }) => `mk-sidebar__link${isActive ? ' is-active' : ''}`}
          >
            <span className="mk-sidebar__icon"><Icon name={item.icon} /></span>
            <span className="mk-sidebar__label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 15000); // shown to the minute
    return () => clearInterval(id);
  }, []);
  const date = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  const time = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  return (
    <div className="mk-admin-header__clock" aria-label="Current date and time">
      <span className="mk-admin-header__time">{time}</span>
      <span className="mk-admin-header__date">{date}</span>
    </div>
  );
}

export function AdminHeader({ title }) {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(getCurrentStaff() || {});
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const updateStaff = () => setStaff(getCurrentStaff() || {});
    window.addEventListener(sessionEvent('staff'), updateStaff);
    return () => window.removeEventListener(sessionEvent('staff'), updateStaff);
  }, []);

  useEffect(() => {
    if (!showMenu) return undefined;
    const onClickOutside = (event) => {
      if (!event.target.closest('.mk-admin-header__user')) setShowMenu(false);
    };
    window.addEventListener('click', onClickOutside);
    return () => window.removeEventListener('click', onClickOutside);
  }, [showMenu]);

  async function handleLogout() {
    await staffLogout();
    setShowMenu(false);
    navigate('/sign-in');
  }

  return (
    <header className="mk-admin-header">
      <div className="mk-admin-header__lead">
        {title && <h1 className="mk-admin-header__title">{title}</h1>}
      </div>
      <div className="mk-admin-header__right">
        <img className="mk-admin-header__wordmark" src={logoFull} alt="MediKiosk" />
        <span className="mk-admin-header__divider" aria-hidden="true" />
        <Clock />
      <div className="mk-admin-header__user">
        <button type="button" className="mk-admin-header__user-trigger" onClick={() => setShowMenu((v) => !v)} aria-expanded={showMenu}>
          <div className="mk-admin-header__avatar">{staff.initials}</div>
          <div className="mk-admin-header__user-text">
            <p className="mk-admin-header__user-name">{staff.name}</p>
            <p className="mk-admin-header__user-role">{staff.role}</p>
          </div>
          <Icon name="chevron" size={16} />
        </button>

        {showMenu && (
          <div className="mk-admin-header__user-menu">
            <button type="button" onClick={() => navigate('/change-password')}>
              <Icon name="key" size={16} /> Change password
            </button>
            <button type="button" className="mk-admin-header__logout" onClick={handleLogout}>
              <Icon name="logout" size={16} /> Log out
            </button>
          </div>
        )}
      </div>
      </div>
    </header>
  );
}