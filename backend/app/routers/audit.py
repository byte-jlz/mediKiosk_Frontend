"""
Audit trail - SUPER ADMIN ONLY (use case "View system logs / audit trail").

    GET /api/audit-logs?search=&limit=   newest first

Each entry: {timestamp, actor (who - staff email, "kiosk K-01" or "system"),
action (what), target (which record), ip, severity (Info | Warning)}.
Entries are only ever added, never edited or deleted (app/data.py).
"""

from fastapi import APIRouter, Query

from app.data import audit_logs

router = APIRouter()


@router.get("/audit-logs")
async def get_audit_logs(search: str = Query(""), limit: int = Query(1000, ge=1, le=5000)):
    term = search.strip().lower()
    rows = audit_logs
    if term:
        rows = [log for log in audit_logs
                if term in log["actor"].lower() or term in log["action"].lower()
                or term in log["target"].lower() or term in log["ip"].lower()]
    return rows[:limit]
