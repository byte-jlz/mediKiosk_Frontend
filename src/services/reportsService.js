// ============================================================
// REPORTS SERVICE  (Super Admin: "Generate reports" + «extend» "export report")
// Backend: backend/app/routers/reports.py - Super Admin only.
// ============================================================
import { API_BASE_URL, getStaffToken, request } from './apiClient';

/** GET /api/reports/summary -> { triage, patientVolume, kioskUsage, generatedAt, ... } */
export const getReportSummary = () => request('GET', '/reports/summary');

/** Downloads GET /api/reports/export as a .csv file (the login token goes in the header). */
export async function downloadReportCsv() {
  const res = await fetch(`${API_BASE_URL}/api/reports/export`, {
    headers: { Authorization: `Bearer ${getStaffToken()}` },
  });
  if (!res.ok) throw new Error(`Export failed (${res.status})`);
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') || '')?.[1]
    || 'medikiosk-report.csv';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
