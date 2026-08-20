import { useNavigate, useLocation } from 'react-router-dom';

export default function BottomTabs() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { key: 'vitals', label: 'Vitals', icon: '⤳', path: '/app/vitals-home' },
    { key: 'profile', label: 'Profile', icon: '☺', path: '/app/profile' },
  ];

  return (
    <nav className="mk-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`mk-tabs__tab${location.pathname === tab.path ? ' is-active' : ''}`}
          onClick={() => navigate(tab.path)}
        >
          <span className="mk-tabs__icon">{tab.icon}</span>
          <span>{tab.label.toUpperCase()}</span>
        </button>
      ))}
    </nav>
  );
}
