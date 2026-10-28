from fastapi import APIRouter, HTTPException, Query
from fastapi.concurrency import run_in_threadpool
from typing import List
from app.schemas import CheckInCreate, CheckInResponse, ScanRequest
from app.data import find_patient, find_kiosk, vitals_history, add_check_in
from app import sensors

router = APIRouter()

@router.post("/vitals/scan")
async def scan_vital(payload: ScanRequest):
    """
    OLD, SIMULATED ONLY: returns a fake reading for `vitalKey` (see app/sensors.py).
    Real scans now go through the kiosk agent over MQTT and are stored per
    session (app/routers/sessions.py). Kept only until the frontend wizard
    switches to MQTT (step 4), then this endpoint will be removed.
    """
    handler = sensors.SCAN_HANDLERS.get(payload.vitalKey)
    if handler is None:
        raise HTTPException(status_code=400, detail=f"Unknown vitalKey '{payload.vitalKey}'")
    try:
        return await run_in_threadpool(handler)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

@router.post("/vitals/check-in", response_model=CheckInResponse)
async def submit_check_in(payload: CheckInCreate):
    if not find_patient(payload.patientId):
        raise HTTPException(status_code=404, detail="Patient not found")
    if not find_kiosk(payload.kioskId):
        raise HTTPException(status_code=404, detail="Kiosk not found")
    check_in = add_check_in(payload.patientId, payload.kioskId, payload.readings.dict())
    return {"success": True, "checkInId": check_in["id"], "readings": payload.readings}

@router.get("/vitals/history", response_model=List[dict])
async def get_vitals_history(patientId: str = Query(..., alias="patientId")):
    if not find_patient(patientId):
        raise HTTPException(status_code=404, detail="Patient not found")
    return vitals_history
