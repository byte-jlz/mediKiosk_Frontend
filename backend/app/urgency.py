"""
urgency.py - decides how urgent a finished check-in is.

    classify(readings) -> {"level": "normal" | "medium" | "high",
                           "score": float, "reasons": [...], "model": "...",
                           "features": {...}}

Called by the MQTT bridge as soon as a session has all 4 kiosk steps, and
the result is published to medikiosk/<kiosk>/urgency. ONLY STAFF see it
(admin console) - the kiosk and the patient's phone never show it.

Levels (shown to staff as): normal = Normal, medium = Medium Risk, high = High Risk

=============================================================================
 FOR THE ML TEAMMATE - how to plug the real model in
=============================================================================
 1. Train on the 7 numbers in FEATURE_ORDER below (same names, same units).
 2. Save the model, e.g. joblib.dump(model, "urgency_model.joblib").
 3. Put the file in backend/models/ and set this before starting uvicorn:
        PowerShell:  $env:URGENCY_MODEL_PATH="models/urgency_model.joblib"
        bash:        export URGENCY_MODEL_PATH=models/urgency_model.joblib
    (a relative path is relative to the backend/ folder)
 4. Edit ONLY _ml_classify() below if your model works differently
    (e.g. returns numbers instead of "normal"/"medium"/"high", or
    needs scaling). Keep the return shape the same.
 5. pip install scikit-learn joblib   (and add them to backend/requirements.txt)

 If the file is missing or the model throws an error, the placeholder rules
 are used instead, and "model" + "reasons" say so - nothing crashes.
=============================================================================

The placeholder rules are rough adult thresholds for a DEMO only. They are
NOT clinically validated and must not be used to make medical decisions.
"""

import os
from typing import Dict, List, Optional, Tuple

from app.vitals_rules import official_heart_rate

LEVELS = ["normal", "medium", "high"]      # = Normal / Medium Risk / High Risk

# Inputs the model receives, IN THIS ORDER, with these units.
FEATURE_ORDER = [
    "heart_rate_bpm",       # beats per minute  - BP monitor pulse (finger sensor if no BP)
    "spo2_pct",             # blood oxygen, %          (MAX30102, finger step)
    "temperature_c",        # body temperature, °C     (MLX90614)
    "systolic_mmhg",        # blood pressure top       (BP monitor)
    "diastolic_mmhg",       # blood pressure bottom    (BP monitor)
    "respiration_bpm",      # breaths per minute       (MAX30102, finger step)
    "bmi",                  # kg/m²                    (scale + ToF)
]

MODEL_PATH = os.getenv("URGENCY_MODEL_PATH", "").strip()
_model = None
_model_error: Optional[str] = None


def build_features(readings: Dict) -> Dict[str, Optional[float]]:
    """Session readings (frontend shape) -> the flat numbers in FEATURE_ORDER."""
    def num(x):
        try:
            return float(x)
        except (TypeError, ValueError):
            return None

    finger = readings.get("respirationSpo2Hr") or {}
    bp = readings.get("bloodPressure") or {}
    hr = official_heart_rate(readings) or {}
    return {
        "heart_rate_bpm": num(hr.get("value")),
        "spo2_pct": num((finger.get("spo2") or {}).get("value")),
        "temperature_c": num((readings.get("temperature") or {}).get("value")),
        "systolic_mmhg": num(bp.get("systolic")),
        "diastolic_mmhg": num(bp.get("diastolic")),
        "respiration_bpm": num((finger.get("respiration") or {}).get("value")),
        "bmi": num((readings.get("bmi") or {}).get("value")),
    }


# =============================================================================
# The real model (filled in by the ML teammate)
# =============================================================================
def _load_model():
    """Load the model file once. Returns None if there's no model yet."""
    global _model, _model_error
    if _model is not None or _model_error is not None or not MODEL_PATH:
        return _model
    path = MODEL_PATH if os.path.isabs(MODEL_PATH) else os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))), MODEL_PATH)
    try:
        import joblib
        _model = joblib.load(path)
    except Exception as e:                       # missing file / library / bad pickle
        _model_error = f"{type(e).__name__}: {e}"
    return _model


def _ml_classify(model, features: Dict[str, Optional[float]]) -> Dict:
    """TODO(ML teammate): adjust this to your model. Must return
    {"level": one of LEVELS, "score": float 0..1, "reasons": [str, ...]}."""
    row = [[features[name] for name in FEATURE_ORDER]]
    label = model.predict(row)[0]
    if not isinstance(label, str):               # e.g. 0/1/2 -> normal/medium/high
        label = LEVELS[int(label)]
    score = 0.0
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(row)[0]
        score = float(max(probs))                # confidence of the chosen class
    return {"level": label, "score": score, "reasons": [f"model predicted '{label}'"]}


# =============================================================================
# Placeholder rules (used until the model exists, or if it fails)
# =============================================================================
# (feature, label, high_if, medium_if) - each test gets the value.
_RULES: List[Tuple[str, str, object, object]] = [
    ("spo2_pct", "SpO2",
     lambda v: v < 92, lambda v: v < 95),
    ("heart_rate_bpm", "Heart rate",
     lambda v: v < 40 or v > 130, lambda v: v < 50 or v > 100),
    ("temperature_c", "Temperature",
     lambda v: v >= 39.0 or v < 35.0, lambda v: v >= 37.5 or v < 36.0),
    ("systolic_mmhg", "Systolic BP",
     lambda v: v >= 180 or v < 90, lambda v: v >= 140 or v < 100),
    ("diastolic_mmhg", "Diastolic BP",
     lambda v: v >= 120, lambda v: v >= 90),
    ("respiration_bpm", "Respiratory rate",
     lambda v: v <= 8 or v >= 25, lambda v: v <= 11 or v >= 21),
    ("bmi", "BMI",
     lambda v: False, lambda v: v < 16 or v >= 40),
]


def _rule_classify(features: Dict[str, Optional[float]]) -> Dict:
    worst = 0
    reasons = []
    for key, label, is_high, is_medium in _RULES:
        v = features.get(key)
        if v is None:
            continue
        if is_high(v):
            worst = max(worst, 2)
            reasons.append(f"{label} {v:g} is in the high-risk range")
        elif is_medium(v):
            worst = max(worst, 1)
            reasons.append(f"{label} {v:g} is outside the normal range")
    return {"level": LEVELS[worst], "score": worst / 2,
            "reasons": reasons or ["all vitals within the normal ranges"]}


# =============================================================================
def classify(readings: Dict) -> Dict:
    features = build_features(readings)
    missing = [k for k in FEATURE_ORDER if features[k] is None]

    model = _load_model()
    if model is not None and not missing:
        try:
            out = _ml_classify(model, features)
            return {**out, "model": f"ml:{os.path.basename(MODEL_PATH)}", "features": features}
        except Exception as e:
            fallback = f"ML model failed ({type(e).__name__}: {e}) - used placeholder rules"
    elif model is not None:
        fallback = f"missing {missing} - ML model skipped, used placeholder rules"
    elif _model_error:
        fallback = f"could not load ML model ({_model_error}) - used placeholder rules"
    else:
        fallback = None

    out = _rule_classify(features)
    if fallback:
        out["reasons"] = out["reasons"] + [fallback]
    return {**out, "model": "placeholder-rules (demo only, not clinically validated)",
            "features": features}
