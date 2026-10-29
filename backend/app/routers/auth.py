from fastapi import APIRouter, Depends, HTTPException, Request
from app.schemas import LoginRequest, LoginResponse, LogoutResponse, PatientBase, StaffBase, PatientCreate
from app.data import append_audit_event, current_patient, find_staff_by_email
from app.security import create_token, current_staff, public_account, verify_password

router = APIRouter()

@router.post("/patient/login", response_model=LoginResponse)
async def patient_login(payload: LoginRequest):
    if not payload.email or not payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {
        "token": "mock-patient-token",
        "patient": PatientBase(**{**current_patient, "email": payload.email}),
    }

@router.post("/patient/signup", response_model=LoginResponse)
async def patient_signup(payload: PatientCreate):
    return {
        "token": "mock-patient-token",
        "patient": PatientBase(
            id=current_patient["id"],
            firstName=payload.firstName,
            lastName=payload.lastName,
            middleName=payload.middleName or "",
            address=payload.address,
            bloodType=payload.bloodType,
            email=payload.email,
            age=None,
            gender=None,
            lastVisit=None,
        ),
    }

@router.post("/patient/login-qr", response_model=LoginResponse)
async def patient_login_qr(qrToken: str):
    if not qrToken:
        raise HTTPException(status_code=400, detail="qrToken is required")
    return {"token": "mock-patient-token", "patient": PatientBase(**current_patient)}

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
    account["lastActive"] = "just now"
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
