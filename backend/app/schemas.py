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

class StaffCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    clinic: str

class StaffUpdate(BaseModel):
    name: Optional[str]
    email: Optional[EmailStr]
    role: Optional[str]
    clinic: Optional[str]
    status: Optional[str]
    lastActive: Optional[str]

class KioskBase(BaseModel):
    id: str
    name: str
    clinic: str
    status: str
    uptime: str
    today: int
    firmware: str

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
