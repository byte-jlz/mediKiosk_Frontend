# Medi-Kiosk FastAPI Backend

This folder contains a FastAPI backend scaffold for the Medi-Kiosk frontend demo.

## Install

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

The backend exposes the same contracts the frontend expects, including:

- `POST /api/patient/login`
- `POST /api/patient/signup`
- `POST /api/patient/login-qr`
- `POST /api/staff/login`
- `POST /api/logout`
- `GET /api/patients`
- `GET /api/patients/{id}`
- `GET /api/staff`
- `POST /api/staff`
- `DELETE /api/staff/{id}`
- `PATCH /api/staff/{id}`
- `GET /api/kiosks`
- `PATCH /api/kiosks/{id}`
- `POST /api/kiosks`
- `GET /api/dashboard/stats`
- `GET /api/dashboard/recent-activity`
- `GET /api/kiosks/activity`
- `GET /api/vitals/history?patientId=...`
Kiosk check-in (what the kiosk tablet calls - **never** includes the risk level):
- `POST /api/kiosk-sessions` — start a check-in: `{ "kioskId": "K-01", "patientId": "P-88401" }` (or `null` for a guest) → `{ sessionId, readings, missingVitals, ... }`
- `GET /api/kiosk-sessions/{id}` — readings the kiosk agent sent for that session + the official heart rate
- `POST /api/kiosk-sessions/{id}/complete` — save it as the patient's check-in (409 if a step is missing, unless `{ "allowIncomplete": true }` = "Continue without it")

Staff (admin console - includes the risk level and the heart-rate cross-check):
- `GET /api/admin/kiosk-sessions?kioskId=&status=` — recent sessions
- `GET /api/admin/kiosk-sessions/{id}` — one session, everything
- `POST /api/admin/kiosk-sessions/{id}/urgency` — re-run the risk check
- `GET /api/admin/check-ins` — saved check-ins, newest first

The old `POST /api/vitals/scan` and `POST /api/vitals/check-in` are gone: readings
only come from the kiosk agent now.
- `GET /api/kiosks/{id}/agent` — the kiosk agent's last MQTT status (online / busy)
- `GET /api/kiosks/{id}/results` — the last scan results that kiosk sent

## Kiosk agent over MQTT

The backend no longer reads any sensors. The kiosk Pi runs **one** program
that owns all of them, `MediKiosk_hardware/agent/kiosk_agent.py`, and the
backend listens to it over MQTT:

```
kiosk tablet --scan cmd (with sessionId)--> Mosquitto --> kiosk agent --> sensors
                                                 |
backend (app/mqtt_bridge.py) <--result/status----+
   -> app/store.py   (session readings, kiosk online/offline)
   -> app/urgency.py (once all 4 steps are in) -> publishes medikiosk/<kiosk>/urgency (staff only)
```

Every topic and message is documented in `MediKiosk_hardware/agent/README.md`.

* `app/mqtt_bridge.py` starts with the app. It subscribes to `medikiosk/+/result`
  and `medikiosk/+/status` (`+` = every kiosk). If no broker is running, the
  API still works and the bridge keeps retrying. Settings: `MQTT_HOST`,
  `MQTT_PORT`, `MQTT_USER`, `MQTT_PASSWORD`, `MQTT_ENABLED=0` to switch it off.
* A kiosk's `status` follows the agent (Online / Offline), **except** when an
  admin set it to Idle, Maintenance or Deactivated. `agentOnline`,
  `agentBusy`, `agentSimulated` and `lastSeen` are always there in `GET /api/kiosks`.
* Readings only get into a session from the agent, never from the browser.

### Test it on one laptop (no Pi)

```bash
# 1. broker (from the repo root)
mosquitto -c backend/mosquitto/medikiosk.conf -v
#   Windows: & "C:\Program Files\mosquitto\mosquitto.exe" -c backend\mosquitto\medikiosk.conf -v
# 2. simulated kiosk agent (in the MediKiosk_hardware repo)
SIMULATE=1 SIM_FAST=1 python agent/kiosk_agent.py
# 3. this backend
uvicorn app.main:app --reload --port 8000
```

Then open http://localhost:8000/docs, create a session with
`POST /api/kiosk-sessions`, and scan with the session ID, for example:
`python agent/try_agent.py` in the hardware repo, or any MQTT client sending
`{"action":"scan","id":"t1","vital":"temperature","session":"SES-...","auto_confirm":true}`
to `medikiosk/K-01/cmd`. `GET /api/kiosk-sessions/{id}` then shows the reading.

## Urgency model

`app/urgency.py` has one function, `classify(readings)`, which returns
`{level: normal|medium|high, score, reasons, model, features}` (shown to staff as
Normal / Medium Risk / High Risk - never to the patient). It runs automatically
when a session has all 4 kiosk steps, and NOT for incomplete check-ins.

