"""
Reports - SUPER ADMIN ONLY (use case "Generate reports" «extend» "export report").

From the paper: "The system compiles triage data, patient volume, and kiosk
usage statistics into analytical summaries". All-time figures, no filters yet.

    GET /api/reports/summary   the three summaries as JSON (shown on the Reports page)
    GET /api/reports/export    the same report as a CSV file (for Excel / Google Sheets)
"""

import csv
import io
import time
from collections import defaultdict
from datetime import datetime
from statistics import mean
from typing import Optional

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response

from app import triage
from app.data import append_audit_event, check_ins, kiosks, patients
from app.routers.kiosks import view as kiosk_view
from app.security import SUPER_ADMIN, require_roles

router = APIRouter()
only_admin = require_roles(SUPER_ADMIN)
LEVELS = [("high", "High Risk"), ("medium", "Medium Risk"), (None, "Not rated"), ("normal", "Normal")]


def _avg_min(values) -> Optional[float]:
    values = [v for v in values if v is not None]
    return round(mean(values) / 60, 1) if values else None


def _day(ts) -> str:
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d") if ts else "unknown"


def build_report(me: dict) -> dict:
    rows = [triage.summary(c) for c in check_ins]
    level = lambda r: r["urgencyLevel"]                       # noqa: E731
    waits = lambda rs: [(r["seenAt"] - r["createdAt"]) for r in rs                     # noqa: E731
                        if r["seenAt"] and r["createdAt"]]
    alerts = [r for r in rows if r["alert"]]

    # ---------------- triage data
    by_level = []
    for key, label in LEVELS:
        rs = [r for r in rows if level(r) == key]
        by_level.append({"level": key or "not_rated", "label": label, "checkIns": len(rs),
                         "share": round(100 * len(rs) / len(rows), 1) if rows else 0.0,
                         "avgWaitMinutes": _avg_min(waits(rs))})
    triage_data = {
        "byLevel": by_level,
        "seen": sum(1 for r in rows if r["queueStatus"] == "seen"),
        "stillWaiting": sum(1 for r in rows if r["queueStatus"] == "waiting"),
        "avgWaitMinutes": _avg_min(waits(rows)),
        "highRiskAlerts": len(alerts),
        "alertsAcknowledged": sum(1 for r in alerts if r["alertAcknowledged"]),
        "avgMinutesToAcknowledge": _avg_min([(r["acknowledgedAt"] - r["createdAt"]) for r in alerts
                                              if r["acknowledgedAt"] and r["createdAt"]]),
        "incompleteCheckIns": sum(1 for r in rows if r["incomplete"]),
    }

    # ---------------- patient volume
    days = defaultdict(lambda: {"checkIns": 0, "registered": 0, "guests": 0,
                                "high": 0, "medium": 0, "notRated": 0, "normal": 0})
    for r in rows:
        d = days[_day(r["createdAt"])]
        d["checkIns"] += 1
        d["guests" if r["isGuest"] else "registered"] += 1
        d[{"high": "high", "medium": "medium", "normal": "normal"}.get(level(r), "notRated")] += 1
    volume = {
        "checkIns": len(rows),
        "registeredCheckIns": sum(1 for r in rows if not r["isGuest"]),
        "guestCheckIns": sum(1 for r in rows if r["isGuest"]),
        "uniquePatients": len({r["patientId"] for r in rows if not r["isGuest"]}),
        "patientRecords": sum(1 for p in patients if p.get("status") != "archived"),
        "byDay": [{"date": day, **v} for day, v in sorted(days.items(), reverse=True)],
    }

    # ---------------- kiosk usage
    usage = []
    for k in kiosks:
        rs = [r for r in rows if r["kioskId"] == k["id"]]
        v = kiosk_view(k)
        usage.append({
            "kioskId": k["id"], "name": k["name"], "clinic": k["clinic"],
            "status": v["status"], "connection": v["connection"],
            "checkIns": len(rs),
            "checkInsToday": v["checkInsToday"],
            "incomplete": sum(1 for r in rs if r["incomplete"]),
            "incompleteRate": round(100 * sum(1 for r in rs if r["incomplete"]) / len(rs), 1) if rs else 0.0,
            "guests": sum(1 for r in rs if r["isGuest"]),
            "lastCheckIn": v["lastCheckIn"],
        })

    times = [r["createdAt"] for r in rows if r["createdAt"]]
    return {
        "generatedAt": round(time.time(), 3),
        "generatedBy": me["name"],
        "period": {"from": min(times) if times else None, "to": max(times) if times else None},
        "triage": triage_data,
        "patientVolume": volume,
        "kioskUsage": usage,
    }


