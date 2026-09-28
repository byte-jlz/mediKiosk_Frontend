// ============================================================
// TEMPERATURE LIVE SERVICE (MQTT)
// ------------------------------------------------------------
// Subscribes to the live MLX90614 (GY-906) infrared thermometer readings
// that backend/temp_mqtt_publisher.py publishes from the kiosk Pi.
// Connection handling lives in mqttSensorFeed.js.
//
// Override the topic in .env if needed:
//   VITE_TEMP_TOPIC=medikiosk/sensors/temperature
// ============================================================
import { useMqttSensorFeed } from './mqttSensorFeed';

export { MQTT_URL } from './mqttSensorFeed';
export const TEMP_TOPIC = import.meta.env.VITE_TEMP_TOPIC || 'medikiosk/sensors/temperature';

function parseReading(text) {
  try {
    const data = JSON.parse(text);
    return {
      objectC: data.object_c ?? null,
      ambientC: data.ambient_c ?? null,
      valid: Boolean(data.valid) && data.object_c != null,
      simulated: Boolean(data.simulated),
    };
  } catch {
    return null;
  }
}

const historyValue = (reading) => (reading.valid ? reading.objectC : null);

/**
 * React hook: live MLX90614 temperature feed over MQTT.
 *
 * Returns:
 *   connection       'connecting' | 'connected' | 'reconnecting' | 'offline'
 *   publisherOnline  true / false / null (unknown yet) — from the status topic
 *   reading          latest { objectC, ambientC, valid, simulated, receivedAt } or null
 *   history          last ~60 object temperatures in °C (null = invalid), oldest first
 *   stale            true if no reading has arrived in the last 3 s
 */
export function useTemperatureLiveFeed() {
  return useMqttSensorFeed({ topic: TEMP_TOPIC, parse: parseReading, historyValue });
}
