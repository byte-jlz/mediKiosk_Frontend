"""
vitals_rules.py - decisions that combine readings from more than one step.

HEART RATE (decided with the capstone adviser)
----------------------------------------------
Two devices measure the heart rate during a check-in:
  * the BP monitor's pulse (PUL)    - step "bloodPressure"     -> OFFICIAL
  * the MAX30102 finger sensor       - step "respirationSpo2Hr" -> cross-check

    both agree (within HR_AGREE_BPM)  -> BP pulse, no flag
    they disagree                     -> BP pulse, BOTH kept, mismatch=True (staff only:
                                         could be a camera misread of the BP screen,
                                         or an irregular heartbeat)
    no BP pulse (failed / skipped)    -> finger sensor value, source="finger_sensor"
    neither                           -> None
"""

from typing import Dict, Optional

HR_AGREE_BPM = 10


def _num(x) -> Optional[float]:
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


def official_heart_rate(readings: Dict) -> Optional[Dict]:
    bp_pulse = _num((readings.get("bloodPressure") or {}).get("pulse"))
    finger = _num(((readings.get("respirationSpo2Hr") or {}).get("heartRate") or {}).get("value"))
    if bp_pulse is None and finger is None:
        return None
    diff = abs(bp_pulse - finger) if bp_pulse is not None and finger is not None else None
    return {
        "value": round(bp_pulse if bp_pulse is not None else finger),
        "unit": "bpm",
        "source": "bp_monitor" if bp_pulse is not None else "finger_sensor",
        "bpMonitor": bp_pulse,
        "fingerSensor": finger,
        "difference": diff,
        "mismatch": diff is not None and diff > HR_AGREE_BPM,
    }


def derive(readings: Dict) -> Dict:
    """Everything worked out from more than one reading (kept in session["derived"])."""
    return {"heartRate": official_heart_rate(readings)}