@router.get("/reports/summary")
async def summary(request: Request, me: dict = Depends(only_admin)):
    append_audit_event("REPORT GENERATED", "summary report", role=me["email"],
                       ip=request.client.host if request.client else "-")
    return build_report(me)


def _fmt_time(ts):
    return datetime.fromtimestamp(ts).strftime("%Y-%m-%d %H:%M") if ts else ""


def _blank(v):
    return "" if v is None else v


@router.get("/reports/export")
async def export_csv(request: Request, me: dict = Depends(only_admin)):
    rep = build_report(me)
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(["Medi-Kiosk summary report"])
    w.writerow(["Generated", _fmt_time(rep["generatedAt"]), "by", rep["generatedBy"]])
    w.writerow(["Period", _fmt_time(rep["period"]["from"]), "to", _fmt_time(rep["period"]["to"])])
    w.writerow([])

    t = rep["triage"]
    w.writerow(["TRIAGE DATA"])
    w.writerow(["Classification", "Check-ins", "Share %", "Avg wait to be seen (min)"])
    for row in t["byLevel"]:
        w.writerow([row["label"], row["checkIns"], row["share"], _blank(row["avgWaitMinutes"])])
    w.writerow(["Seen", t["seen"]])
    w.writerow(["Still waiting", t["stillWaiting"]])
    w.writerow(["Average wait to be seen (min)", _blank(t["avgWaitMinutes"])])
    w.writerow(["High Risk alerts", t["highRiskAlerts"]])
    w.writerow(["Alerts acknowledged", t["alertsAcknowledged"]])
    w.writerow(["Average time to acknowledge (min)", _blank(t["avgMinutesToAcknowledge"])])
    w.writerow(["Incomplete check-ins", t["incompleteCheckIns"]])
    w.writerow([])

    v = rep["patientVolume"]
    w.writerow(["PATIENT VOLUME"])
    w.writerow(["Total check-ins", v["checkIns"]])
    w.writerow(["Registered patients' check-ins", v["registeredCheckIns"]])
    w.writerow(["Guest check-ins", v["guestCheckIns"]])
    w.writerow(["Unique registered patients", v["uniquePatients"]])
    w.writerow(["Patient records (active)", v["patientRecords"]])
    w.writerow(["Date", "Check-ins", "Registered", "Guests", "High Risk", "Medium Risk", "Not rated", "Normal"])
    for d in v["byDay"]:
        w.writerow([d["date"], d["checkIns"], d["registered"], d["guests"],
                    d["high"], d["medium"], d["notRated"], d["normal"]])
    w.writerow([])

    w.writerow(["KIOSK USAGE"])
    w.writerow(["Kiosk", "Name", "Clinic", "Status", "Connection", "Check-ins", "Today",
                "Incomplete", "Incomplete %", "Guests", "Last check-in"])
    for k in rep["kioskUsage"]:
        w.writerow([k["kioskId"], k["name"], k["clinic"], k["status"], k["connection"], k["checkIns"],
                    k["checkInsToday"], k["incomplete"], k["incompleteRate"], k["guests"],
                    _fmt_time(k["lastCheckIn"])])

    append_audit_event("REPORT EXPORTED (CSV)", "summary report", role=me["email"],
                       ip=request.client.host if request.client else "-")
    name = f"medikiosk-report-{datetime.now().strftime('%Y%m%d-%H%M')}.csv"
    # utf-8-sig so Excel shows accents / the em dash correctly
    return Response(out.getvalue().encode("utf-8-sig"), media_type="text/csv",
                    headers={"Content-Disposition": f'attachment; filename="{name}"'})
