"""
Kiosk sessions - one per check-in at a kiosk.

    POST /api/kiosk-sessions                 start a check-in -> {sessionId, ...}
    GET  /api/kiosk-sessions/{id}            readings so far + urgency
    POST /api/kiosk-sessions/{id}/complete   save it as the patient's check-in
    POST /api/kiosk-sessions/{id}/urgency    re-run urgency (e.g. after the model is added)
    GET  /api/kiosk-sessions                 recent sessions (admin), ?kioskId=&status=
    GET  /api/kiosks/{id}/agent              the kiosk agent's last status (online / busy)
    GET  /api/kiosks/{id}/results            the last scan results that kiosk sent

The readings in a session come ONLY from the kiosk agent (via MQTT ->
mqtt_bridge.py -> store.py). The tablet passes the sessionId along with
every scan command and never sends the numbers itself, so a check-in
can't be filled with made-up vitals from the browser.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app import store
from app.data import add_check_in, append_audit_event, find_kiosk
from app.mqtt_bridge import bridge, _activity

router = APIRouter()


class SessionCreate(BaseModel):
    kioskId: str
    patientId: Optional[str] = None      # None / "guest" = not signed in


class SessionComplete(BaseModel):
    allowIncomplete: bool = False        # save even if some vitals are missing


def _public(session: dict) -> dict:
    """Session as the API returns it (adds sessionId + what's still missing)."""
    return {
        "sessionId": session["_id"],
        **{k: v for k, v in session.items() if k != "_id"},
        "requiredVitals": store.REQUIRED_VITALS,
        "missingVitals": store.missing_vitals(session),
    }


def _get_or_404(session_id: str) -> dict:
    session = store.get_session(session_id)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/kiosk-sessions")
async def create_session(payload: SessionCreate):
    if not find_kiosk(payload.kioskId):
        raise HTTPException(status_code=404, detail="Kiosk not found")
    session = store.create_session(payload.kioskId, payload.patientId)
    _activity(payload.kioskId, "Check-in started", payload.patientId)
    return _public(session)


@router.get("/kiosk-sessions")
async def list_sessions(kioskId: Optional[str] = Query(None), status: Optional[str] = Query(None),
                        limit: int = Query(50, ge=1, le=500)):
    return [_public(s) for s in store.list_sessions(kioskId, status, limit)]


@router.get("/kiosk-sessions/{session_id}")
async def get_session(session_id: str):
    return _public(_get_or_404(session_id))


@router.post("/kiosk-sessions/{session_id}/urgency")
async def rerun_urgency(session_id: str):
    session = _get_or_404(session_id)
    if store.missing_vitals(session):
        raise HTTPException(status_code=409,
                            detail=f"Missing vitals: {store.missing_vitals(session)}")
    bridge.run_urgency(session)
    return _public(_get_or_404(session_id))


def _check_in_readings(readings: dict) -> dict:
    """Session readings -> the shape POST /api/vitals/check-in has always stored."""
    hr_spo2 = readings.get("heartRateSpo2") or {}
    bp = readings.get("bloodPressure")
    pick = lambda r: {"value": r["value"], "unit": r["unit"]} if r else None
    return {
        "heartRate": pick(hr_spo2.get("heartRate")),
        "spo2": pick(hr_spo2.get("spo2")),
        "bmi": pick(readings.get("bmi")),
        "temperature": pick(readings.get("temperature")),
        "bloodPressure": {"systolic": bp["systolic"], "diastolic": bp["diastolic"],
                          "unit": bp["unit"]} if bp else None,
        "respiration": pick(readings.get("respiration")),
    }


@router.post("/kiosk-sessions/{session_id}/complete")
async def complete_session(session_id: str, payload: Optional[SessionComplete] = None):
    session = _get_or_404(session_id)
    if session["status"] != "open":
        raise HTTPException(status_code=409, detail=f"Session is already {session['status']}")
    missing = store.missing_vitals(session)
    if not session["readings"]:
        raise HTTPException(status_code=409, detail="No readings yet")
    if missing and not (payload and payload.allowIncomplete):
        raise HTTPException(status_code=409, detail=f"Missing vitals: {missing}")
    if not missing and session["urgency"] is None:
        bridge.run_urgency(session)
        session = _get_or_404(session_id)

    check_in = add_check_in(session["patientId"] or "guest", session["kioskId"],
                            _check_in_readings(session["readings"]))
    check_in.update(sessionId=session_id, urgency=session["urgency"],
                    simulated=any(r.get("simulated") for r in session["readings"].values()))
    store.complete_session(session_id, check_in["id"])
    append_audit_event("CHECK-IN COMPLETE", f"{check_in['id']} ({session['kioskId']})")
    _activity(session["kioskId"], "Check-in completed", session["patientId"])
    return {"success": True, "checkInId": check_in["id"], "session": _public(_get_or_404(session_id)),
            "urgency": session["urgency"], "readings": check_in["readings"]}


@router.get("/kiosks/{kiosk_id}/agent")
async def get_agent_status(kiosk_id: str):
    if not find_kiosk(kiosk_id):
        raise HTTPException(status_code=404, detail="Kiosk not found")
    status = store.get_agent_status(kiosk_id)
    return {"kioskId": kiosk_id, "mqttConnected": bridge.connected,
            "agent": status, "online": bool(status and status.get("online"))}


@router.get("/kiosks/{kiosk_id}/results")
async def get_kiosk_results(kiosk_id: str, limit: int = Query(20, ge=1, le=200)):
    if not find_kiosk(kiosk_id):
        raise HTTPException(status_code=404, detail="Kiosk not found")
    return store.recent_results(kiosk_id, limit)
