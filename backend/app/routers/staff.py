from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.schemas import StaffBase, StaffCreate, StaffUpdate
from app.data import staff, find_staff, append_audit_event

router = APIRouter()

@router.get("/staff", response_model=List[StaffBase])
async def get_staff(search: str = Query("", alias="search")):
    if not search:
        return staff
    term = search.lower()
    return [
        member
        for member in staff
        if term in member["name"].lower()
        or term in member["email"].lower()
        or term in member["role"].lower()
    ]

@router.post("/staff", response_model=StaffBase)
async def add_staff(payload: StaffCreate):
    new_id = f"S-{1000 + len(staff) + 1}"
    initials = "".join(word[0] for word in payload.name.split() if word).upper()[:2]
    new_member = {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "role": payload.role,
        "clinic": payload.clinic,
        "status": "Online",
        "lastActive": "just now",
        "initials": initials,
    }
    staff.append(new_member)
    append_audit_event("STAFF CREATE", f"{new_id} {payload.name}")
    return new_member

@router.delete("/staff/{staff_id}")
async def remove_staff(staff_id: str):
    member = find_staff(staff_id)
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    staff.remove(member)
    append_audit_event("STAFF DELETE", staff_id)
    return {"success": True}

@router.patch("/staff/{staff_id}", response_model=StaffBase)
async def update_staff(staff_id: str, updates: StaffUpdate):
    member = find_staff(staff_id)
    if not member:
        raise HTTPException(status_code=404, detail="Staff member not found")
    updated = {**member, **{k: v for k, v in updates.dict(exclude_unset=True).items()}}
    staff[staff.index(member)] = updated
    append_audit_event("STAFF UPDATE", staff_id)
    return updated
