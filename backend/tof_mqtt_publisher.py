"""
Live ToF (VL53L0X) -> MQTT publisher for the Medi-Kiosk.

Reads the VL53L0X distance sensor every 0.5 s (same settings as
hardware/test_tof.py) and publishes each reading to an MQTT broker so the
frontend can show a live feed (see src/services/tofLiveService.js and
src/kiosk-app/TofLiveFeed.jsx).

Topics
------
  medikiosk/sensors/tof          JSON reading, published every interval:
      {"sensor": "vl53l0x", "distance_mm": 541, "distance_cm": 54.1,
       "in_range": true, "simulated": false, "ts": 1790411234.12}
      When nothing is in range the VL53L0X reports 8190 mm; that is sent as
      {"distance_mm": null, "distance_cm": null, "in_range": false, ...}
  medikiosk/sensors/tof/status   "online" / "offline" (retained). "offline"
      is also the MQTT last-will, so the UI knows if this script dies.

Run it on the kiosk Pi (from the backend/ folder, inside the venv):
    pip install paho-mqtt
    python tof_mqtt_publisher.py

Settings (environment variables, all optional):
    MQTT_HOST     broker host            (default: localhost)
    MQTT_PORT     broker TCP port        (default: 1883)
    TOF_TOPIC     base topic             (default: medikiosk/sensors/tof)
    TOF_INTERVAL  seconds between reads  (default: 0.5)
    TOF_SIMULATE  set to 1 to publish fake readings (for laptop testing)

If the Pi sensor libraries (board / busio / adafruit_vl53l0x) can't be
imported, it automatically publishes simulated readings instead, the same
way app/sensors.py falls back on a dev laptop.
"""

import json
import math
import os
import random
import signal
import sys
import time

try:
    import paho.mqtt.client as mqtt
except ImportError as exc:
    raise ImportError(
        "The MQTT publisher requires paho-mqtt. Install it with: "
        "python -m pip install paho-mqtt"
    ) from exc

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOF_TOPIC = os.getenv("TOF_TOPIC", "medikiosk/sensors/tof")
STATUS_TOPIC = f"{TOF_TOPIC}/status"
INTERVAL = float(os.getenv("TOF_INTERVAL", "0.5"))
FORCE_SIMULATE = os.getenv("TOF_SIMULATE", "0") == "1"

TIMING_BUDGET_US = 200000   # longer budget = steadier readings
OUT_OF_RANGE_MM = 8190      # VL53L0X "no target" value (8190 / 8191)


# ---------------------------------------------------------------------
# Sensor sources
# ---------------------------------------------------------------------
class RealTof:
    """The physical VL53L0X on the Pi's I2C bus 1 (pins 3/5, address 0x29)."""

    simulated = False

    def __init__(self):
        import board
        import busio
        import adafruit_vl53l0x

        self._i2c = busio.I2C(board.SCL, board.SDA)
        self._sensor = adafruit_vl53l0x.VL53L0X(self._i2c)
        self._sensor.measurement_timing_budget = TIMING_BUDGET_US

    def read_mm(self):
        return self._sensor.range

    def close(self):
        try:
            self._i2c.deinit()
        except Exception:
            pass


class SimulatedTof:
    """Fake readings: a slow wave between ~10 and ~120 cm with occasional dropouts."""

    simulated = True

    def __init__(self):
        self._t0 = time.time()

    def read_mm(self):
        if random.random() < 0.05:
            return OUT_OF_RANGE_MM
        t = time.time() - self._t0
        return int(650 + 550 * math.sin(t / 4) + random.uniform(-15, 15))

    def close(self):
        pass


def open_sensor():
    if FORCE_SIMULATE:
        print("[tof] TOF_SIMULATE=1 -> publishing simulated readings")
        return SimulatedTof()
    try:
        sensor = RealTof()
        print("[tof] VL53L0X found on I2C, publishing real readings")
        return sensor
    except (ImportError, NotImplementedError) as exc:
        print(f"[tof] Sensor libraries unavailable ({exc}); publishing simulated readings")
        return SimulatedTof()


# ---------------------------------------------------------------------
# MQTT
# ---------------------------------------------------------------------
def make_client():
    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"medikiosk-tof-{os.getpid()}",
    )
    # If this script crashes or loses power, the broker publishes "offline" for us.
    client.will_set(STATUS_TOPIC, "offline", qos=1, retain=True)

    def on_connect(c, _userdata, _flags, reason_code, _props):
        if reason_code.is_failure:
            print(f"[mqtt] Connect failed: {reason_code}")
            return
        print(f"[mqtt] Connected to {MQTT_HOST}:{MQTT_PORT}, publishing to '{TOF_TOPIC}'")
        c.publish(STATUS_TOPIC, "online", qos=1, retain=True)

    def on_disconnect(_c, _userdata, _flags, reason_code, _props):
        print(f"[mqtt] Disconnected ({reason_code}), will retry...")

    client.on_connect = on_connect
    client.on_disconnect = on_disconnect
    client.reconnect_delay_set(min_delay=1, max_delay=10)
    # connect_async + loop_start: keeps retrying in the background if the
    # broker isn't up yet, instead of crashing at startup.
    client.connect_async(MQTT_HOST, MQTT_PORT, keepalive=30)
    client.loop_start()
    return client


def build_payload(mm, simulated):
    in_range = 0 < mm < OUT_OF_RANGE_MM
    return {
        "sensor": "vl53l0x",
        "distance_mm": mm if in_range else None,
        "distance_cm": round(mm / 10, 1) if in_range else None,
        "in_range": in_range,
        "simulated": simulated,
        "ts": round(time.time(), 3),
    }


# ---------------------------------------------------------------------
# Main loop
# ---------------------------------------------------------------------
def main():
    running = True

    def stop(_signum, _frame):
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)

    client = make_client()
    sensor = open_sensor()

    try:
        while running:
            started = time.time()
            try:
                mm = sensor.read_mm()
            except (OSError, ValueError, RuntimeError) as exc:
                # Loose wire / I2C glitch: reopen the sensor instead of dying.
                print(f"[tof] I2C read failed ({exc}); reopening sensor in 1 s")
                sensor.close()
                time.sleep(1)
                try:
                    sensor = open_sensor()
                except (OSError, ValueError) as reopen_exc:
                    print(f"[tof] Sensor still unavailable: {reopen_exc}")
                continue

            payload = build_payload(mm, sensor.simulated)
            client.publish(TOF_TOPIC, json.dumps(payload), qos=0)

            label = f"{payload['distance_cm']:.1f} cm" if payload["in_range"] else "out of range"
            print(f"Distance: {label}")

            time.sleep(max(0.0, INTERVAL - (time.time() - started)))
    finally:
        print("[tof] Stopping...")
        client.publish(STATUS_TOPIC, "offline", qos=1, retain=True).wait_for_publish(timeout=2)
        client.loop_stop()
        client.disconnect()
        sensor.close()


if __name__ == "__main__":
    sys.exit(main())
