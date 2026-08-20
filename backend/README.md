# Medi-Kiosk FastAPI Backend

This folder contains a FastAPI backend scaffold for the Medi-Kiosk frontend demo.

## Install

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

On the physical kiosk (Raspberry Pi), also install the hardware-only
dependencies so real sensor readings are used instead of simulated ones:

```bash
pip install -r requirements-hardware.txt
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
- `POST /api/vitals/scan` — triggers one sensor reading, `{ "vitalKey": "heartRate" }` → `{ value, unit }`
  (or `{ systolic, diastolic, unit }` for `bloodPressure`)
- `POST /api/vitals/check-in`
- `GET /api/vitals/history?patientId=...`

## Hardware integration

`app/sensors.py` wires the vitals wizard's `POST /api/vitals/scan` to the
sensors from the `MediKiosk_hardware` project (the ToF height sensor, the
HX711 load-cell scale, and the MAX30102 heart-rate/SpO2 sensor — their
driver code is copied into `app/hardware/`). Heart Rate, SpO2, and BMI
(computed from height + weight) are read from real hardware **when this
process can import the Raspberry Pi GPIO/I2C libraries** — i.e. when it's
actually running on the kiosk Pi with sensors wired up and
`requirements-hardware.txt` installed. On any other machine (a dev
laptop, CI, etc.) it automatically falls back to simulated readings, so
the rest of the app keeps working without physical hardware attached.

Temperature, Blood Pressure, and Respiration have no sensors yet — those
three are always simulated. See `app/sensors.py` for the per-vital
functions and the calibration constants that need to be set on the
physical kiosk (`SCALE_RAW_PER_GRAM`, `SENSOR_MOUNT_MM`).

## Notes

- The backend uses in-memory mock data to mirror the existing frontend demo.
- CORS is enabled to allow the frontend to call the API during local development.
- Replace the in-memory data and add persistence when moving to a production-ready backend.
