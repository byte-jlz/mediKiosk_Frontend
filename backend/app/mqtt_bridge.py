"""
mqtt_bridge.py - connects the FastAPI backend to the kiosk agents over MQTT.

Started/stopped with the app (see main.py). It listens to EVERY kiosk:

    medikiosk/+/result   -> store.add_result(); when a session has all 4
                            kiosk steps, run urgency.classify() and publish
                            medikiosk/<kiosk>/urgency (for the admin console -
                            the kiosk tablet must not subscribe to it)
    medikiosk/+/status   -> remember the agent's online/busy state and keep
                            the kiosk's Online/Offline status in data.kiosks

The agent's topics and messages are documented in the hardware repo:
MediKiosk_hardware/agent/README.md

Settings (environment variables, all optional):
    MQTT_ENABLED=0               don't connect at all (UI-only work)
    MQTT_HOST / MQTT_PORT        broker (default localhost:1883)
    MQTT_USER / MQTT_PASSWORD    broker login, once it has a password file

If the broker isn't running, the backend still starts and keeps retrying
in the background - the REST API works either way.
"""

import json
import os
import threading
import time
from typing import Optional

from app import store, urgency
from app.data import find_kiosk, kiosk_activity

try:
    import paho.mqtt.client as mqtt
except ImportError:              # the API still runs, just without live kiosk data
    mqtt = None

MQTT_ENABLED = os.getenv("MQTT_ENABLED", "1").strip().lower() not in ("0", "false", "no", "off")
MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_USER = os.getenv("MQTT_USER")
MQTT_PASSWORD = os.getenv("MQTT_PASSWORD")

T_RESULTS = "medikiosk/+/result"
T_STATUS = "medikiosk/+/status"

# Kiosk statuses an admin sets on purpose - the agent never overrides these.
ADMIN_STATUSES = {"Idle", "Maintenance", "Deactivated"}

VITAL_LABELS = {
    "bmi": "BMI", "height": "Height", "weight": "Weight", "heartRateSpo2": "Heart rate & SpO2",
    "respirationSpo2Hr": "Respiration, SpO2 & heart rate",
    "temperature": "Temperature", "bloodPressure": "Blood pressure", "respiration": "Respiration",
}


def log(msg):
    print(f"{time.strftime('%H:%M:%S')} [mqtt-bridge] {msg}", flush=True)


class MqttBridge:
    def __init__(self):
        self.client = None
        self.connected = False
        self.lock = threading.Lock()

    # ---------------- start / stop ----------------
    def start(self):
        if not MQTT_ENABLED:
            log("MQTT_ENABLED=0 - not connecting to the broker")
            return
        if mqtt is None:
            log("paho-mqtt not installed (pip install paho-mqtt) - no live kiosk data")
            return
        c = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"medikiosk-backend-{os.getpid()}")
        if MQTT_USER:
            c.username_pw_set(MQTT_USER, MQTT_PASSWORD)
        c.on_connect = self._on_connect
        c.on_disconnect = self._on_disconnect
        c.on_message = self._on_message
        c.reconnect_delay_set(min_delay=1, max_delay=15)
        c.connect_async(MQTT_HOST, MQTT_PORT, keepalive=30)
        c.loop_start()
        self.client = c
        log(f"connecting to {MQTT_HOST}:{MQTT_PORT}...")

    def stop(self):
        if self.client is not None:
            self.client.loop_stop()
            self.client.disconnect()
            self.client = None

    def publish(self, topic, payload, qos=1, retain=False):
        if self.client is not None and self.connected:
            self.client.publish(topic, json.dumps(payload), qos=qos, retain=retain)

    # ---------------- MQTT callbacks ----------------
    def _on_connect(self, client, _u, _f, reason_code, _p):
        if reason_code.is_failure:
            log(f"connect failed: {reason_code}")
            return
        self.connected = True
        client.subscribe([(T_RESULTS, 1), (T_STATUS, 1)])
        log(f"connected - listening to {T_RESULTS} and {T_STATUS}")

    def _on_disconnect(self, *_a):
        if self.connected:
            log("disconnected from the broker - retrying...")
        self.connected = False

    def _on_message(self, _c, _u, msg):
        try:
            payload = json.loads(msg.payload.decode())
            if not isinstance(payload, dict):
                return
            parts = msg.topic.split("/")          # medikiosk/<kiosk>/<kind>
            kiosk_id, kind = parts[1], parts[2]
            if kind == "result":
                self.handle_result(kiosk_id, payload)
            elif kind == "status":
                self.handle_status(kiosk_id, payload)
        except Exception as e:                    # never let one bad message kill the thread
            log(f"could not handle message on {msg.topic}: {e!r}")

    # ---------------- what we do with them ----------------
    def handle_result(self, kiosk_id: str, result: dict):
        result.setdefault("kiosk", kiosk_id)
        session = store.add_result(result)
        vital = VITAL_LABELS.get(result.get("vital"), result.get("vital"))
        _activity(kiosk_id, f"{vital}: " + ("measured" if result.get("ok") else
                                           "cancelled" if result.get("cancelled") else "failed"),
                  session["patientId"] if session else None)
        if session is None:
            if result.get("session"):
                log(f"result for unknown/closed session {result['session']} ({kiosk_id}) - kept, not attached")
            return
        if not store.missing_vitals(session):
            self.run_urgency(session)

    def run_urgency(self, session: dict) -> Optional[dict]:
        result = urgency.classify(session["readings"])
        result["ts"] = round(time.time(), 3)
        store.set_urgency(session["_id"], result)
        self.publish(f"medikiosk/{session['kioskId']}/urgency",
                     {"session": session["_id"], **result})
        log(f"session {session['_id']} urgency = {result['level']} ({result['model']})")
        return result

    def handle_status(self, kiosk_id: str, status: dict):
        store.set_agent_status(kiosk_id, status)
        kiosk = find_kiosk(kiosk_id)
        if kiosk is None:
            return
        online = bool(status.get("online"))
        kiosk["agentOnline"] = online
        kiosk["agentBusy"] = bool(status.get("busy")) if online else False
        kiosk["agentSimulated"] = bool(status.get("simulated")) if online else None
        kiosk["lastSeen"] = round(time.time(), 3)
        if kiosk.get("status") not in ADMIN_STATUSES:
            kiosk["status"] = "Online" if online else "Offline"


def _activity(kiosk_id, event, patient_id):
    """Add a line to the admin console's live kiosk activity feed."""
    kiosk = find_kiosk(kiosk_id)
    kiosk_activity.insert(0, {
        "time": time.strftime("%H:%M:%S"),
        "kiosk": f"{kiosk_id} · {kiosk['name']}" if kiosk else kiosk_id,
        "event": event,
        "patient": patient_id or "—",
    })
    del kiosk_activity[100:]


bridge = MqttBridge()
