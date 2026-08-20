from fastapi import APIRouter, HTTPException
from app.schemas import LoginRequest, LoginResponse, LogoutResponse, PatientBase, StaffBase, PatientCreate
from app.data import current_patient, current_staff

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
async def staff_login(payload: LoginRequest):
    if not payload.email or not payload.password:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return {"token": "mock-staff-token", "staff": StaffBase(**current_staff, id="S-0000", email=payload.email)}

@router.post("/logout", response_model=LogoutResponse)
async def logout():
    return {"success": True}
