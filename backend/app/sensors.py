"""
Sensor integration layer — the bridge between the kiosk hardware
(MediKiosk_hardware) and the FastAPI backend the frontend already talks to.

Each `read_*` function is BLOCKING (it sleeps/polls for several seconds
while a sensor collects samples), so the vitals router must call these
through `starlette.concurrency.run_in_threadpool` rather than awaiting
them directly — see app/routers/vitals.py.

Two modes:

* REAL mode — used automatically when this process can import the
  Raspberry Pi GPIO/I2C libraries (board, busio, adafruit_vl53l0x,
  RPi.GPIO, hx711). That's only true when running ON the kiosk's
  Raspberry Pi with the wiring described in MediKiosk_hardware/README.md
  and with `pip install -r requirements-hardware.txt`.
* SIMULATED mode — the automatic fallback everywhere else (a dev laptop,
  CI, this sandbox). Returns plausible random values in the same ranges
  the frontend used to generate client-side, so the rest of the app keeps
  working without physical hardware attached.

Only Heart Rate, SpO2, and BMI (via height + weight) have real sensors
today. Temperature, Blood Pressure, and Respiration are always simulated
until those sensors are added — see the bottom of this file.
"""

import random
import threading
import time
from typing import Optional, Tuple

from app.data import VITAL_RANGES

# ---------------------------------------------------------------------
# Hardware import — falls back to SIMULATED mode if unavailable.
# ---------------------------------------------------------------------
try:
    import board
    import busio
    import adafruit_vl53l0x
    import RPi.GPIO as GPIO  # noqa: F401  # pyright: ignore[reportMissingModuleSource]  (Pi-only; imported for side effects / cleanup use)
    from hx711 import HX711

    from app.hardware import max30102, hrcalc

    HARDWARE_AVAILABLE = True
except (ImportError, NotImplementedError, RuntimeError):
    HARDWARE_AVAILABLE = False


# ---------------------------------------------------------------------
# Calibration constants — tune these on the physical kiosk.
# (Same defaults as MediKiosk_hardware/hardware/*.py / main.py)
# ---------------------------------------------------------------------
HX711_DOUT_PIN = 5
HX711_SCK_PIN = 6
SCALE_RAW_PER_GRAM = 1.0          # HX711 raw units per gram — set after weighing a known mass
SENSOR_MOUNT_MM: Optional[float] = None  # ToF sensor height above the floor (mm) — required for BMI

HEIGHT_SAMPLE_SECONDS = 6
WEIGHT_SAMPLE_SECONDS = 6
VITALS_SAMPLE_SECONDS = 15        # MAX30102 needs a longer window for a stable HR/SpO2 reading

_tare_lock = threading.Lock()
_tare_offset: Optional[float] = None


# ---------------------------------------------------------------------
# Simulated fallback
# ---------------------------------------------------------------------
def _simulated(vital_key: str) -> dict:
    r = VITAL_RANGES[vital_key]
    decimals = 1 if vital_key == "bmi" else 0
    value = round(random.uniform(r["min"], r["max"]), decimals)
    time.sleep(1.4)  # mimic the few seconds a real scan takes, like the old frontend mock
    return {"value": value, "unit": r["unit"]}


# ---------------------------------------------------------------------
# Real sensor reads (only called when HARDWARE_AVAILABLE)
# ---------------------------------------------------------------------
def _measure_height_mm(duration=HEIGHT_SAMPLE_SECONDS) -> Optional[float]:
    i2c = busio.I2C(board.SCL, board.SDA)
    try:
        tof = adafruit_vl53l0x.VL53L0X(i2c)
        tof.measurement_timing_budget = 200000
        samples = []
        t_end = time.time() + duration
        while time.time() < t_end:
            d = tof.range
            if 0 < d < 4000:  # drop obvious out-of-range junk
                samples.append(d)
            time.sleep(0.1)
        return sum(samples) / len(samples) if samples else None
    finally:
        i2c.deinit()


def _tare_scale(hx) -> float:
    tare = hx.get_raw_data(times=15)
    return sum(tare) / len(tare) if tare else 0.0


def _measure_weight_g(duration=WEIGHT_SAMPLE_SECONDS) -> Optional[float]:
    """
    NOTE: the original hardware/main.py tared interactively (prompting
    "keep the scale empty, press Enter"). A kiosk can't do that, so this
    tares once automatically on first use, assuming the platform is empty
    at that point (e.g. right after boot). Call reset_tare() below to
    re-tare on demand (e.g. from a staff/admin action) if it drifts.
    """
    global _tare_offset
    hx = HX711(dout_pin=HX711_DOUT_PIN, pd_sck_pin=HX711_SCK_PIN)
    hx.reset()

    with _tare_lock:
        if _tare_offset is None:
            _tare_offset = _tare_scale(hx)

    samples = []
    t_end = time.time() + duration
    while time.time() < t_end:
        raw = hx.get_raw_data(times=5)
        if raw:
            samples.append(sum(raw) / len(raw))

    if not samples:
        return None
    avg = sum(samples) / len(samples)
    return (avg - _tare_offset) / SCALE_RAW_PER_GRAM


