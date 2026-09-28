"""
Live temperature (MLX90614 / GY-906) -> MQTT publisher for the Medi-Kiosk.

Reads the MLX90614 contactless IR thermometer every 0.5 s and publishes each
reading to an MQTT broker so the frontend can show a live feed (see
src/services/temperatureLiveService.js and src/kiosk-app/TemperatureLiveFeed.jsx).

Wiring (Raspberry Pi 4B, 3.3V I2C):
    VIN/VCC -> 3.3V   (pin 1)
    GND     -> GND    (pin 6)
    SCL     -> GPIO3  (pin 5)
    SDA     -> GPIO2  (pin 3)
It shares I2C bus 1 with the VL53L0X (0x29); the MLX90614 answers at 0x5A.

Topics
------
  medikiosk/sensors/temperature          JSON reading, published every interval:
      {"sensor": "mlx90614", "object_c": 36.52, "ambient_c": 27.10,
       "valid": true, "simulated": false, "ts": 1790411234.12}
      If the sensor flags a reading invalid (bit 15) or every I2C retry fails,
      the bad value is sent as null and "valid" is false.
  medikiosk/sensors/temperature/status   "online" / "offline" (retained).
      "offline" is also the MQTT last-will, so the UI knows if this script dies.

Run it on the kiosk Pi (from the backend/ folder, inside the venv):
    pip install paho-mqtt smbus2
    python temp_mqtt_publisher.py

Settings (environment variables, all optional):
    MQTT_HOST      broker host            (default: localhost)
    MQTT_PORT      broker TCP port        (default: 1883)
    TEMP_TOPIC     base topic             (default: medikiosk/sensors/temperature)
    TEMP_INTERVAL  seconds between reads  (default: 0.5)
    TEMP_SIMULATE  set to 1 to publish fake readings (for laptop testing)

If smbus2 / the I2C bus isn't available (e.g. on a Windows laptop), it
automatically publishes simulated readings instead.
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
TEMP_TOPIC = os.getenv("TEMP_TOPIC", "medikiosk/sensors/temperature")
STATUS_TOPIC = f"{TEMP_TOPIC}/status"
INTERVAL = float(os.getenv("TEMP_INTERVAL", "0.5"))
FORCE_SIMULATE = os.getenv("TEMP_SIMULATE", "0") == "1"

I2C_BUS = 1
MLX90614_ADDR = 0x5A
REG_AMBIENT = 0x06    # TA    - ambient (sensor die) temperature
REG_OBJECT = 0x07     # TOBJ1 - object (target) temperature


# ---------------------------------------------------------------------
# Sensor sources
# ---------------------------------------------------------------------
class RealMlx90614:
    """The physical MLX90614 on the Pi's I2C bus 1 (pins 3/5, address 0x5A)."""

    simulated = False

    def __init__(self):
        from smbus2 import SMBus

        self._bus = SMBus(I2C_BUS)
        # Probe once so a missing / miswired sensor is reported at startup.
        self._bus.read_word_data(MLX90614_ADDR, REG_AMBIENT)

    def _read_temp_c(self, register, retries=5):
        """Read a temperature register in °C, retrying on transient I2C errors."""
        for _ in range(retries):
            try:
                raw = self._bus.read_word_data(MLX90614_ADDR, register)
            except OSError:
                time.sleep(0.05)      # brief pause, then retry
                continue
            if raw & 0x8000:          # bit 15 set = invalid / out-of-range
                return None
            return raw * 0.02 - 273.15
        return None                   # all retries exhausted

    def read(self):
        """Returns (object_c, ambient_c); either may be None if unreadable."""
        return self._read_temp_c(REG_OBJECT), self._read_temp_c(REG_AMBIENT)

    def close(self):
        try:
            self._bus.close()
        except Exception:
            pass


class SimulatedMlx90614:
    """Fake readings: a forehead drifting in and out of view, room at ~27 °C."""

    simulated = True

    def __init__(self):
        self._t0 = time.time()

    def read(self):
        t = time.time() - self._t0
        ambient = 27.0 + 0.3 * math.sin(t / 30) + random.uniform(-0.05, 0.05)
        # Every ~20 s a "person" steps up for ~12 s, otherwise the sensor sees the room.
        if (t % 20) < 12:
            obj = 36.6 + 0.2 * math.sin(t / 3) + random.uniform(-0.1, 0.1)
        else:
            obj = ambient + random.uniform(-0.2, 0.2)
        return obj, ambient

    def close(self):
        pass


def open_sensor():
    if FORCE_SIMULATE:
        print("[temp] TEMP_SIMULATE=1 -> publishing simulated readings")
        return SimulatedMlx90614()
    try:
        sensor = RealMlx90614()
        print(f"[temp] MLX90614 found at 0x{MLX90614_ADDR:02X} on I2C bus {I2C_BUS}, publishing real readings")
        return sensor
    except (ImportError, OSError) as exc:
        print(f"[temp] Sensor unavailable ({exc}); publishing simulated readings")
        return SimulatedMlx90614()


# ---------------------------------------------------------------------
# MQTT
# ---------------------------------------------------------------------
def make_client():
    client = mqtt.Client(
        mqtt.CallbackAPIVersion.VERSION2,
        client_id=f"medikiosk-temp-{os.getpid()}",
    )
    # If this script crashes or loses power, the broker publishes "offline" for us.
    client.will_set(STATUS_TOPIC, "offline", qos=1, retain=True)

    def on_connect(c, _userdata, _flags, reason_code, _props):
        if reason_code.is_failure:
            print(f"[mqtt] Connect failed: {reason_code}")
            return
        print(f"[mqtt] Connected to {MQTT_HOST}:{MQTT_PORT}, publishing to '{TEMP_TOPIC}'")
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


def build_payload(object_c, ambient_c, simulated):
    return {
        "sensor": "mlx90614",
        "object_c": round(object_c, 2) if object_c is not None else None,
        "ambient_c": round(ambient_c, 2) if ambient_c is not None else None,
        "valid": object_c is not None and ambient_c is not None,
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
            object_c, ambient_c = sensor.read()

            payload = build_payload(object_c, ambient_c, sensor.simulated)
            client.publish(TEMP_TOPIC, json.dumps(payload), qos=0)

            if payload["valid"]:
                print(f"Ambient: {ambient_c:6.2f} °C    Object: {object_c:6.2f} °C")
            else:
                print("Reading unavailable (retries exhausted)")

            time.sleep(max(0.0, INTERVAL - (time.time() - started)))
    finally:
        print("[temp] Stopping...")
        client.publish(STATUS_TOPIC, "offline", qos=1, retain=True).wait_for_publish(timeout=2)
        client.loop_stop()
        client.disconnect()
        sensor.close()


if __name__ == "__main__":
    sys.exit(main())
