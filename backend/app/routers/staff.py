"""
Staff accounts - SUPER ADMIN ONLY (use case "Manage Clinic staff account":
Add / Edit / Delete Account). Passwords are stored as bcrypt hashes and never
returned (StaffBase has no password field).
"""

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query

from app.data import append_audit_event, find_staff, find_staff_by_email, kiosks, staff
from app.schemas import StaffBase, StaffCreate, StaffUpdate
from app.security import ROLES, SUPER_ADMIN, hash_password, public_account, require_roles

router = APIRouter()
only_admin = require_roles(SUPER_ADMIN)


def kiosk_clinics():
    """Clinics a staff account can belong to = clinics that have at least one kiosk."""
    return sorted({k["clinic"] for k in kiosks if k.get("clinic")})


def _check_clinic(clinic, current=None):
    """New / changed clinic must be one of the kiosks' clinics. (An account may keep a
    clinic it already had, e.g. after that clinic's last kiosk was renamed.)"""
    if clinic is None or clinic == current:
        return
    if clinic not in kiosk_clinics():
        raise HTTPException(status_code=422,
                            detail="Clinic must be one of the clinics that have a kiosk: "
                                   + (", ".join(kiosk_clinics()) or "none yet - add a kiosk first"))


def _check_role(role):
    if role is not None and role not in ROLES:
        raise HTTPException(status_code=422, detail=f"accessRole must be one of {list(ROLES)}")


def _active_admins(exclude_id=None):
    return [m for m in staff if m.get("accessRole") == SUPER_ADMIN
            and m.get("status") != "Suspended" and m["id"] != exclude_id]


@router.get("/staff", response_model=List[StaffBase])
async def get_staff(search: str = Query("", alias="search"), me: dict = Depends(only_admin)):
    term = search.lower()
    return [
        public_account(member)
        for member in staff
        if not term
        or term in member["name"].lower()
        or term in member["email"].lower()
        or term in member["role"].lower()
    ]


@router.get("/staff/clinics")
async def get_clinics(me: dict = Depends(only_admin)):
    """Options for the Clinic dropdown: clinics of the existing kiosks."""
    return [{"clinic": c, "kiosks": [k["id"] for k in kiosks if k.get("clinic") == c]}
            for c in kiosk_clinics()]


@router.post("/staff", response_model=StaffBase)
async def add_staff(payload: StaffCreate, me: dict = Depends(only_admin)):
    _check_role(payload.accessRole)
    _check_clinic(payload.clinic)
    if find_staff_by_email(payload.email):
        raise HTTPException(status_code=409, detail="An account with that email already exists")
    number = max([int(m["id"].split("-")[1]) for m in staff if m["id"].split("-")[1].isdigit()] or [1000]) + 1
    new_id = f"S-{number}"
    initials = "".join(word[0] for word in payload.name.split() if word).upper()[:2]
    new_member = {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "role": payload.role,
        "clinic": payload.clinic,
        "status": "Active",
        "initials": initials,
        "accessRole": payload.accessRole,
        "passwordHash": hash_password(payload.password),
    }
    staff.append(new_member)
    append_audit_event("STAFF CREATE", f"{new_id} {payload.name}", role=me["email"])
    return public_account(new_member)


@router.patch("/staff/{staff_id}", response_model=StaffBase)
async def update_staff(staff_id: str, updates: StaffUpdate, me: dict = Depends(only_admin)):
    member = find_staff(staff_id)
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    changes = updates.model_dump(exclude_unset=True)
    _check_role(changes.get("accessRole"))
    _check_clinic(changes.get("clinic"), current=member.get("clinic"))
    if "email" in changes:
        other = find_staff_by_email(changes["email"])
        if other and other["id"] != staff_id:
            raise HTTPException(status_code=409, detail="An account with that email already exists")
    losing_admin = member.get("accessRole") == SUPER_ADMIN and (
        changes.get("accessRole", SUPER_ADMIN) != SUPER_ADMIN or changes.get("status") == "Suspended")
    if losing_admin and not _active_admins(exclude_id=staff_id):
        raise HTTPException(status_code=409, detail="Can't remove the last active Super Admin")
    password = changes.pop("password", None)
    if password:
        member["passwordHash"] = hash_password(password)
    member.update(changes)
    append_audit_event("STAFF UPDATE" + (" (password reset)" if password else ""),
                       staff_id, role=me["email"])
    return public_account(member)


@router.delete("/staff/{staff_id}")
async def remove_staff(staff_id: str, me: dict = Depends(only_admin)):
    member = find_staff(staff_id)
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if member["id"] == me["id"]:
        raise HTTPException(status_code=409, detail="You can't delete your own account")
    if member.get("accessRole") == SUPER_ADMIN and not _active_admins(exclude_id=staff_id):
        raise HTTPException(status_code=409, detail="Can't delete the last active Super Admin")
    staff.remove(member)
    append_audit_event("STAFF DELETE", staff_id, role=me["email"])
    return {"success": True}
