"""
Vitals history for the patient app.

The old POST /api/vitals/scan (simulated readings) and POST /api/vitals/check-in
(readings sent by the browser) are gone: scans now go through the kiosk agent
over MQTT, and check-ins are saved from those readings with
POST /api/kiosk-sessions/{id}/complete (see routers/sessions.py).
"""

from typing import List

from fastapi import APIRouter, HTTPException, Query

from app.data import find_patient, vitals_history

router = APIRouter()


@router.get("/vitals/history", response_model=List[dict])
async def get_vitals_history(patientId: str = Query(..., alias="patientId")):
    # TODO(step 4b): return this patient's real check-ins instead of the demo list.
    if not find_patient(patientId):
        raise HTTPException(status_code=404, detail="Patient not found")
    return vitals_history
