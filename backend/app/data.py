from typing import List, Dict
from uuid import uuid4

patients = [
    {
        "id": "P-88401",
        "lastName": "Whitefield",
        "firstName": "Eleanor",
        "middleName": "R.",
        "age": 64,
        "gender": "Female",
        "bloodType": "O+",
        "email": "eleanor.whitefield@example.com",
        "address": "14 Magnolia St, Northgate City",
        "lastVisit": "2026-05-02",
    },
    {
        "id": "P-88402",
        "lastName": "Park",
        "firstName": "Daniel",
        "middleName": "",
        "age": 26,
        "gender": "Female",
        "bloodType": "A-",
        "email": "daniel.park@example.com",
        "address": "92 Cedar Ave, Bayview",
        "lastVisit": "2026-04-27",
    },
    {
        "id": "P-88403",
        "lastName": "Redcloud",
        "firstName": "Aiyana",
        "middleName": "",
        "age": 16,
        "gender": "Female",
        "bloodType": "B+",
        "email": "aiyana.redcloud@example.com",
        "address": "5 Willow Ln, Eastside",
        "lastVisit": "2026-04-16",
    },
    {
        "id": "P-88404",
        "lastName": "Bertrand",
        "firstName": "Hugo",
        "middleName": "M.",
        "age": 50,
        "gender": "Male",
        "bloodType": "AB+",
        "email": "hugo.bertrand@example.com",
        "address": "77 Oak Dr, Northgate City",
        "lastVisit": "2026-03-30",
    },
    {
        "id": "P-88405",
        "lastName": "Tanaka",
        "firstName": "Mae",
        "middleName": "",
        "age": 34,
        "gender": "Female",
        "bloodType": "O-",
        "email": "mae.tanaka@example.com",
        "address": "31 Birch Rd, Bayview",
        "lastVisit": "2026-03-15",
    },
]

current_patient = {
    "id": "PX304",
    "lastName": "Odchigue",
    "firstName": "Althea",
    "middleName": "Shane",
    "address": "",
    "birthday": "",
    "bloodType": "",
    "email": "",
}

staff = [
    {
        "id": "S-1024",
        "name": "Dr. Amelia Chen",
        "email": "amelia.chen@clinic.io",
        "role": "Doctor",
        "clinic": "Northgate Clinic",
        "status": "Online",
        "lastActive": "2 mins ago",
        "initials": "DA",
    },
    {
        "id": "S-1025",
        "name": "Marcus Reyes",
        "email": "marcus.reyes@clinic.io",
        "role": "Nurse",
        "clinic": "Bayview Medical",
        "status": "Online",
        "lastActive": "14 mins ago",
        "initials": "MR",
    },
    {
        "id": "S-1026",
        "name": "Priya Natarjan",
        "email": "priya.n@clinic.io",
        "role": "Receptionist",
        "clinic": "Northgate Clinic",
        "status": "Online",
        "lastActive": "1 hr ago",
        "initials": "PN",
    },
    {
        "id": "S-1027",
        "name": "Dr. Henrick Olsen",
        "email": "henrik.o@clinic.io",
        "role": "Doctor",
        "clinic": "Eastside Family",
        "status": "Suspended",
        "lastActive": "3 days ago",
        "initials": "DH",
    },
    {
        "id": "S-1028",
        "name": "Sofia Mercado",
        "email": "sofia.m@clinic.io",
        "role": "Pharmacist",
        "clinic": "Eastside Family",
        "status": "Online",
        "lastActive": "27 mins ago",
        "initials": "SM",
    },
]

current_staff = {
    "name": "Dr. Arine Throne",
    "role": "Attending - ER",
    "initials": "AT",
}

kiosks = [
    {
        "id": "K-01",
        "name": "Lobby — North Gate",
        "clinic": "Northgate Clinic",
        "status": "Online",
        "uptime": "99.8%",
        "today": 142,
        "firmware": "2.4.1",
    },
    {
        "id": "K-02",
        "name": "Reception — Northgate",
        "clinic": "Northgate Clinic",
        "status": "Online",
        "uptime": "99.4%",
        "today": 98,
        "firmware": "2.4.1",
    },
    {
        "id": "K-03",
        "name": "Pharmacy — Bayview",
        "clinic": "Bayview Medical",
        "status": "Idle",
        "uptime": "97.1%",
        "today": 41,
        "firmware": "2.4.1",
    },
    {
        "id": "K-04",
        "name": "Lab Wing — Bayview",
        "clinic": "Bayview Medical",
        "status": "Maintenance",
        "uptime": "—",
        "today": 0,
        "firmware": "2.3.9",
    },
    {
        "id": "K-05",
        "name": "Entrance — Eastside",
        "clinic": "Eastside Family",
        "status": "Online",
        "uptime": "99.9%",
        "today": 67,
        "firmware": "2.4.1",
    },
    {
        "id": "K-06",
        "name": "Lobby — Eastside",
        "clinic": "Eastside Family",
        "status": "Online",
        "uptime": "98.9%",
        "today": 55,
        "firmware": "2.4.1",
    },
]

dashboard_stats = {
    "clinicalStaff": 6,
    "clinicalStaffDelta": "+2 this week",
    "patientRecords": 1421,
    "patientRecordsDelta": "+128 this week",
    "kiosksOnline": 3,
    "kiosksTotal": 6,
    "kiosksAcross": "Across 3 clinics",
    "checkInsToday": 312,
    "checkInsDelta": "+18% vs yesterday",
}

