"""
triage.py - the Clinic Staff side of a check-in (use-case diagram, Figure 3.4).

  * Prioritized patient queue  - every finished check-in waits here until a
    staff member marks the patient as seen. ORDER ("filtered by urgency
    level"):
        1. High Risk       (urgency "high")
        2. Medium Risk     (urgency "medium")
        3. Not rated       (incomplete check-in: the risk check didn't run, so
                            staff must look at it - ranked above Normal)
        4. Normal          (urgency "normal")
    and inside each level, whoever has waited longest comes first.
  * Priority alerts            - a High Risk check-in is an alert until a staff
    member acknowledges it.
  * Live updates               - LiveHub pushes events to every open staff
    dashboard over a WebSocket (routers/triage.py), so screens update without
    refreshing.

Check-ins are kept in app.data.check_ins (in memory for now; MongoDB later).
"""

import asyncio
import threading
import time
from typing import Dict, List, Optional

from app.data import check_ins, find_kiosk, find_patient

LEVEL_LABELS = {"high": "High Risk", "medium": "Medium Risk", "normal": "Normal",
                None: "Not rated"}
PRIORITY = {"high": 0, "medium": 1, None: 2, "normal": 3}


# ---------------------------------------------------------------- helpers
def level_of(check_in: dict) -> Optional[str]:
    """'high' | 'medium' | 'normal', or None when the risk check didn't run."""
    return (check_in.get("urgency") or {}).get("level")


def patient_name(patient_id: Optional[str], fallback: Optional[str] = None) -> str:
    if not patient_id or patient_id == "guest":
        return fallback or "Guest"
    p = find_patient(patient_id)
    if p:
        return " ".join(x for x in [p.get("firstName"), p.get("lastName")] if x)
    return fallback or patient_id


def find_check_in(check_in_id: str) -> Optional[dict]:
    return next((c for c in check_ins if c["id"] == check_in_id), None)


def summary(c: dict) -> dict:
    """One queue row: who, when, how urgent, and the headline numbers."""
    r = c.get("readings") or {}
    level = level_of(c)
    kiosk = find_kiosk(c.get("kioskId") or "")
    bp = r.get("bloodPressure")
    val = lambda k: (r.get(k) or {}).get("value")
    return {
        "id": c["id"],
        "patientId": c.get("patientId"),
        "patientName": c.get("patientName") or patient_name(c.get("patientId")),
        "isGuest": c.get("patientId") in (None, "guest"),
        "kioskId": c.get("kioskId"),
        "kioskName": kiosk["name"] if kiosk else c.get("kioskId"),
        "createdAt": c.get("createdAt"),
        "urgencyLevel": level,
        "urgencyLabel": LEVEL_LABELS.get(level, "Not rated"),
        "urgencyReasons": (c.get("urgency") or {}).get("reasons", []),
        "priority": PRIORITY.get(level, 2),
        "incomplete": bool(c.get("incomplete")),
        "missingVitals": c.get("missingVitals", []),
        "queueStatus": c.get("queueStatus", "waiting"),
        "seenAt": c.get("seenAt"),
        "seenBy": c.get("seenBy"),
        "alert": is_alert(c),
        "alertAcknowledged": bool(c.get("alertAcknowledged")),
        "simulated": bool(c.get("simulated")),
        "vitals": {
            "temperature": val("temperature"),
            "systolic": bp["systolic"] if bp else None,
            "diastolic": bp["diastolic"] if bp else None,
            "heartRate": val("heartRate"),
            "spo2": val("spo2"),
            "respiration": val("respiration"),
            "weight": val("weight"),
            "bmi": val("bmi"),
        },
    }


def is_alert(c: dict) -> bool:
    return level_of(c) == "high"


# ---------------------------------------------------------------- queue
def waiting_queue() -> List[dict]:
    rows = [summary(c) for c in check_ins if c.get("queueStatus", "waiting") == "waiting"]
    rows.sort(key=lambda s: (s["priority"], s["createdAt"] or 0))
    for i, row in enumerate(rows, start=1):
        row["position"] = i
    return rows


def queue_counts(rows: Optional[List[dict]] = None) -> Dict[str, int]:
    rows = waiting_queue() if rows is None else rows
    start_of_day = time.mktime(time.localtime()[:3] + (0, 0, 0, 0, 0, -1))
    return {
        "waiting": len(rows),
        "high": sum(r["urgencyLevel"] == "high" for r in rows),
        "medium": sum(r["urgencyLevel"] == "medium" for r in rows),
        "notRated": sum(r["urgencyLevel"] is None for r in rows),
        "normal": sum(r["urgencyLevel"] == "normal" for r in rows),
        "seenToday": sum(1 for c in check_ins
                         if c.get("queueStatus") == "seen" and (c.get("seenAt") or 0) >= start_of_day),
        "checkInsToday": sum(1 for c in check_ins if (c.get("createdAt") or 0) >= start_of_day),
    }


def open_alerts() -> List[dict]:
    """High Risk patients still waiting whose alert nobody has acknowledged."""
    return [r for r in waiting_queue() if r["alert"] and not r["alertAcknowledged"]]


def detail(c: dict) -> dict:
    """Everything about one check-in + the patient's earlier check-ins."""
    history = []
    if c.get("patientId") not in (None, "guest"):
        history = [summary(x) for x in check_ins
                   if x.get("patientId") == c.get("patientId")]
        history.sort(key=lambda s: s["createdAt"] or 0, reverse=True)
    return {
        **summary(c),
        "readings": c.get("readings"),
        "heartRateCheck": c.get("heartRateCheck"),
        "bmiCategory": c.get("bmiCategory"),
        "urgency": c.get("urgency"),
        "failures": c.get("failures") or {},
        "sessionId": c.get("sessionId"),
        "history": history,
    }


# ---------------------------------------------------------------- live hub
class LiveHub:
    """Fan-out of live events to every open staff WebSocket.

    publish() is safe to call from any thread (the MQTT bridge runs in its own
    thread); each subscriber gets the event on its own asyncio queue.
    """

    def __init__(self):
        self._subs = set()           # {(loop, asyncio.Queue)}
        self._lock = threading.Lock()

    def subscribe(self) -> asyncio.Queue:
        q = asyncio.Queue(maxsize=200)
        with self._lock:
            self._subs.add((asyncio.get_running_loop(), q))
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        with self._lock:
            self._subs = {s for s in self._subs if s[1] is not q}

    def publish(self, event: dict) -> None:
        event = {**event, "ts": round(time.time(), 3)}
        with self._lock:
            subs = list(self._subs)
        for loop, q in subs:
            try:
                loop.call_soon_threadsafe(_put, q, event)
            except RuntimeError:     # that loop is closed
                self.unsubscribe(q)

    @property
    def listeners(self) -> int:
        return len(self._subs)


def _put(q: asyncio.Queue, event: dict):
    if q.full():                     # a stuck client: drop its oldest event
        try:
            q.get_nowait()
        except asyncio.QueueEmpty:
            pass
    q.put_nowait(event)


hub = LiveHub()
