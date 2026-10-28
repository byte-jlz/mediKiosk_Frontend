"""
sensors.py - SIMULATED readings for the old POST /api/vitals/scan endpoint.

The real sensors are no longer read here. They now belong to the kiosk
agent (MediKiosk_hardware/agent/kiosk_agent.py), which the backend hears
over MQTT (app/mqtt_bridge.py) and stores per kiosk session
(app/routers/sessions.py).

This file only keeps POST /api/vitals/scan working with fake values until
the frontend wizard switches to MQTT (step 4). After that, this file and
that endpoint can be deleted.
"""

import random
import time

from app.data import VITAL_RANGES

SCAN_DELAY_S = 1.4          # mimic the few seconds a real scan takes


def _simulated(vital_key: str, wait: bool = True) -> dict:
    r = VITAL_RANGES[vital_key]
    decimals = 1 if vital_key in ("bmi", "temperature") else 0
    value = round(random.uniform(r["min"], r["max"]), decimals)
    if wait:
        time.sleep(SCAN_DELAY_S)
    return {"value": value, "unit": r["unit"]}


def read_heart_rate() -> dict:
    return _simulated("heartRate")


def read_spo2() -> dict:
    return _simulated("spo2")


def read_heart_rate_spo2() -> dict:
    hr = _simulated("heartRate")
    return {"heartRate": hr, "spo2": _simulated("spo2", wait=False)}


def read_bmi() -> dict:
    return _simulated("bmi")


def read_temperature() -> dict:
    return _simulated("temperature")


def read_respiration() -> dict:
    return _simulated("respiration")


def read_blood_pressure() -> dict:
    r_sys, r_dia = VITAL_RANGES["systolic"], VITAL_RANGES["diastolic"]
    time.sleep(SCAN_DELAY_S)
    return {
        "systolic": round(random.uniform(r_sys["min"], r_sys["max"])),
        "diastolic": round(random.uniform(r_dia["min"], r_dia["max"])),
        "unit": "mmHg",
    }


SCAN_HANDLERS = {
    "heartRate": read_heart_rate,
    "spo2": read_spo2,
    "heartRateSpo2": read_heart_rate_spo2,
    "bmi": read_bmi,
    "bloodPressure": read_blood_pressure,
    "temperature": read_temperature,
    "respiration": read_respiration,
}
