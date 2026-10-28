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
- `POST /api/vitals/scan` — **old, simulated only** (removed in step 4), one fake reading, `{ "vitalKey": "heartRate" }` → `{ value, unit }` (`"heartRateSpo2"` → `{ heartRate: {…}, spo2: {…} }` from a single MAX30102 pass)
  (or `{ systolic, diastolic, unit }` for `bloodPressure`)
- `POST /api/vitals/check-in`
- `GET /api/vitals/history?patientId=...`
- `POST /api/kiosk-sessions` — start a check-in at a kiosk: `{ "kioskId": "K-01", "patientId": "P-88401" }` → `{ sessionId, readings, missingVitals, urgency, ... }`
- `GET /api/kiosk-sessions/{id}` — readings the kiosk agent sent for that session + urgency
- `POST /api/kiosk-sessions/{id}/complete` — save it as the patient's check-in (409 if vitals are missing, unless `{ "allowIncomplete": true }`)
- `POST /api/kiosk-sessions/{id}/urgency` — re-run the urgency check
- `GET /api/kiosk-sessions?kioskId=&status=` — recent sessions
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
   -> app/urgency.py (once all 5 vitals are in) -> publishes medikiosk/<kiosk>/urgency
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
`{level: normal|attention|urgent, score, reasons, model, features}`. It runs
automatically when a session has all 5 vitals.

**Until the ML model exists, it uses simple placeholder thresholds** and says so
in `model` ("placeholder-rules (demo only, not clinically validated)"). To plug
in the real model: save it with joblib, put it in `backend/models/`, set
`URGENCY_MODEL_PATH=models/<file>.joblib`, and adjust `_ml_classify()` if needed.
The inputs (`FEATURE_ORDER`) and step-by-step instructions are at the top of the file.
If the model can't load or fails, the rules are used and `reasons` explains why.

## Storage

Everything is still **in memory** (`app/data.py`, `app/store.py`), so restarting
the server clears it. `app/store.py` keeps kiosk sessions and scan results as
MongoDB-style documents (with `_id`), so moving to MongoDB later means changing
only that file.

## Notes

- CORS is enabled to allow the frontend to call the API during local development.
- Replace the in-memory data and add persistence when moving to a production-ready backend.
