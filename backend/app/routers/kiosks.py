from fastapi import APIRouter, HTTPException
from typing import List
from app.schemas import KioskBase, KioskCreate, KioskStatusUpdate, KioskActivityEntry
from app.data import kiosks, find_kiosk, append_audit_event, kiosk_activity

router = APIRouter()

@router.get("/kiosks", response_model=List[KioskBase])
async def get_kiosks():
    return kiosks

@router.patch("/kiosks/{kiosk_id}", response_model=KioskBase)
async def set_kiosk_status(kiosk_id: str, payload: KioskStatusUpdate):
    kiosk = find_kiosk(kiosk_id)
    if not kiosk:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    kiosk.update({"status": payload.status})
    append_audit_event("KIOSK STATUS UPDATE", kiosk_id)
    return kiosk

@router.post("/kiosks", response_model=KioskBase)
async def add_kiosk(payload: KioskCreate):
    new_id = f"K-0{len(kiosks) + 1}"
    new_kiosk = {
        "id": new_id,
        "name": payload.name,
        "clinic": payload.clinic,
        "status": "Online",
        "uptime": "100%",
        "today": 0,
        "firmware": "2.4.1",
    }
    kiosks.append(new_kiosk)
    append_audit_event("KIOSK CREATE", new_id)
    return new_kiosk

@router.get("/kiosks/activity", response_model=List[KioskActivityEntry])
async def get_kiosk_activity():
    return kiosk_activity
