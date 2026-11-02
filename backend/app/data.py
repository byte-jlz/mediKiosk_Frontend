"""
data.py - the system's records, IN MEMORY for now (a backend restart clears
everything except the demo accounts below). MongoDB later: only the lists and
helper functions in this file (and app/store.py) have to change.
"""
import time
from datetime import date, datetime
from typing import Dict, List, Optional
from uuid import uuid4

# ============================================================== patients
# Patient registry (Super Admin "Manage patients records"). Patients sign in at
# the kiosk with email + password or their QR code (qrToken, 36 hex chars,
# encoded as MEDIKIOSK:<token> - see src/services/patientQr.js).
#   status: "active" | "archived" (archived = hidden by default, can't sign in)
#   passwordHash: bcrypt. DEMO PASSWORD for every demo patient: Patient@1234
PATIENT_DEMO_HASH = "$2b$12$mQZRKkDIHlpGGoUuZgjlWOkcVjKuqOZWDAR4xjXuDqbu5FScAi/Wy"   # Patient@1234


def _demo_patient(pid, first, middle, last, birthday, sex, blood, email, address, token):
    return {
        "id": pid, "firstName": first, "middleName": middle, "lastName": last,
        "birthday": birthday, "sex": sex, "bloodType": blood, "email": email,
        "address": address, "passwordHash": PATIENT_DEMO_HASH, "qrToken": token,
        "createdAt": "2026-10-01T09:00:00", "status": "active", "registeredVia": "admin",
    }


patients: List[Dict] = [
    _demo_patient("P-10001", "Eleanor", "R.", "Whitefield", "1962-03-14", "Female", "O+",
                  "eleanor.whitefield@example.com", "14 Magnolia St, Northgate City",
                  "5aabdd0666dfda1233c2fd264e95988d1e45"),
    _demo_patient("P-10002", "Daniel", "", "Park", "2000-07-02", "Male", "A-",
                  "daniel.park@example.com", "92 Cedar Ave, Bayview",
                  "7de7a36eede5266942a4ad39fdad3c5773f2"),
    _demo_patient("P-10003", "Mae", "", "Tanaka", "1992-11-20", "Female", "O-",
                  "mae.tanaka@example.com", "31 Birch Rd, Bayview",
                  "2691290f0508a53377fa992de24b56e653fc"),
    # the kiosk's DEV "Skip login" patient (src/services/devAuth.js), so dev
    # check-ins show up in a real patient record
    _demo_patient("PAT-DEV-0001", "Dev", "T.", "Patient", "1995-01-01", "Other", "O+",
                  "dev.patient@medikiosk.dev", "1 Test Lane, Dev City",
                  "ddfa06eb1760fa26c83961316b3079ca6f61"),
]

# ============================================================== staff
# Staff accounts (in memory, like the rest of data.py).
#   accessRole  = what the account may open in the admin console:
#                 "super_admin" or "clinic_staff" (see app/security.py)
#   role        = job title shown in the staff list (Doctor, Nurse, ...)
#   passwordHash = bcrypt hash - the plain password is never stored.
# DEMO PASSWORDS (change before real use):
#   superadmin@clinic.io   Admin@1234   (Super Admin)
#   every clinic staff      Staff@1234   (Clinic Staff; S-1027 is Suspended)
ADMIN_DEMO_HASH = "$2b$12$NnQZakqeTfLAomgBCacw3OCMcvdMb7UH8DrCrRzUi.6lt6Cpv9q56"   # Admin@1234
STAFF_DEMO_HASH = "$2b$12$4HNlktSIT819EDvup7QmEeOnsRipPvG.d2sOQW2h9lnLM8Io8dpQi"   # Staff@1234

