# Medi-Kiosk — Frontend

React (Vite) frontend for the Medi-Kiosk capstone project. This is the **UI only** —
the backend (FastAPI) is being built separately by a teammate.

## What's in here

This project actually contains **3 separate front-ends**, matching the 3 pieces of
the Figma design:

| App | Folder | Route | Represents |
|---|---|---|---|
| Patient App | `src/patient-app/` | `/app` | The mobile app patients use on their own phone |
| Kiosk | `src/kiosk-app/` | `/kiosk` | The physical tablet/kiosk hardware in the clinic |
| Admin Console | `src/admin-console/` | `/admin` | The web dashboard clinical staff/admins use |

In real life these run on 3 different devices and a user would only ever see one.
For this demo, there's a small "DEMO SWITCHER" pill fixed at the top of the screen
so you can jump between all three easily — **that switcher is not part of the real
product**, just a convenience for showing your capstone.

## How to run it

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

## FastAPI backend scaffold

A matching FastAPI backend scaffold has been added under `backend/`. To run it locally:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend exposes the same API contracts the frontend services currently expect.

## Build status (as of this handoff)

- ✅ **Patient App** — fully built: Landing, Sign In, Sign Up, QR Login, the full
  7-step Vitals Wizard (Heart Rate → BMI → Temperature → Blood Pressure → SpO2 →
  Respiration → Results), Vitals Home, Profile, Settings. All buttons, forms, the
  wizard's scan simulation, and toggles are functional.
- ✅ **Kiosk App** — fully built: landscape Landing, Sign In, QR Scan, QR Display,
  and the same Vitals Wizard reused in a wide/landscape layout.
- ✅ **Admin Console** — fully built: Login, Dashboard (Overview), Staff Accounts
  (add/remove staff), Patient Records (view detail modal), Kiosks (deactivate/
  reactivate, add kiosk), Kiosks Activity (live-style feed), and Audit Logs
  (search + Export CSV, which downloads a real .csv file of the visible rows).

**All three apps in the Figma are now built and clickable end-to-end.**

## Connecting the real FastAPI backend

**Everything your backend teammate needs is in `src/services/`.** Each file in
that folder is the single "seam" between the UI and the backend:

- `authService.js` — login/signup/logout
- `vitalsService.js` — sensor readings + check-in submission (see the comment
  block at the top — it also explains how to wire up real sensors, polling vs.
  WebSocket)
- `patientsService.js` — patient records
- `staffService.js` — staff accounts
- `kiosksService.js` — kiosk list/status + dashboard stats
- `auditService.js` — audit logs + activity feeds

Every function has a comment directly above it describing the exact endpoint,
request body, and response shape it expects, e.g.:

```js
// EXPECTED BACKEND ENDPOINT: POST /api/vitals/check-in
// REQUEST BODY: { patientId, kioskId, readings: {...} }
// RESPONSE: { success, checkInId, summary }
```

To connect a real backend: replace the body of each function with a real
`fetch()`/`axios` call to that endpoint. **No screen/component needs to change** —
they only ever call these service functions, never mock data directly.

Mock data used by the services (until the backend is live) lives in `src/mocks/`.

## Design notes

Colors, type, and component patterns were taken directly from the Figma file
(Medi-Kiosk), not a generic template — see `src/index.css` for the full token
list (navy `#1e3a5f`, brand blue `#4a7ba9`, Playfair Display for headings/logo,
Inter for body text, and the color-coded vital icons: red=Heart Rate,
green=BMI, amber=Temperature, pink=Blood Pressure, blue=SpO2, olive=Respiration).
