"""
Kiosks - SUPER ADMIN ONLY (use cases "Manage kiosk" «extend» add kiosk /
edit kiosk settings / deactivate kiosk, and "Monitor kiosk activity").

    GET   /api/kiosks                       all kiosks + live connection + check-ins today
    POST  /api/kiosks                       add kiosk {name, clinic, notes}
    PATCH /api/kiosks/{id}                  edit settings {name, clinic, notes}
    POST  /api/kiosks/{id}/deactivate       stop new check-ins on this kiosk
    POST  /api/kiosks/{id}/activate         allow check-ins again
    GET   /api/kiosks/monitor               live status of every kiosk + MQTT broker + activity feed

A kiosk's ID (K-01, K-02, ...) must match KIOSK_ID on its Raspberry Pi agent and
VITE_KIOSK_ID in the kiosk tablet's .env.
"""

import re
import time
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, Field

from app import store
from app.data import append_audit_event, check_ins, find_kiosk, kiosk_activity, kiosks, now_iso
from app.mqtt_bridge import bridge
from app.security import SUPER_ADMIN, require_roles

router = APIRouter()
only_admin = require_roles(SUPER_ADMIN)


class KioskIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=80)
    clinic: str = Field(..., min_length=1, max_length=80)
    notes: Optional[str] = Field("", max_length=300)


class KioskPatch(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=80)
    clinic: Optional[str] = Field(None, min_length=1, max_length=80)
    notes: Optional[str] = Field(None, max_length=300)


def _ip(request: Request) -> str:
    return request.client.host if request.client else "-"


def _start_of_today() -> float:
    return time.mktime(time.localtime()[:3] + (0, 0, 0, 0, 0, -1))


def view(k: dict) -> dict:
    """Kiosk + its live connection (from the agent's MQTT status) + usage today."""
    agent = store.get_agent_status(k["id"]) or {}
    seen = agent.get("receivedAt")
    online = bool(agent.get("online")) and bridge.connected
    mine = [c for c in check_ins if c.get("kioskId") == k["id"]]
    today = [c for c in mine if (c.get("createdAt") or 0) >= _start_of_today()]
    current = agent.get("current") if online else None
    if not seen:
        connection = "never"           # the agent never connected
    elif online:
        connection = "busy" if agent.get("busy") else "online"
    else:
        connection = "offline"
    return {
        "id": k["id"],
        "name": k["name"],
        "clinic": k["clinic"],
        "notes": k.get("notes", ""),
        "status": k.get("status", "Active"),            # Active | Deactivated (set by the admin)
        "createdAt": k.get("createdAt"),
        "deactivatedAt": k.get("deactivatedAt"),
        "connection": connection,                       # never | online | busy | offline
        "lastSeen": seen,
        "simulated": bool(agent.get("simulated")) if online else None,
        "agentVersion": agent.get("agent_version"),
        "currentScan": current.get("vital") if current else None,
        "checkInsToday": len(today),
        "checkInsTotal": len(mine),
        "lastCheckIn": max((c.get("createdAt") or 0 for c in mine), default=None) or None,
    }


def _get(kiosk_id: str) -> dict:
    k = find_kiosk(kiosk_id)
    if k is None:
        raise HTTPException(status_code=404, detail="Kiosk not found")
    return k


@router.get("/kiosks")
async def list_kiosks(me: dict = Depends(only_admin)):
    return [view(k) for k in kiosks]


@router.get("/kiosks/monitor")
async def monitor(me: dict = Depends(only_admin)):
    return {
        "broker": {"connected": bridge.connected},
        "kiosks": [view(k) for k in kiosks],
        "activity": kiosk_activity[:100],
        "serverTime": round(time.time(), 3),
    }


@router.post("/kiosks")
async def add_kiosk(payload: KioskIn, request: Request, me: dict = Depends(only_admin)):
    numbers = [int(m.group(1)) for k in kiosks if (m := re.fullmatch(r"K-(\d+)", k["id"]))]
    new_id = f"K-{(max(numbers or [0]) + 1):02d}"
    k = {"id": new_id, "name": payload.name.strip(), "clinic": payload.clinic.strip(),
         "notes": (payload.notes or "").strip(), "status": "Active", "createdAt": now_iso()}
    kiosks.append(k)
    append_audit_event("KIOSK CREATE", f"{new_id} {k['name']}", role=me["email"], ip=_ip(request))
    return view(k)


@router.patch("/kiosks/{kiosk_id}")
async def edit_kiosk(kiosk_id: str, payload: KioskPatch, request: Request,
                     me: dict = Depends(only_admin)):
    k = _get(kiosk_id)
    changes = {key: v.strip() for key, v in payload.model_dump(exclude_unset=True).items()
               if v is not None}
    k.update(changes)
    append_audit_event("KIOSK SETTINGS UPDATE",
                       f"{kiosk_id} ({', '.join(sorted(changes)) or 'no changes'})",
                       role=me["email"], ip=_ip(request))
    return view(k)


@router.post("/kiosks/{kiosk_id}/deactivate")
async def deactivate(kiosk_id: str, request: Request, me: dict = Depends(only_admin)):
    k = _get(kiosk_id)
    k.update(status="Deactivated", deactivatedAt=now_iso(), deactivatedBy=me["name"])
    append_audit_event("KIOSK DEACTIVATE", kiosk_id, role=me["email"], ip=_ip(request),
                       severity="Warning")
    return view(k)


@router.post("/kiosks/{kiosk_id}/activate")
async def activate(kiosk_id: str, request: Request, me: dict = Depends(only_admin)):
    k = _get(kiosk_id)
    k.update(status="Active", deactivatedAt=None, deactivatedBy=None)
    append_audit_event("KIOSK ACTIVATE", kiosk_id, role=me["email"], ip=_ip(request))
    return view(k)
