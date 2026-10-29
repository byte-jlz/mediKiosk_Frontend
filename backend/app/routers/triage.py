"""
Clinic Staff endpoints (use-case diagram, Figure 3.4). All CLINIC STAFF only.

    GET  /api/admin/queue                          prioritized queue + counts + open alerts
    GET  /api/admin/records?search=                patient records: EVERY check-in, newest first,
                                                   the same list for every staff account
    GET  /api/admin/queue/{checkInId}              vital signs details + the patient's history
    POST /api/admin/queue/{checkInId}/seen         patient was called in -> leaves the queue
    POST /api/admin/queue/{checkInId}/acknowledge  staff saw the High Risk alert
    WS   /api/admin/live?token=<JWT>               live events for the dashboard:
         {"type": "hello"}                          connected
         {"type": "checkin", "id", "urgencyLevel", "checkIn"}  a new patient joined the queue
         {"type": "alert", "checkIn": {...}}        a High Risk patient joined the queue
         {"type": "queue", "id", "queueStatus", "patientName", "by", "acknowledged"?}
                                                    marked seen / alert acknowledged
         {"type": "ping"}                           keep-alive every 25 s

Opening a patient's details is written to the audit trail (who viewed which record).
"""

import asyncio
import time

from fastapi import APIRouter, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect

from app import triage
from app.data import append_audit_event
from app.security import CLINIC_STAFF, account_from_token, require_roles

router = APIRouter()
only_staff = require_roles(CLINIC_STAFF)


def _get(check_in_id: str) -> dict:
    c = triage.find_check_in(check_in_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Check-in not found")
    return c


@router.get("/admin/queue")
async def get_queue(me: dict = Depends(only_staff)):
    rows = triage.waiting_queue()
    return {
        "queue": rows,
        "counts": triage.queue_counts(rows),
        "alerts": [r for r in rows if r["alert"] and not r["alertAcknowledged"]],
    }


@router.get("/admin/records")
async def get_records(search: str = "", me: dict = Depends(only_staff)):
    """Patient records: every check-in (waiting + seen), the same for every staff account."""
    return triage.all_records(search)


@router.get("/admin/queue/{check_in_id}")
async def get_check_in(check_in_id: str, request: Request, me: dict = Depends(only_staff)):
    c = _get(check_in_id)
    append_audit_event("VIEW PATIENT VITALS", f"{check_in_id} ({c.get('patientId') or 'guest'})",
                       role=me["email"], ip=request.client.host if request.client else "-")
    return triage.detail(c)


@router.post("/admin/queue/{check_in_id}/seen")
async def mark_seen(check_in_id: str, me: dict = Depends(only_staff)):
    c = _get(check_in_id)
    if c.get("queueStatus", "waiting") != "waiting":
        raise HTTPException(status_code=409, detail="This patient was already marked as seen")
    c.update(queueStatus="seen", seenAt=round(time.time(), 3), seenBy=me["name"],
             seenById=me["id"])
    if triage.is_alert(c) and not c.get("alertAcknowledged"):
        c.update(alertAcknowledged=True, acknowledgedBy=me["name"], acknowledgedAt=c["seenAt"])
    append_audit_event("QUEUE: PATIENT SEEN", check_in_id, role=me["email"])
    triage.hub.publish({"type": "queue", "id": check_in_id, "queueStatus": "seen",
                        "patientName": triage.summary(c)["patientName"], "by": me["name"]})
    return triage.summary(c)


@router.post("/admin/queue/{check_in_id}/acknowledge")
async def acknowledge_alert(check_in_id: str, me: dict = Depends(only_staff)):
    c = _get(check_in_id)
    if not triage.is_alert(c):
        raise HTTPException(status_code=409, detail="This check-in is not a High Risk alert")
    if not c.get("alertAcknowledged"):
        c.update(alertAcknowledged=True, acknowledgedBy=me["name"],
                 acknowledgedAt=round(time.time(), 3))
        append_audit_event("ALERT ACKNOWLEDGED", check_in_id, role=me["email"])
        triage.hub.publish({"type": "queue", "id": check_in_id, "queueStatus": c.get("queueStatus"),
                            "acknowledged": True, "patientName": triage.summary(c)["patientName"],
                            "by": me["name"]})
    return triage.summary(c)


@router.websocket("/admin/live")
async def live(ws: WebSocket, token: str = ""):
    # Browsers can't put headers on a WebSocket, so the JWT comes as ?token=
    try:
        account = account_from_token(token)
    except HTTPException as e:
        await ws.close(code=4401 if e.status_code == 401 else 4403)
        return
    if account.get("accessRole") != CLINIC_STAFF:
        await ws.close(code=4403)
        return

    await ws.accept()
    q = triage.hub.subscribe()
    try:
        await ws.send_json({"type": "hello", "listeners": triage.hub.listeners})
        while True:
            try:
                event = await asyncio.wait_for(q.get(), timeout=25)
            except asyncio.TimeoutError:
                event = {"type": "ping"}
            await ws.send_json(event)
    except (WebSocketDisconnect, RuntimeError):
        pass
    finally:
        triage.hub.unsubscribe(q)
