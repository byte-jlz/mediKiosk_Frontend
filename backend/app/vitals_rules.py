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

BMI CATEGORY (decided with the team)
-----------------------------------
The BMI category is for STAFF and the PHONE APP only - the kiosk screen shows
just the BMI number (it is never in the kiosk endpoints).
Default cut-offs: WHO Asia-Pacific (2000), because the patients are Filipino.
The international WHO/CDC cut-offs are kept too; switch with BMI_STANDARD
below or the environment variable BMI_STANDARD=international.

    Asia-Pacific (default)            International (WHO / CDC)
    < 18.5      Underweight           < 18.5      Underweight
    18.5-22.9   Normal                18.5-24.9   Healthy weight
    23.0-24.9   Overweight (at risk)  25.0-29.9   Overweight
    25.0-29.9   Obese I               30.0-34.9   Obesity class I
    >= 30.0     Obese II              35.0-39.9   Obesity class II
                                      >= 40.0     Obesity class III (severe)

The category is worked out from the BMI rounded to 1 decimal, the same way
the kiosk agent rounds it, so the label always matches the number shown.
"""

import os
from typing import Dict, Optional

HR_AGREE_BPM = 10

BMI_STANDARD = os.getenv("BMI_STANDARD", "asia_pacific")   # or "international"

# (upper limit - BMI must be BELOW it, key, label); the last row has no limit.
BMI_CUTOFFS = {
    "asia_pacific": {
        "name": "WHO Asia-Pacific",
        "rows": [
            (18.5, "underweight", "Underweight"),
            (23.0, "normal", "Normal"),
            (25.0, "overweight", "Overweight (at risk)"),
            (30.0, "obese_1", "Obese I"),
            (None, "obese_2", "Obese II"),
        ],
    },
    "international": {
        "name": "WHO / CDC international",
        "rows": [
            (18.5, "underweight", "Underweight"),
            (25.0, "normal", "Healthy weight"),
            (30.0, "overweight", "Overweight"),
            (35.0, "obese_1", "Obesity class I"),
            (40.0, "obese_2", "Obesity class II"),
            (None, "obese_3", "Obesity class III (severe)"),
        ],
    },
}


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


def _range_text(lower, upper) -> str:
    if lower is None:
        return f"< {upper}"
    if upper is None:
        return f">= {lower}"
    return f"{lower}-{round(upper - 0.1, 1)}"


def bmi_category(bmi, standard: Optional[str] = None) -> Optional[Dict]:
    """BMI number -> {"key", "label", "range", "standard", "standardName"}, or None."""
    value = _num(bmi)
    if value is None or value <= 0:
        return None
    standard = standard or BMI_STANDARD
    if standard not in BMI_CUTOFFS:
        standard = "asia_pacific"
    table = BMI_CUTOFFS[standard]
    value = round(value, 1)
    lower = None
    for upper, key, label in table["rows"]:
        if upper is None or value < upper:
            return {"key": key, "label": label, "range": _range_text(lower, upper),
                    "bmi": value, "standard": standard, "standardName": table["name"]}
        lower = upper
    return None


def derive(readings: Dict) -> Dict:
    """Everything worked out from the readings (kept in session["derived"]).

    STAFF / PHONE ONLY - the kiosk view picks out just the heart-rate value.
    """
    return {
        "heartRate": official_heart_rate(readings),
        "bmiCategory": bmi_category((readings.get("bmi") or {}).get("value")),
    }
