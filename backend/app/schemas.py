from typing import Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field

class TokenResponse(BaseModel):
    token: str

class PatientBase(BaseModel):
    id: str
    firstName: str
    lastName: str
    middleName: Optional[str] = ''
    age: Optional[int] = None
    gender: Optional[str] = None
    bloodType: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    lastVisit: Optional[str] = None

class PatientCreate(BaseModel):
    firstName: str
    lastName: str
    middleName: Optional[str] = ''
    address: str
    dob: str
    bloodType: str
    email: EmailStr
    password: str

class PatientRecord(PatientBase):
    visitHistory: Optional[List[Dict[str, str]]] = []

class StaffBase(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    clinic: str
    status: Optional[str] = 'Online'
    lastActive: Optional[str] = 'just now'
    initials: Optional[str] = None
    accessRole: Optional[str] = None        # "super_admin" | "clinic_staff" (app/security.py)
    accessRoleLabel: Optional[str] = None   # "Super Admin" | "Clinic Staff"
    # passwordHash is never part of this model, so it is never sent out

class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    role: str                                # job title, e.g. Nurse
    clinic: str
    accessRole: str = "clinic_staff"
    password: str = Field(..., min_length=8)

class StaffUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    clinic: Optional[str] = None
    status: Optional[str] = None
    lastActive: Optional[str] = None
    accessRole: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)   # set a new password

class KioskBase(BaseModel):
    id: str
    name: str
    clinic: str
    status: str
    uptime: str
    today: int
    firmware: str
    # filled in from the kiosk agent's MQTT status (see app/mqtt_bridge.py)
    agentOnline: Optional[bool] = None
    agentBusy: Optional[bool] = None
    agentSimulated: Optional[bool] = None
    lastSeen: Optional[float] = None

class KioskCreate(BaseModel):
    name: str
    clinic: str

class KioskStatusUpdate(BaseModel):
    status: str

class VitalsReading(BaseModel):
    value: float
    unit: str

class BloodPressureReading(BaseModel):
    systolic: int
    diastolic: int
    unit: str

class CheckInReadings(BaseModel):
    heartRate: VitalsReading
    bmi: VitalsReading
    temperature: VitalsReading
    bloodPressure: BloodPressureReading
    spo2: VitalsReading
    respiration: VitalsReading

class CheckInCreate(BaseModel):
    patientId: str
    kioskId: str
    readings: CheckInReadings

class CheckInResponse(BaseModel):
    success: bool
    checkInId: str
    readings: CheckInReadings

class ScanRequest(BaseModel):
    vitalKey: str

class AuditLogEntry(BaseModel):
    timestamp: str
    role: str
    actor: str
    target: str
    ip: str
    severity: str

class RecentActivityEntry(BaseModel):
    label: str
    meta: str
    status: str

class KioskActivityEntry(BaseModel):
    time: str
    kiosk: str
    event: str
    patient: str

class DashboardStats(BaseModel):
    clinicalStaff: int
    clinicalStaffDelta: str
    patientRecords: int
    patientRecordsDelta: str
    kiosksOnline: int
    kiosksTotal: int
    kiosksAcross: str
    checkInsToday: int
    checkInsDelta: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(TokenResponse):
    patient: Optional[PatientBase] = None
    staff: Optional[StaffBase] = None

class LogoutResponse(BaseModel):
    success: bool
