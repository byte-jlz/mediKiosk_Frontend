# Medi-Kiosk – staff console + patient app

React + Vite. Talks to the FastAPI backend (`MediKiosk_backend`).

## Run
1. Start the backend (see its README) on http://localhost:8000.
2. In this folder:
   ```
   npm install
   npm run dev
   ```
3. Open http://localhost:5173
   - Staff console: `/admin` (one login page; the menu and pages depend on the account's role)
   - Patient app: `/app`

If the backend is not at `http://localhost:8000`, copy `.env.example` to `.env` and set `VITE_API_BASE_URL`.
The backend's `CORS_ORIGINS` must include the address this site runs on.

## Roles (enforced by the backend; the menus just mirror it)
| Role | Lands on | Can do |
|---|---|---|
| Clinic Staff | Patient queue | queue, change urgency (with reason), patient records + vitals, kiosk activity |
| Admin | Overview | clinic-staff accounts, patients (no vitals), kiosks, delete patients |
| Super Admin | Overview | everything an admin can + admin accounts + audit logs (no vitals) |
| Patient (phone) | Vitals | own history (no urgency tier), own QR, profile, password |

New staff accounts get a one-time temporary password and must choose their own at first sign-in.

## Where things are
- `src/services/api.js` – the only place that calls the backend (token, errors, sign-out on expiry)
- `src/services/*Service.js` – one file per area
- `src/admin-console/` – staff screens (`QueueScreen` is new)
- `src/patient-app/` – phone screens (`MyQrScreen` shows the patient's permanent QR)

Removed on purpose: the kiosk-over-HTTP screens, mock data and the MQTT sensor demo. The kiosk flow will use the Pi's local agent/MQTT, not this website.
