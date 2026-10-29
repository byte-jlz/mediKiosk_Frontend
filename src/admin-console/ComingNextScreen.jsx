import AdminLayout from '../components/AdminLayout';
import { AdminHeader } from '../components/Sidebar';

/** Placeholder for pages that come in the next build parts. */
export default function ComingNextScreen({ title, useCase, part }) {
  return (
    <AdminLayout>
      <AdminHeader />
      <div className="mk-page">
        <div className="mk-page__title-row">
          <div>
            <h1 className="mk-page__title">{title}</h1>
            <p className="mk-page__subtitle">
              Use case: {useCase}. This page is built in part {part}.
            </p>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
