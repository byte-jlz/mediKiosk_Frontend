"""
patients_db.py - the patient registry: create, look up, update, archive,
delete (privacy request), and the patient's check-in history.

Used by routers/patients.py (Super Admin) and routers/auth.py (patient
sign-up / kiosk sign-in). Passwords: bcrypt (app/security.py). QR codes:
secrets.token_hex(18) -> 36 hex characters, encoded as MEDIKIOSK:<token>.
"""

import re
import secrets
from typing import Dict, List, Optional

from app import store
from app.data import (check_ins, find_patient, find_patient_by_email, now_iso, patient_age,
                      patients)
from app.security import hash_password

PUBLIC_HIDE = {"passwordHash"}


def new_qr_token() -> str:
    return secrets.token_hex(18)


def next_patient_id() -> str:
    numbers = [int(m.group(1)) for p in patients if (m := re.fullmatch(r"P-(\d+)", p["id"]))]
    return f"P-{max(numbers or [10000]) + 1}"


def check_ins_of(patient_id: str) -> List[dict]:
    return [c for c in check_ins if c.get("patientId") == patient_id]


def last_visit(patient_id: str) -> Optional[float]:
    times = [c.get("createdAt") or 0 for c in check_ins_of(patient_id)]
    return max(times) if times else None


def public(p: dict, with_qr: bool = False) -> dict:
    """A patient without the password hash (and without the QR token unless asked)."""
    out = {k: v for k, v in p.items() if k not in PUBLIC_HIDE and (with_qr or k != "qrToken")}
    out["age"] = patient_age(p.get("birthday"))
    out["lastVisit"] = last_visit(p["id"])
    out["checkInCount"] = len(check_ins_of(p["id"]))
    return out


def email_taken(email: str, except_id: Optional[str] = None) -> bool:
    other = find_patient_by_email(email)
    return bool(other and other["id"] != except_id)


def _clean(v):
    return v.strip() if isinstance(v, str) else (v or "")


def create(fields: Dict, password: str, via: str) -> dict:
    """fields: firstName, middleName, lastName, birthday, sex, bloodType, address, email."""
    p = {
        "id": next_patient_id(),
        **{k: _clean(fields.get(k)) for k in ("firstName", "middleName", "lastName", "birthday",
                                               "sex", "bloodType", "address")},
        "email": fields["email"].strip().lower(),
        "passwordHash": hash_password(password),
        "qrToken": new_qr_token(),
        "createdAt": now_iso(),
        "status": "active",
        "registeredVia": via,            # "admin" | "app"
    }
    patients.append(p)
    return p


def update(p: dict, changes: Dict) -> dict:
    password = changes.pop("password", None)
    if "email" in changes and changes["email"]:
        changes["email"] = changes["email"].strip().lower()
    for k, v in changes.items():
        p[k] = v.strip() if isinstance(v, str) else v
    if password:
        p["passwordHash"] = hash_password(password)
    p["updatedAt"] = now_iso()
    return p


def delete(p: dict) -> int:
    """Privacy request: remove the patient AND all their check-ins + kiosk sessions."""
    mine = check_ins_of(p["id"])
    for c in mine:
        check_ins.remove(c)
    store.delete_patient_sessions(p["id"])
    patients.remove(p)
    return len(mine)


def history(patient_id: str) -> List[dict]:
    """The patient's check-ins, newest first (same rows the Clinic Staff see)."""
    from app import triage                  # late import: triage imports data
    rows = [triage.summary(c) for c in check_ins_of(patient_id)]
    rows.sort(key=lambda r: r["createdAt"] or 0, reverse=True)
    for i, r in enumerate(rows):
        r["recordNumber"] = len(rows) - i
    return rows


def get(patient_id: str) -> Optional[dict]:
    return find_patient(patient_id)
