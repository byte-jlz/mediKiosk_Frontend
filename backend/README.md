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

## Live ToF feed (MQTT)

The kiosk frontend can show a live readout of the VL53L0X Time-of-Flight
sensor (the "📡 ToF Live" screen at `/kiosk/tof-live`, and a small live card
on the kiosk's BMI step). The data flows:

```
VL53L0X --I2C--> tof_mqtt_publisher.py --MQTT:1883--> Mosquitto --WebSocket:9001--> React (src/services/tofLiveService.js)
```

On the Raspberry Pi:

```bash
# 1. Broker (once)
sudo apt install -y mosquitto mosquitto-clients
sudo cp mosquitto/medikiosk.conf /etc/mosquitto/conf.d/medikiosk.conf
sudo systemctl restart mosquitto

# 2. Publisher (from this backend/ folder, inside the venv)
pip install paho-mqtt
python tof_mqtt_publisher.py
```

Check it with `mosquitto_sub -t 'medikiosk/sensors/tof/#' -v`. On a laptop
without the sensor, the publisher automatically sends simulated readings
(or force it with `TOF_SIMULATE=1`). If the frontend runs on a different
machine than the Pi, set `VITE_MQTT_URL=ws://<pi-ip>:9001` in `.env`.

Only one program should talk to the VL53L0X at a time: stop the publisher
before running a real BMI scan through `POST /api/vitals/scan`, since both
read the same sensor.

## Notes

- The backend uses in-memory mock data to mirror the existing frontend demo.
- CORS is enabled to allow the frontend to call the API during local development.
- Replace the in-memory data and add persistence when moving to a production-ready backend.
