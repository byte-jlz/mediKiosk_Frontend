from fastapi import APIRouter, Query
from typing import List
from app.schemas import AuditLogEntry
from app.data import audit_logs

router = APIRouter()

@router.get("/audit-logs", response_model=List[AuditLogEntry])
async def get_audit_logs(search: str = Query("", alias="search")):
    if not search:
        return audit_logs
    term = search.lower()
    return [
        log
        for log in audit_logs
        if term in log["actor"].lower()
        or term in log["role"].lower()
        or term in log["target"].lower()
    ]
