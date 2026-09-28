// ============================================================
// TOF LIVE SERVICE (MQTT)
// ------------------------------------------------------------
// Subscribes to the live VL53L0X Time-of-Flight readings that
// backend/tof_mqtt_publisher.py publishes from the kiosk Pi.
// Connection handling lives in mqttSensorFeed.js.
//
// Set these in .env if the broker isn't on the same machine serving the page
// (e.g. you run `npm run dev` on your laptop but Mosquitto is on the Pi):
//   VITE_MQTT_URL=ws://<pi-ip>:9001
//   VITE_TOF_TOPIC=medikiosk/sensors/tof
// ============================================================
import { useMqttSensorFeed } from './mqttSensorFeed';

export { MQTT_URL } from './mqttSensorFeed';
export const TOF_TOPIC = import.meta.env.VITE_TOF_TOPIC || 'medikiosk/sensors/tof';

function parseReading(text) {
  try {
    const data = JSON.parse(text);
    return {
      distanceMm: data.distance_mm ?? null,
      distanceCm: data.distance_cm ?? null,
      inRange: Boolean(data.in_range),
      simulated: Boolean(data.simulated),
    };
  } catch {
    return null;
  }
}

const historyValue = (reading) => (reading.inRange ? reading.distanceCm : null);

/**
 * React hook: live ToF feed over MQTT.
 *
 * Returns:
 *   connection       'connecting' | 'connected' | 'reconnecting' | 'offline'
 *   publisherOnline  true / false / null (unknown yet) — from the status topic
 *   reading          latest { distanceMm, distanceCm, inRange, simulated, receivedAt } or null
 *   history          last ~60 distances in cm (null = out of range), oldest first
 *   stale            true if no reading has arrived in the last 3 s
 */
export function useTofLiveFeed() {
  return useMqttSensorFeed({ topic: TOF_TOPIC, parse: parseReading, historyValue });
}
