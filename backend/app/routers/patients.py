"""
Patient records - SUPER ADMIN ONLY (use case "Manage patients records",
«extend» "View patient history"). From the paper: correct data entry errors,
archive old records, handle data privacy requests.

    GET    /api/patients?search=&archived=false     list (archived hidden unless archived=true)
    GET    /api/patients/{id}                       record + QR token + check-in history
    POST   /api/patients                            add (password -> bcrypt, new QR code)
    PATCH  /api/patients/{id}                       correct details (password optional)
    POST   /api/patients/{id}/archive | /restore    archive = hidden + can't sign in at the kiosk
    POST   /api/patients/{id}/qr-token              new QR code (the old one stops working)
    DELETE /api/patients/{id}                       privacy request: patient + ALL their check-ins

Every view and change is written to the audit trail.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, EmailStr, Field

from app import patients_db
from app.data import append_audit_event, now_iso, patients
from app.security import SUPER_ADMIN, require_roles

router = APIRouter()
only_admin = require_roles(SUPER_ADMIN)

SEXES = {"Male", "Female", "Other"}


class PatientIn(BaseModel):
    firstName: str = Field(..., min_length=1, max_length=60)
    middleName: Optional[str] = Field("", max_length=60)
    lastName: str = Field(..., min_length=1, max_length=60)
    birthday: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    sex: str
    bloodType: str = Field(..., max_length=10)
    address: str = Field(..., min_length=1, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8)


class PatientPatch(BaseModel):
    firstName: Optional[str] = Field(None, min_length=1, max_length=60)
    middleName: Optional[str] = Field(None, max_length=60)
    lastName: Optional[str] = Field(None, min_length=1, max_length=60)
    birthday: Optional[str] = Field(None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    sex: Optional[str] = None
    bloodType: Optional[str] = Field(None, max_length=10)
    address: Optional[str] = Field(None, min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)


def _ip(request: Request) -> str:
    return request.client.host if request.client else "-"


def _get(patient_id: str) -> dict:
    p = patients_db.get(patient_id)
    if p is None:
        raise HTTPException(status_code=404, detail="Patient not found")
    return p


def _check_sex(sex):
    if sex is not None and sex not in SEXES:
        raise HTTPException(status_code=422, detail=f"sex must be one of {sorted(SEXES)}")


def _record(p: dict) -> dict:
    return {**patients_db.public(p, with_qr=True), "history": patients_db.history(p["id"])}


@router.get("/patients")
async def list_patients(search: str = Query(""), archived: bool = Query(False),
                        me: dict = Depends(only_admin)):
    term = search.strip().lower()
    rows = []
    for p in patients:
        if (p.get("status") == "archived") != archived:
            continue
        name = " ".join(x for x in [p.get("firstName"), p.get("middleName"), p.get("lastName")] if x)
        if term and not (term in name.lower() or term in p["id"].lower()
                         or term in (p.get("email") or "").lower()):
            continue
        rows.append(patients_db.public(p))
    rows.sort(key=lambda r: (r.get("lastName") or "").lower())
    return rows


@router.get("/patients/{patient_id}")
async def get_patient(patient_id: str, request: Request, me: dict = Depends(only_admin)):
    p = _get(patient_id)
    append_audit_event("VIEW PATIENT RECORD", patient_id, role=me["email"], ip=_ip(request))
    return _record(p)


@router.post("/patients")
async def add_patient(payload: PatientIn, request: Request, me: dict = Depends(only_admin)):
    _check_sex(payload.sex)
    if patients_db.email_taken(payload.email):
        raise HTTPException(status_code=409, detail="A patient with this email already exists")
    data = payload.model_dump()
    password = data.pop("password")
    p = patients_db.create(data, password, via="admin")
    append_audit_event("PATIENT CREATE", p["id"], role=me["email"], ip=_ip(request))
    return _record(p)


@router.patch("/patients/{patient_id}")
async def update_patient(patient_id: str, payload: PatientPatch, request: Request,
                         me: dict = Depends(only_admin)):
    p = _get(patient_id)
    changes = payload.model_dump(exclude_unset=True)
    _check_sex(changes.get("sex"))
    if changes.get("email") and patients_db.email_taken(changes["email"], except_id=patient_id):
        raise HTTPException(status_code=409, detail="A patient with this email already exists")
    fields = sorted(k for k in changes if k != "password")
    pw = "password" in changes and changes["password"]
    patients_db.update(p, changes)
    what = ", ".join(fields) + (" + password" if pw else "") if (fields or pw) else "no changes"
    append_audit_event("PATIENT UPDATE", f"{patient_id} ({what})", role=me["email"], ip=_ip(request))
    return _record(p)


@router.post("/patients/{patient_id}/archive")
async def archive_patient(patient_id: str, request: Request, me: dict = Depends(only_admin)):
    p = _get(patient_id)
    p.update(status="archived", archivedAt=now_iso(), archivedBy=me["name"])
    append_audit_event("PATIENT ARCHIVE", patient_id, role=me["email"], ip=_ip(request))
    return _record(p)


@router.post("/patients/{patient_id}/restore")
async def restore_patient(patient_id: str, request: Request, me: dict = Depends(only_admin)):
    p = _get(patient_id)
    p.update(status="active", archivedAt=None, archivedBy=None)
    append_audit_event("PATIENT RESTORE", patient_id, role=me["email"], ip=_ip(request))
    return _record(p)


@router.post("/patients/{patient_id}/qr-token")
async def new_qr(patient_id: str, request: Request, me: dict = Depends(only_admin)):
    p = _get(patient_id)
    p["qrToken"] = patients_db.new_qr_token()
    append_audit_event("PATIENT NEW QR CODE", patient_id, role=me["email"], ip=_ip(request))
    return {"qrToken": p["qrToken"]}


@router.delete("/patients/{patient_id}")
async def delete_patient(patient_id: str, request: Request, me: dict = Depends(only_admin)):
    p = _get(patient_id)
    removed = patients_db.delete(p)
    append_audit_event("PATIENT DELETE (privacy request)", f"{patient_id} + {removed} check-in(s)",
                       role=me["email"], ip=_ip(request), severity="Warning")
    return {"success": True, "deletedCheckIns": removed}