staff = [
    {
        "id": "S-1000",
        "name": "System Admin",
        "email": "superadmin@clinic.io",
        "role": "Super Admin",
        "clinic": "All clinics",
        "status": "Active",
        "initials": "SA",
        "accessRole": "super_admin",
        "passwordHash": ADMIN_DEMO_HASH,
    },
    {
        "id": "S-1024",
        "name": "Dr. Amelia Chen",
        "email": "amelia.chen@clinic.io",
        "role": "Doctor",
        "clinic": "Northgate Clinic",
        "status": "Active",
        "initials": "DA",
        "accessRole": "clinic_staff",
        "passwordHash": STAFF_DEMO_HASH,
    },
    {
        "id": "S-1025",
        "name": "Marcus Reyes",
        "email": "marcus.reyes@clinic.io",
        "role": "Nurse",
        "clinic": "Bayview Medical",
        "status": "Active",
        "initials": "MR",
        "accessRole": "clinic_staff",
        "passwordHash": STAFF_DEMO_HASH,
    },
    {
        "id": "S-1026",
        "name": "Priya Natarjan",
        "email": "priya.n@clinic.io",
        "role": "Receptionist",
        "clinic": "Northgate Clinic",
        "status": "Active",
        "initials": "PN",
        "accessRole": "clinic_staff",
        "passwordHash": STAFF_DEMO_HASH,
    },
    {
        "id": "S-1027",
        "name": "Dr. Henrick Olsen",
        "email": "henrik.o@clinic.io",
        "role": "Doctor",
        "clinic": "Eastside Family",
        "status": "Suspended",
        "initials": "DH",
        "accessRole": "clinic_staff",
        "passwordHash": STAFF_DEMO_HASH,
    },
    {
        "id": "S-1028",
        "name": "Sofia Mercado",
        "email": "sofia.m@clinic.io",
        "role": "Pharmacist",
        "clinic": "Eastside Family",
        "status": "Active",
        "initials": "SM",
        "accessRole": "clinic_staff",
        "passwordHash": STAFF_DEMO_HASH,
    },
]

# ============================================================== kiosks
# status = what the Super Admin set: "Active" | "Deactivated" (a deactivated
# kiosk can't start check-ins). Connection (online/busy/last seen) comes live
# from the kiosk agent over MQTT (app/mqtt_bridge.py) into agent* fields.
kiosks: List[Dict] = [
    {
        "id": "K-01",
        "name": "Lobby — North Gate",
        "clinic": "Northgate Clinic",
        "notes": "Main kiosk (Raspberry Pi 4B)",
        "status": "Active",
        "createdAt": "2026-10-01T09:00:00",
    },
]

# ============================================================== logs
audit_logs: List[Dict] = []        # newest first - see append_audit_event()
kiosk_activity: List[Dict] = []    # newest first - filled by app/mqtt_bridge.py
check_ins: List[Dict] = []         # every saved kiosk check-in (sessions.py)

# phone app demo history (step 4b replaces it with real check-ins)
vitals_history = [
    {"kioskName": "Lobby — North Gate", "date": "2026-04-01 10:31 AM",
     "vital": "Blood Pressure", "status": "Optimal"},
    {"kioskName": "Reception — Northgate", "date": "2026-03-18 08:12 AM",
     "vital": "Heart Rate", "status": "Normal"},
]


# ============================================================== helpers
def find_patient(patient_id: str):
    return next((patient for patient in patients if patient["id"] == patient_id), None)


def find_patient_by_email(email: str):
    email = (email or "").strip().lower()
    return next((p for p in patients if (p.get("email") or "").lower() == email), None)


def find_patient_by_qr(token: str):
    token = (token or "").strip().lower()
    if not token:
        return None
    return next((p for p in patients if p.get("qrToken") == token), None)


def patient_age(birthday: Optional[str]) -> Optional[int]:
    try:
        b = date.fromisoformat(birthday)
    except (TypeError, ValueError):
        return None
    t = date.today()
    return t.year - b.year - ((t.month, t.day) < (b.month, b.day))


def find_staff(member_id: str):
    return next((member for member in staff if member["id"] == member_id), None)


def find_staff_by_email(email: str):
    email = (email or "").strip().lower()
    return next((member for member in staff if member["email"].lower() == email), None)


def find_kiosk(kiosk_id: str):
    return next((kiosk for kiosk in kiosks if kiosk["id"] == kiosk_id), None)


def create_id(prefix: str):
    return f"{prefix}-{uuid4().hex[:6].upper()}"


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


MAX_AUDIT = 5000


def append_audit_event(action: str, target: str, role: str = "system", ip: str = "-",
                       severity: str = "Info"):
    """Write one audit-trail entry (Super Admin "View system logs / audit trail").

    action   what happened, e.g. "STAFF CREATE", "VIEW PATIENT VITALS"
    target   what it happened to (an ID)
    role     WHO did it: the staff email (or "system" / "kiosk K-01")
    severity "Info" | "Warning"
    Entries are never edited or deleted (in memory: the oldest drop off after MAX_AUDIT).
    """
    ts = time.time()
    audit_logs.insert(0, {
        "id": uuid4().hex[:10],
        "ts": round(ts, 3),
        "timestamp": datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M:%S"),
        "actor": role,
        "action": action,
        "target": target,
        "ip": ip,
        "severity": severity,
    })
    del audit_logs[MAX_AUDIT:]


def add_check_in(patient_id: str, kiosk_id: str, readings: Dict):
    check_in = {
        "id": create_id("CHK"),
        "patientId": patient_id,
        "kioskId": kiosk_id,
        "readings": readings,
    }
    check_ins.append(check_in)
    return check_in
