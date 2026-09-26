// ============================================================
// TOF LIVE SERVICE (MQTT)
// ------------------------------------------------------------
// Subscribes to the live VL53L0X Time-of-Flight readings that
// backend/tof_mqtt_publisher.py publishes from the kiosk Pi.
//
// Browsers can't open raw MQTT (TCP) connections, so this talks to the
// broker's WebSocket listener (port 9001 — see backend/mosquitto/medikiosk.conf).
//
// Set these in .env if the broker isn't on the same machine serving the page
// (e.g. you run `npm run dev` on your laptop but Mosquitto is on the Pi):
//   VITE_MQTT_URL=ws://<pi-ip>:9001
//   VITE_TOF_TOPIC=medikiosk/sensors/tof
// ============================================================
import { useEffect, useState } from 'react';

// MQTT.js is loaded on demand (dynamic import) so it only downloads when a
// live-feed screen is actually open, not with the rest of the app.

export const MQTT_URL =
  import.meta.env.VITE_MQTT_URL || `ws://${window.location.hostname || 'localhost'}:9001`;
export const TOF_TOPIC = import.meta.env.VITE_TOF_TOPIC || 'medikiosk/sensors/tof';
const STATUS_TOPIC = `${TOF_TOPIC}/status`;

const STALE_AFTER_MS = 3000; // no message for this long => "waiting for sensor"
const HISTORY_LENGTH = 60; // ~30 s of history at 0.5 s per reading

function parseReading(text) {
  try {
    const data = JSON.parse(text);
    return {
      distanceMm: data.distance_mm ?? null,
      distanceCm: data.distance_cm ?? null,
      inRange: Boolean(data.in_range),
      simulated: Boolean(data.simulated),
      receivedAt: Date.now(),
    };
  } catch {
    return null;
  }
}

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
  const [connection, setConnection] = useState('connecting');
  const [publisherOnline, setPublisherOnline] = useState(null);
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let client = null;
    let cancelled = false;

    import('mqtt').then(({ default: mqtt }) => {
      if (cancelled) return;
      client = mqtt.connect(MQTT_URL, {
        clientId: `medikiosk-ui-${Math.random().toString(16).slice(2, 10)}`,
        reconnectPeriod: 2000,
        connectTimeout: 5000,
        clean: true,
      });

      client.on('connect', () => {
        setConnection('connected');
        client.subscribe([TOF_TOPIC, STATUS_TOPIC], { qos: 0 });
      });
      client.on('reconnect', () => setConnection('reconnecting'));
      client.on('offline', () => setConnection('offline'));
      client.on('close', () => setConnection((c) => (c === 'connected' ? 'offline' : c)));
      client.on('error', (err) => {
        console.warn('[tofLiveService] MQTT error:', err.message);
      });

      client.on('message', (topic, payload) => {
        const text = payload.toString();
        if (topic === STATUS_TOPIC) {
          setPublisherOnline(text === 'online');
          return;
        }
        const next = parseReading(text);
        if (!next) return;
        setReading(next);
        setPublisherOnline(true);
        setHistory((h) => [...h.slice(-(HISTORY_LENGTH - 1)), next.inRange ? next.distanceCm : null]);
      });
    });

    // Re-render once a second so `stale` flips even when messages stop.
    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      clearInterval(tick);
      if (client) client.end(true);
    };
  }, []);

  const stale = !reading || now - reading.receivedAt > STALE_AFTER_MS;

  return { connection, publisherOnline, reading, history, stale };
}
