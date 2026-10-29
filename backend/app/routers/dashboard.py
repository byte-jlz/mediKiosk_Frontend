"""
Super Admin overview (the page the Super Admin lands on). Everything here is
computed from the real records - no demo numbers.

    GET /api/dashboard/stats
"""

import time

from fastapi import APIRouter

from app.data import audit_logs, check_ins, kiosks, patients, staff
from app.routers.kiosks import view as kiosk_view

router = APIRouter()


@router.get("/dashboard/stats")
async def get_dashboard_stats():
    start = time.mktime(time.localtime()[:3] + (0, 0, 0, 0, 0, -1))
    today = [c for c in check_ins if (c.get("createdAt") or 0) >= start]
    kiosk_rows = [kiosk_view(k) for k in kiosks]
    return {
        "staffAccounts": len(staff),
        "staffActive": sum(1 for m in staff if m.get("status") != "Suspended"),
        "clinicStaff": sum(1 for m in staff if m.get("accessRole") == "clinic_staff"),
        "patientRecords": sum(1 for p in patients if p.get("status") != "archived"),
        "patientsArchived": sum(1 for p in patients if p.get("status") == "archived"),
        "kiosksTotal": len(kiosks),
        "kiosksActive": sum(1 for k in kiosks if k.get("status") != "Deactivated"),
        "kiosksOnline": sum(1 for k in kiosk_rows if k["connection"] in ("online", "busy")),
        "checkInsToday": len(today),
        "checkInsTotal": len(check_ins),
        "kiosks": kiosk_rows,
        "recentActivity": audit_logs[:8],
    }
