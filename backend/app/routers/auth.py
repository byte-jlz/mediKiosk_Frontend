import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, EmailStr, Field

from app import patients_db
from app.schemas import LoginRequest, LoginResponse, LogoutResponse, StaffBase
from app.data import append_audit_event, find_patient_by_email, find_patient_by_qr, find_staff_by_email
from app.security import (create_patient_token, create_token, current_staff, public_account,
                          verify_password)

router = APIRouter()

# ---------------------------------------------------------------- patients
# Kiosk + phone app sign-in against the patient registry (app/patients_db.py).
# Archived patients can't sign in. Wrong email / wrong password get the same reply.

class PatientSignup(BaseModel):
    firstName: str = Field(..., min_length=1, max_length=60)
    middleName: Optional[str] = Field("", max_length=60)
    lastName: str = Field(..., min_length=1, max_length=60)
    address: Optional[str] = Field("", max_length=200)
    dob: Optional[str] = None                     # the phone sign-up form calls it dob
    birthday: Optional[str] = None
    sex: Optional[str] = ""
    bloodType: Optional[str] = ""
    email: EmailStr
    password: str = Field(..., min_length=8)


class QrLogin(BaseModel):
    qrToken: str


def _patient_reply(p: dict) -> dict:
    return {"token": create_patient_token(p), "patient": patients_db.public(p)}


@router.post("/patient/login")
async def patient_login(payload: LoginRequest, request: Request):
    p = find_patient_by_email(payload.email)
    if p is None or not verify_password(payload.password, p.get("passwordHash")):
        append_audit_event("PATIENT LOGIN FAILED", payload.email, role=payload.email,
                           ip=_ip(request), severity="Warning")
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if p.get("status") == "archived":
        raise HTTPException(status_code=403, detail="This patient record is archived - please ask the clinic staff")
    append_audit_event("PATIENT LOGIN", p["id"], role=p["email"], ip=_ip(request))
    return _patient_reply(p)


@router.post("/patient/signup")
async def patient_signup(payload: PatientSignup, request: Request):
    if patients_db.email_taken(payload.email):
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    data = payload.model_dump()
    data["birthday"] = data.pop("birthday") or data.pop("dob", None) or ""
    data.pop("dob", None)
    password = data.pop("password")
    p = patients_db.create(data, password, via="app")
    append_audit_event("PATIENT SIGN-UP", p["id"], role=p["email"], ip=_ip(request))
    return _patient_reply(p)


@router.post("/patient/login-qr")
async def patient_login_qr(payload: QrLogin, request: Request):
    token = payload.qrToken.strip()
    if token.upper().startswith("MEDIKIOSK:"):
        token = token[len("MEDIKIOSK:"):]
    p = find_patient_by_qr(token)
    if p is None:
        append_audit_event("PATIENT QR LOGIN FAILED", "unknown QR code", ip=_ip(request),
                           severity="Warning")
        raise HTTPException(status_code=401, detail="QR code not recognized. Please ask the clinic staff for a new code.")
    if p.get("status") == "archived":
        raise HTTPException(status_code=403, detail="This patient record is archived - please ask the clinic staff")
    append_audit_event("PATIENT QR LOGIN", p["id"], role=p["email"], ip=_ip(request))
    return _patient_reply(p)


# ---------------------------------------------------------------- staff
@router.post("/staff/login", response_model=LoginResponse)
async def staff_login(payload: LoginRequest, request: Request):
    """Real staff login: bcrypt password check -> JWT (see app/security.py)."""
    account = find_staff_by_email(payload.email)
    # same message for "no such email" and "wrong password" (don't reveal which)
    if account is None or not verify_password(payload.password, account.get("passwordHash")):
        append_audit_event("LOGIN FAILED", payload.email, role=payload.email,
                           ip=_ip(request), severity="Warning")
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    if account.get("status") == "Suspended":
        append_audit_event("LOGIN BLOCKED (suspended)", account["id"], role=account["email"],
                           ip=_ip(request), severity="Warning")
        raise HTTPException(status_code=403, detail="This account is suspended - contact the Super Admin")
    account["lastLoginAt"] = round(time.time(), 3)
    append_audit_event("LOGIN", account["id"], role=account["email"], ip=_ip(request))
    return {"token": create_token(account), "staff": public_account(account)}


@router.get("/staff/me", response_model=StaffBase)
async def staff_me(me: dict = Depends(current_staff)):
    """Who is signed in (the console calls this on page load to check the token)."""
    return public_account(me)


@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request, me: dict = Depends(current_staff)):
    # JWTs are stateless: the browser forgets the token. We just log it.
    append_audit_event("LOGOUT", me["id"], role=me["email"], ip=_ip(request))
    return {"success": True}


def _ip(request: Request) -> str:
    return request.client.host if request.client else "-"
