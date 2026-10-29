import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { getCurrentStaff, logout } from '../services/authService';
import { AUTH_EVENT } from '../services/apiClient';
import { CLINIC_STAFF, ROLE_LABELS, SUPER_ADMIN, menuFor } from '../admin-console/adminRoles';
import AlertsBell from '../admin-console/staff/AlertsBell';
import './Sidebar.css';

/** Re-reads the signed-in staff whenever login / logout / role refresh happens. */
function useCurrentStaff() {
  const [staff, setStaff] = useState(getCurrentStaff());
  useEffect(() => {
    const update = () => setStaff(getCurrentStaff());
    window.addEventListener(AUTH_EVENT, update);
    return () => window.removeEventListener(AUTH_EVENT, update);
  }, []);
  return staff;
}

export default function Sidebar() {
  const staff = useCurrentStaff();
  const role = staff.accessRole;
  const items = menuFor(role);

  return (
    <aside className="mk-sidebar">
      <div className="mk-sidebar__brand">
        <h1>Medi-Kiosk</h1>
        <p>{role === SUPER_ADMIN ? 'Administration Console' : 'Clinical Console'}</p>
      </div>

      <nav className="mk-sidebar__nav">
        <p className="mk-sidebar__section">{ROLE_LABELS[role] || 'Menu'}</p>
        {items.map((item) => (
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

export function AdminHeader({ searchValue, onSearchChange, searchPlaceholder = 'Search patients, kiosks, alert..', showSearch = true }) {
  const navigate = useNavigate();
  const staff = useCurrentStaff();
  const [showMenu, setShowMenu] = useState(false);

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
      {showSearch ? (
        <input
          className="mk-admin-header__search"
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
        />
      ) : (
        <div className="mk-admin-header__spacer" />
      )}
      {/* "Receive priority alerts" is a Clinic Staff use case (Figure 3.4) */}
      {staff.accessRole === CLINIC_STAFF && <AlertsBell />}
      <div className="mk-admin-header__user">
        <button
          type="button"
          className="mk-admin-header__user-trigger"
          onClick={() => setShowMenu((value) => !value)}
          aria-expanded={showMenu}
        >
          <div className="mk-admin-header__user-text">
            <p className="mk-admin-header__user-name">{staff.name?.toUpperCase()}</p>
            <p className="mk-admin-header__user-role">
              {ROLE_LABELS[staff.accessRole] || staff.role}
              {staff.email ? ` · ${staff.email}` : ''}
            </p>
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
