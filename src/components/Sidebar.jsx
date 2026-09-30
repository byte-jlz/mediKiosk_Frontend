import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentStaff, logout } from '../services/authService';
import './Sidebar.css';

const NAV_ITEMS = [
  { to: '/admin/dashboard', label: 'Overview', icon: '▦', end: true },
  { to: '/admin/staff', label: 'Staff accounts', icon: '👥' },
  { to: '/admin/patients', label: 'Patients', icon: '📄' },
  { to: '/admin/kiosks', label: 'Kiosks', icon: '🖥' },
  { to: '/admin/kiosks-activity', label: 'Kiosks Activity', icon: '📈' },
  { to: '/admin/audit-logs', label: 'Audit Logs', icon: '📋' },
];

export default function Sidebar() {
  return (
    <aside className="mk-sidebar">
      <div className="mk-sidebar__brand">
        <h1>Medi-Kiosk</h1>
        <p>Clinical Console</p>
      </div>

      <nav className="mk-sidebar__nav">
        <p className="mk-sidebar__section">Management</p>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => `mk-sidebar__link${isActive ? ' is-active' : ''}`}
          >
            <span className="mk-sidebar__icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}

export function AdminHeader({ searchValue, onSearchChange, searchPlaceholder = 'Search patients, kiosks, alert..' }) {
  const navigate = useNavigate();
  const [staff, setStaff] = useState(getCurrentStaff());
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const updateStaff = () => setStaff(getCurrentStaff());

    window.addEventListener('mk-admin-auth-updated', updateStaff);
    return () => window.removeEventListener('mk-admin-auth-updated', updateStaff);
  }, []);

  useEffect(() => {
    if (!showMenu) return undefined;

    const onClickOutside = (event) => {
      const target = event.target;
      if (!target.closest('.mk-admin-header__user')) {
        setShowMenu(false);
      }
    };

    window.addEventListener('click', onClickOutside);
    return () => window.removeEventListener('click', onClickOutside);
  }, [showMenu]);

  async function handleLogout() {
    await logout();
    setShowMenu(false);
    navigate('/admin');
  }

  return (
    <header className="mk-admin-header">
      <input
        className="mk-admin-header__search"
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange?.(e.target.value)}
      />
      <button className="mk-admin-header__bell" aria-label="Notifications">
        🔔<span className="mk-admin-header__bell-dot" />
      </button>
      <div className="mk-admin-header__user">
        <button
          type="button"
          className="mk-admin-header__user-trigger"
          onClick={() => setShowMenu((value) => !value)}
          aria-expanded={showMenu}
        >
          <div className="mk-admin-header__user-text">
            <p className="mk-admin-header__user-name">{staff.name?.toUpperCase()}</p>
            <p className="mk-admin-header__user-role">{staff.email || staff.role}</p>
          </div>
          <div className="mk-admin-header__avatar">{staff.initials}</div>
        </button>

        {showMenu && (
          <div className="mk-admin-header__user-menu">
            <button className="mk-admin-header__logout" type="button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
