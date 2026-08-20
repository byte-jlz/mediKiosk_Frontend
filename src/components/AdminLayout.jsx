import Sidebar from './Sidebar';
import './AdminLayout.css';

export default function AdminLayout({ children }) {
  return (
    <div className="mk-admin-layout">
      <Sidebar />
      <div className="mk-admin-layout__content">{children}</div>
    </div>
  );
}