audit_logs = [
    {
        "timestamp": "2026-05-06 09:42:11",
        "role": "superadmin@clinic.io",
        "actor": "LOGIN",
        "target": "—",
        "ip": "10.0.4.21",
        "severity": "Online",
    },
    {
        "timestamp": "2026-05-06 09:38:02",
        "role": "superadmin@clinic.io",
        "actor": "STAFF CREATE",
        "target": "S-1029 Liam O'Connor",
        "ip": "10.0.4.21",
        "severity": "Online",
    },
    {
        "timestamp": "2026-05-05 17:12:44",
        "role": "amelia.chen@clinic.io",
        "actor": "PATIENT VIEW",
        "target": "P-88401 Eleanor Whitefield",
        "ip": "10.0.4.33",
        "severity": "Online",
    },
    {
        "timestamp": "2026-05-05 15:03:19",
        "role": "superadmin@clinic.io",
        "actor": "KIOSK DEACTIVATE",
        "target": "K-04 Lab Wing — Bayview",
        "ip": "10.0.4.21",
        "severity": "Online",
    },
    {
        "timestamp": "2026-05-04 08:55:07",
        "role": "henrik.o@clinic.io",
        "actor": "LOGIN FAILED",
        "target": "—",
        "ip": "10.0.9.12",
        "severity": "Online",
    },
    {
        "timestamp": "2026-05-03 11:20:51",
        "role": "superadmin@clinic.io",
        "actor": "STAFF SUSPEND",
        "target": "S-1027 Dr. Henrick Olsen",
        "ip": "10.0.4.21",
        "severity": "Online",
    },
]

recent_activity = [
    {
        "label": "LOGIN",
        "meta": "2026-05-06 09:42:11 · superadmin@clinic.io · 10.0.4.21",
        "status": "Online",
    },
    {
        "label": "STAFF CREATE — S-1029 Liam O'Connor",
        "meta": "2026-05-06 09:38:02 · superadmin@clinic.io · 10.0.4.21",
        "status": "Online",
    },
    {
        "label": "PATIENT VIEW — P-88401 Eleanor Whitefield",
        "meta": "2026-05-05 17:12:44 · amelia.chen@clinic.io · 10.0.4.33",
        "status": "Online",
    },
    {
        "label": "KIOSK DEACTIVATE — K-04 Lab Wing — Bayview",
        "meta": "2026-05-05 15:03:19 · superadmin@clinic.io · 10.0.4.21",
        "status": "Online",
    },
]

kiosk_activity = [
    {
        "time": "09:42:11",
        "kiosk": "K-01 · Lobby — North Gate",
        "event": "Check-in completed",
        "patient": "P-88401",
    },
    {
        "time": "09:31:05",
        "kiosk": "K-02 · Reception — Northgate",
        "event": "Vitals scan started",
        "patient": "P-88402",
    },
    {
        "time": "09:15:42",
        "kiosk": "K-05 · Entrance — Eastside",
        "event": "Check-in completed",
        "patient": "P-88403",
    },
    {
        "time": "08:58:20",
        "kiosk": "K-03 · Pharmacy — Bayview",
        "event": "Idle timeout",
        "patient": "—",
    },
    {
        "time": "08:40:11",
        "kiosk": "K-04 · Lab Wing — Bayview",
        "event": "Entered maintenance mode",
        "patient": "—",
    },
]

check_ins: List[Dict] = []

vitals_history = [
    {
        "kioskName": "Lobby — North Gate",
        "date": "2026-04-01 10:31 AM",
        "vital": "Blood Pressure",
        "status": "Optimal",
    },
    {
        "kioskName": "Reception — Northgate",
        "date": "2026-03-18 08:12 AM",
        "vital": "Heart Rate",
        "status": "Normal",
    },
]

VITAL_RANGES = {
    "heartRate": {"min": 62, "max": 96, "unit": "bpm"},
    "bmi": {"min": 18.5, "max": 27, "unit": "kg/m²"},
    "temperature": {"min": 36.2, "max": 37.6, "unit": "°C"},
    "systolic": {"min": 105, "max": 128, "unit": "mmHg"},
    "diastolic": {"min": 68, "max": 84, "unit": "mmHg"},
    "spo2": {"min": 95, "max": 99, "unit": "%"},
    "respiration": {"min": 12, "max": 18, "unit": "br/min"},
}


def find_patient(patient_id: str):
    return next((patient for patient in patients if patient["id"] == patient_id), None)


def find_staff(member_id: str):
    return next((member for member in staff if member["id"] == member_id), None)


def find_kiosk(kiosk_id: str):
    return next((kiosk for kiosk in kiosks if kiosk["id"] == kiosk_id), None)


def create_id(prefix: str):
    return f"{prefix}-{uuid4().hex[:6].upper()}"


def append_audit_event(actor: str, target: str, role: str = "system@clinic.io", ip: str = "10.0.0.1", severity: str = "Online"):
    audit_logs.insert(0, {
        "timestamp": "2026-08-03 12:00:00",
        "role": role,
        "actor": actor,
        "target": target,
        "ip": ip,
        "severity": severity,
    })


def add_check_in(patient_id: str, kiosk_id: str, readings: Dict):
    check_in = {
        "id": create_id("CHK"),
        "patientId": patient_id,
        "kioskId": kiosk_id,
        "readings": readings,
    }
    check_ins.append(check_in)
    vitals_history.insert(0, {
        "kioskName": find_kiosk(kiosk_id)["name"] if find_kiosk(kiosk_id) else kiosk_id,
        "date": "2026-08-03 12:00 PM",
        "vital": "Vitals Check-In",
        "status": "Completed",
    })
    return check_in
