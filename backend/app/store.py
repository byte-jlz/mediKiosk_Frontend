"""
store.py - where kiosk sessions and agent results are kept.

For now everything lives IN MEMORY (like data.py), so a server restart
clears it. Each record is a plain dict shaped like a MongoDB document
(with an "_id"), and every read/write goes through the functions below.
When MongoDB is connected, only this file has to change:

    in memory now                 MongoDB later (e.g. with pymongo / motor)
    -------------------------     ------------------------------------------
    _sessions[sid] = doc          db.kiosk_sessions.insert_one(doc)
    _sessions.get(sid)            db.kiosk_sessions.find_one({"_id": sid})
    _results.append(doc)          db.scan_results.insert_one(doc)
    _agents[kiosk_id] = doc       db.kiosk_agents.replace_one({"_id": kiosk_id}, doc, upsert=True)

The MQTT bridge writes here from its own thread while FastAPI reads, so
everything is guarded by one lock.
"""

import copy
import threading
import time
from typing import Dict, List, Optional
from uuid import uuid4

from app.vitals_rules import derive

_lock = threading.Lock()
_sessions: Dict[str, dict] = {}     # "kiosk_sessions" collection
_results: List[dict] = []           # "scan_results" collection (every agent result, as received)
_agents: Dict[str, dict] = {}       # "kiosk_agents" collection (last status per kiosk)

MAX_RESULTS = 2000                  # in-memory only: keep the newest N results

# The check-in is complete once each of these has a good reading.
# (Names = the frontend wizard's step keys = the agent's vital names.)
# Kiosk order: BMI -> respiration + SpO2 + heart rate (one finger reading) ->
# blood pressure -> temperature.
REQUIRED_VITALS = ["bmi", "respirationSpo2Hr", "bloodPressure", "temperature"]


def _now() -> float:
    return round(time.time(), 3)


def _copy(doc):
    return copy.deepcopy(doc) if doc is not None else None


# ---------------------------------------------------------------- sessions
def create_session(kiosk_id: str, patient_id: Optional[str],
                   patient_name: Optional[str] = None) -> dict:
    doc = {
        "_id": f"SES-{uuid4().hex[:10].upper()}",
        "kioskId": kiosk_id,
        "patientId": patient_id,
        "patientName": patient_name,
        "status": "open",               # open -> completed
        "createdAt": _now(),
        "updatedAt": _now(),
        "readings": {},                 # vital -> latest good reading (+ resultId, ts, simulated)
        "derived": {"heartRate": None, "bmiCategory": None},  # worked out from the readings (vitals_rules.py)
        "failures": {},                 # vital -> latest error text (cleared by a good reading)
        "urgency": None,
        "checkInId": None,
    }
    with _lock:
        _sessions[doc["_id"]] = doc
    return _copy(doc)


def get_session(session_id: str) -> Optional[dict]:
    with _lock:
        return _copy(_sessions.get(session_id))


def list_sessions(kiosk_id: Optional[str] = None, status: Optional[str] = None,
                  limit: int = 50) -> List[dict]:
    with _lock:
        docs = [d for d in _sessions.values()
                if (kiosk_id is None or d["kioskId"] == kiosk_id)
                and (status is None or d["status"] == status)]
    docs.sort(key=lambda d: d["createdAt"], reverse=True)
    return [_copy(d) for d in docs[:limit]]


def missing_vitals(session: dict) -> List[str]:
    return [v for v in REQUIRED_VITALS if v not in session["readings"]]


def add_result(result: dict) -> Optional[dict]:
    """Save one agent result. If it belongs to an open session, update that
    session and return it (a copy); otherwise return None."""
    doc = {"_id": f"RES-{uuid4().hex[:10].upper()}", "receivedAt": _now(), **result}
    with _lock:
        _results.append(doc)
        del _results[:-MAX_RESULTS]
        session = _sessions.get(result.get("session") or "")
        if session is None or session["status"] != "open":
            return None
        vital = result.get("vital")
        if result.get("ok") and result.get("reading") is not None:
            session["readings"][vital] = {
                **result["reading"],
                "resultId": doc["_id"],
                "scanId": result.get("id"),
                "ts": result.get("ts"),
                "simulated": bool(result.get("simulated")),
            }
            session["failures"].pop(vital, None)
            session["derived"] = derive(session["readings"])
            session["urgency"] = None       # readings changed -> classify again
        elif not result.get("cancelled"):
            session["failures"][vital] = result.get("error")
        session["updatedAt"] = _now()
        return _copy(session)


def set_urgency(session_id: str, urgency: dict) -> None:
    with _lock:
        if session_id in _sessions:
            _sessions[session_id]["urgency"] = urgency
            _sessions[session_id]["updatedAt"] = _now()


def complete_session(session_id: str, check_in_id: str) -> None:
    with _lock:
        if session_id in _sessions:
            _sessions[session_id].update(status="completed", checkInId=check_in_id,
                                         updatedAt=_now())


def recent_results(kiosk_id: Optional[str] = None, limit: int = 50) -> List[dict]:
    with _lock:
        docs = [d for d in _results if kiosk_id is None or d.get("kiosk") == kiosk_id]
    return [_copy(d) for d in reversed(docs[-limit:])]


# ---------------------------------------------------------------- kiosk agents
def set_agent_status(kiosk_id: str, status: dict) -> None:
    with _lock:
        _agents[kiosk_id] = {"_id": kiosk_id, **status, "receivedAt": _now()}


def get_agent_status(kiosk_id: str) -> Optional[dict]:
    with _lock:
        return _copy(_agents.get(kiosk_id))


def all_agent_status() -> List[dict]:
    with _lock:
        return [_copy(d) for d in _agents.values()]
