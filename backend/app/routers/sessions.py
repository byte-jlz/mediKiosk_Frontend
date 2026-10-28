"""
Kiosk sessions - one per check-in at a kiosk.

Kiosk endpoints (what the kiosk tablet calls - NO risk level in them):
    POST /api/kiosk-sessions                 start a check-in -> {sessionId, ...}
    GET  /api/kiosk-sessions/{id}            readings so far + the official heart rate
    POST /api/kiosk-sessions/{id}/complete   save it as the patient's check-in

Staff endpoints (admin console - includes the risk level and HR cross-check):
    GET  /api/admin/kiosk-sessions           recent sessions, ?kioskId=&status=
    GET  /api/admin/kiosk-sessions/{id}      one session, everything
    POST /api/admin/kiosk-sessions/{id}/urgency   re-run the risk check
    GET  /api/admin/check-ins                saved check-ins (newest first)

Other:
    GET  /api/kiosks/{id}/agent              the kiosk agent's last status (online / busy)
    GET  /api/kiosks/{id}/results            the last scan results that kiosk sent

The readings in a session come ONLY from the kiosk agent (via MQTT ->
mqtt_bridge.py -> store.py). The tablet passes the sessionId along with
every scan command and never sends the numbers itself.

NOTE: "staff only" is a promise of these routes, not yet a lock - there is
no staff login check on the backend yet. That comes with the security step.
"""

from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from app import store
from app.data import add_check_in, append_audit_event, check_ins, find_kiosk
from app.mqtt_bridge import bridge, _activity

router = APIRouter()


class SessionCreate(BaseModel):
    kioskId: str
    patientId: Optional[str] = None      # None / "guest" = not signed in


class SessionComplete(BaseModel):
    allowIncomplete: bool = False        # "Finish without it": save with missing steps


def _kiosk_view(session: dict) -> dict:
    """What the kiosk / patient may see: their readings, nothing about risk."""
    hr = (session.get("derived") or {}).get("heartRate")
    return {
        "sessionId": session["_id"],
        "kioskId": session["kioskId"],
        "patientId": session["patientId"],
        "status": session["status"],
        "createdAt": session["createdAt"],
        "readings": session["readings"],
        "heartRate": {"value": hr["value"], "unit": hr["unit"]} if hr else None,
        "failures": session["failures"],
        "checkInId": session["checkInId"],
        "requiredVitals": store.REQUIRED_VITALS,
        "missingVitals": store.missing_vitals(session),
    }


def _staff_view(session: dict) -> dict:
    """Everything, for the admin console."""
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


# ---------------------------------------------------------------- kiosk
@router.post("/kiosk-sessions")
async def create_session(payload: SessionCreate):
    if not find_kiosk(payload.kioskId):
        raise HTTPException(status_code=404, detail="Kiosk not found")
    patient_id = None if payload.patientId in (None, "", "guest") else payload.patientId
    session = store.create_session(payload.kioskId, patient_id)
    _activity(payload.kioskId, "Check-in started", patient_id)
    return _kiosk_view(session)


@router.get("/kiosk-sessions/{session_id}")
async def get_session(session_id: str):
    return _kiosk_view(_get_or_404(session_id))


def _check_in_readings(session: dict) -> dict:
    """Session readings -> the flat shape check-ins have always stored."""
    r = session["readings"]
    finger = r.get("respirationSpo2Hr") or {}
    bp = r.get("bloodPressure")
    hr = (session.get("derived") or {}).get("heartRate")
    pick = lambda x: {"value": x["value"], "unit": x["unit"]} if x else None
    return {
        "heartRate": {"value": hr["value"], "unit": hr["unit"], "source": hr["source"]} if hr else None,
        "spo2": pick(finger.get("spo2")),
        "respiration": pick(finger.get("respiration")),
        "bmi": pick(r.get("bmi")),
        "weight": pick((r.get("bmi") or {}).get("weight")),
        "height": pick((r.get("bmi") or {}).get("height")),
        "bloodPressure": {"systolic": bp["systolic"], "diastolic": bp["diastolic"],
                          "unit": bp["unit"]} if bp else None,
        "temperature": pick(r.get("temperature")),
    }


@router.post("/kiosk-sessions/{session_id}/complete")
async def complete_session(session_id: str, payload: Optional[SessionComplete] = None):
    session = _get_or_404(session_id)
    if session["status"] != "open":
        raise HTTPException(status_code=409, detail=f"Session is already {session['status']}")
    if not session["readings"]:
        raise HTTPException(status_code=409, detail="No readings yet")
    missing = store.missing_vitals(session)
    if missing and not (payload and payload.allowIncomplete):
        raise HTTPException(status_code=409, detail=f"Missing vitals: {missing}")

    urgency = None
    if not missing:                     # the risk check only runs on a complete check-in
        urgency = session["urgency"] or bridge.run_urgency(session)

    check_in = add_check_in(session["patientId"] or "guest", session["kioskId"],
                            _check_in_readings(session))
    check_in.update(
        sessionId=session_id,
        incomplete=bool(missing),
        missingVitals=missing,
        failures=session["failures"],
        heartRateCheck=(session.get("derived") or {}).get("heartRate"),   # staff only
        urgency=urgency,                                                    # staff only
        simulated=any(x.get("simulated") for x in session["readings"].values()),
    )
    store.complete_session(session_id, check_in["id"])
    append_audit_event("CHECK-IN COMPLETE" + (" (INCOMPLETE)" if missing else ""),
                       f"{check_in['id']} ({session['kioskId']})")
    _activity(session["kioskId"], "Check-in completed" + (" - incomplete" if missing else ""),
              session["patientId"])
    # The kiosk gets its readings back - no risk level, no cross-check details.
    return {"success": True, "checkInId": check_in["id"], "incomplete": bool(missing),
            "missingVitals": missing, "readings": check_in["readings"]}


# ---------------------------------------------------------------- staff
@router.get("/admin/kiosk-sessions")
async def list_sessions(kioskId: Optional[str] = Query(None), status: Optional[str] = Query(None),
                        limit: int = Query(50, ge=1, le=500)):
    return [_staff_view(s) for s in store.list_sessions(kioskId, status, limit)]


@router.get("/admin/kiosk-sessions/{session_id}")
async def get_session_staff(session_id: str):
    return _staff_view(_get_or_404(session_id))


@router.post("/admin/kiosk-sessions/{session_id}/urgency")
async def rerun_urgency(session_id: str):
    session = _get_or_404(session_id)
    if store.missing_vitals(session):
        raise HTTPException(status_code=409,
                            detail=f"Missing vitals: {store.missing_vitals(session)}")
    bridge.run_urgency(session)
    return _staff_view(_get_or_404(session_id))


@router.get("/admin/check-ins")
async def list_check_ins(limit: int = Query(50, ge=1, le=500)):
    return list(reversed(check_ins[-limit:]))


# ---------------------------------------------------------------- kiosks
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