def reset_tare():
    """Force the scale to re-tare on its next weigh-in. Call this once the platform is empty."""
    global _tare_offset
    with _tare_lock:
        _tare_offset = None


def _measure_hr_spo2(duration=VITALS_SAMPLE_SECONDS) -> Tuple[Optional[float], Optional[float]]:
    mx = max30102.MAX30102()
    hrs, spo2s = [], []
    t_end = time.time() + duration
    while time.time() < t_end:
        red, ir = mx.read_sequential()
        hr, hr_ok, spo2, spo2_ok = hrcalc.calc_hr_and_spo2(ir, red)
        if hr_ok and 30 < hr < 220:
            hrs.append(hr)
        if spo2_ok and 70 <= spo2 <= 100:
            spo2s.append(spo2)
    avg_hr = sum(hrs) / len(hrs) if hrs else None
    avg_spo2 = sum(spo2s) / len(spo2s) if spo2s else None
    return avg_hr, avg_spo2


# ---------------------------------------------------------------------
# Public API — one function per vital, called by app/routers/vitals.py
# ---------------------------------------------------------------------
def read_heart_rate() -> dict:
    if not HARDWARE_AVAILABLE:
        return _simulated("heartRate")
    hr, _spo2 = _measure_hr_spo2()
    if hr is None:
        raise RuntimeError("No valid heart-rate reading — check finger placement and retry.")
    return {"value": round(hr), "unit": VITAL_RANGES["heartRate"]["unit"]}


def read_spo2() -> dict:
    if not HARDWARE_AVAILABLE:
        return _simulated("spo2")
    _hr, spo2 = _measure_hr_spo2()
    if spo2 is None:
        raise RuntimeError("No valid SpO2 reading — check finger placement and retry.")
    return {"value": round(spo2), "unit": VITAL_RANGES["spo2"]["unit"]}


def read_heart_rate_spo2() -> dict:
    """One MAX30102 pass for the combined kiosk step — HR and SpO2 come from the same samples."""
    if not HARDWARE_AVAILABLE:
        hr, spo2 = _simulated("heartRate"), _simulated("spo2")
        return {"heartRate": hr, "spo2": spo2}
    hr, spo2 = _measure_hr_spo2()
    if hr is None or spo2 is None:
        raise RuntimeError("No valid heart-rate/SpO2 reading — check finger placement and retry.")
    return {
        "heartRate": {"value": round(hr), "unit": VITAL_RANGES["heartRate"]["unit"]},
        "spo2": {"value": round(spo2), "unit": VITAL_RANGES["spo2"]["unit"]},
    }


def read_bmi() -> dict:
    if not HARDWARE_AVAILABLE:
        return _simulated("bmi")

    dist_mm = _measure_height_mm()
    weight_g = _measure_weight_g()

    if SENSOR_MOUNT_MM is None:
        raise RuntimeError(
            "SENSOR_MOUNT_MM is not set — measure the ToF sensor's height above the "
            "floor and set it in app/sensors.py before BMI can be computed."
        )
    if dist_mm is None:
        raise RuntimeError("No valid height reading — check the ToF sensor and retry.")
    if weight_g is None:
        raise RuntimeError("No valid weight reading — check the HX711 wiring/calibration and retry.")

    height_cm = (SENSOR_MOUNT_MM - dist_mm) / 10
    if height_cm <= 0:
        raise RuntimeError("Height reading out of range — recheck the ToF sensor mount height.")

    height_m = height_cm / 100
    weight_kg = weight_g / 1000
    bmi = weight_kg / (height_m ** 2)
    return {"value": round(bmi, 1), "unit": VITAL_RANGES["bmi"]["unit"]}


# ---------------------------------------------------------------------
# Not wired to hardware yet — always simulated (see stepsConfig.js /
# VITAL_STEPS for the remaining vitals with no sensor today).
# ---------------------------------------------------------------------
def read_blood_pressure() -> dict:
    r_sys, r_dia = VITAL_RANGES["systolic"], VITAL_RANGES["diastolic"]
    time.sleep(1.4)
    return {
        "systolic": round(random.uniform(r_sys["min"], r_sys["max"])),
        "diastolic": round(random.uniform(r_dia["min"], r_dia["max"])),
        "unit": "mmHg",
    }


def read_temperature() -> dict:
    return _simulated("temperature")


def read_respiration() -> dict:
    return _simulated("respiration")


SCAN_HANDLERS = {
    "heartRate": read_heart_rate,
    "spo2": read_spo2,
    "heartRateSpo2": read_heart_rate_spo2,
    "bmi": read_bmi,
    "bloodPressure": read_blood_pressure,
    "temperature": read_temperature,
    "respiration": read_respiration,
}