**Until the ML model exists, it uses simple placeholder thresholds** and says so
in `model` ("placeholder-rules (demo only, not clinically validated)"). To plug
in the real model: save it with joblib, put it in `backend/models/`, set
`URGENCY_MODEL_PATH=models/<file>.joblib`, and adjust `_ml_classify()` if needed.
The inputs (`FEATURE_ORDER`) and step-by-step instructions are at the top of the file.
If the model can't load or fails, the rules are used and `reasons` explains why.

## Kiosk steps and the official heart rate

The kiosk does 4 steps (`REQUIRED_VITALS` in `app/store.py`): `bmi`,
`respirationSpo2Hr` (one 60 s finger reading: respiration + SpO2 + pulse),
`bloodPressure`, `temperature`.

Heart rate comes from two devices (`app/vitals_rules.py`): the **BP monitor's
pulse is official**, the finger sensor is the cross-check. If they differ by more
than 10 bpm, the BP pulse is still used but both values and a `mismatch` flag are
saved for staff (`heartRateCheck` on the check-in). If there is no BP pulse, the
finger sensor's value is used (`source: "finger_sensor"`).

## Staff login and roles

`app/security.py`: passwords are **bcrypt** hashes, login returns a **JWT**
(`POST /api/staff/login`), and the admin console sends it as
`Authorization: Bearer <token>`. Two roles, from the use-case diagrams:

| Role | `accessRole` | May open |
|---|---|---|
| Clinic Staff | `clinic_staff` | patient queue (`/api/admin/kiosk-sessions`), check-ins, patients |
| Super Admin | `super_admin` | staff accounts, patients, kiosks, kiosk status, audit logs, dashboard, check-ins |

The kiosk tablet's endpoints (`/api/kiosk-sessions...`) stay open. Demo accounts
(in `app/data.py`, change before real use): `superadmin@clinic.io` / `Admin@1234`,
and every clinic staff account / `Staff@1234` (S-1027 is suspended).
Set `JWT_SECRET` in the environment for real use; without it a random secret is
made at startup, so everyone has to sign in again after a backend restart.

## Super Admin (patients, kiosks, reports, audit trail)

All Super Admin only (use-case diagram, Figure 3.5):

- **Patients** (`app/patients_db.py`, `routers/patients.py`): the patient registry.
  bcrypt passwords, a QR token per patient (`MEDIKIOSK:<token>`), archive/restore
  (an archived patient can't sign in at the kiosk), delete for data privacy
  requests (also deletes all their check-ins). The kiosk and phone app sign
  patients in against it (`/api/patient/login`, `/login-qr`, `/signup`).
  Demo patients: `eleanor.whitefield@example.com`, `daniel.park@example.com`,
  `mae.tanaka@example.com`, all with password `Patient@1234`.
- **Kiosks** (`routers/kiosks.py`): add, edit settings (name, clinic, notes),
  deactivate (a deactivated kiosk can't start check-ins). `GET /api/kiosks/monitor`
  = live connection of every kiosk + MQTT broker + activity feed.
- **Reports** (`routers/reports.py`): triage data, patient volume and kiosk usage;
  `GET /api/reports/export` downloads it as CSV.
- **Audit trail** (`routers/audit.py`): every sign-in, every view of a patient
  record or vitals, every change - with who, when and from which IP.

Everything is still in memory, so a backend restart clears new patients,
check-ins and the audit trail (MongoDB is the next step).

## Clinic Staff queue, alerts and live dashboard

`app/triage.py` + `app/routers/triage.py` (Clinic Staff only). Every finished
check-in joins the **prioritized queue** (`GET /api/admin/queue`), ordered
High Risk → Medium Risk → Not rated (incomplete, risk check didn't run) →
Normal, longest wait first inside each level. `GET /api/admin/queue/{id}` gives
the vital signs details plus the patient's earlier check-ins (and is written
to the audit trail). `POST .../seen` takes the patient out of the queue;
`POST .../acknowledge` clears a High Risk **priority alert**.
Live updates go out over the WebSocket `/api/admin/live?token=<JWT>`
(needs the `websockets` package from requirements.txt).

## BMI category (staff + phone app only)

`app/vitals_rules.py` labels the BMI with **WHO Asia-Pacific** cut-offs by default
(Underweight < 18.5, Normal 18.5–22.9, Overweight (at risk) 23–24.9, Obese I
25–29.9, Obese II ≥ 30). The international WHO/CDC cut-offs are kept too — start
the backend with `BMI_STANDARD=international` to use them. The label is saved as
`bmiCategory` on the session (`derived`) and on the check-in. The kiosk endpoints
never return it: the kiosk screen shows only the BMI number.

## Storage

Everything is still **in memory** (`app/data.py`, `app/store.py`), so restarting
the server clears it. `app/store.py` keeps kiosk sessions and scan results as
MongoDB-style documents (with `_id`), so moving to MongoDB later means changing
only that file.

## Notes

- CORS is enabled to allow the frontend to call the API during local development.
- Replace the in-memory data and add persistence when moving to a production-ready backend.
