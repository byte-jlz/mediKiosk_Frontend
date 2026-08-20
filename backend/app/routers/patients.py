from fastapi import APIRouter, HTTPException, Query
from typing import List
from app.schemas import PatientBase, PatientRecord
from app.data import patients, find_patient

router = APIRouter()

@router.get("/patients", response_model=List[PatientBase])
async def get_patients(search: str = Query("", alias="search")):
    if not search:
        return patients
    term = search.lower()
    return [
        patient
        for patient in patients
        if term in patient["firstName"].lower()
        or term in patient["lastName"].lower()
        or term in patient["id"].lower()
    ]

@router.get("/patients/{patient_id}", response_model=PatientRecord)
async def get_patient_by_id(patient_id: str):
    patient = find_patient(patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
    return {**patient, "visitHistory": [
        {"date": "2026-05-02", "notes": "Routine check-in", "status": "Normal"},
        {"date": "2026-03-18", "notes": "Follow-up", "status": "Optimal"},
    ]}
