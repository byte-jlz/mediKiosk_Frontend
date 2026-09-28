// ============================================================
// MQTT SENSOR FEED (shared)
// ------------------------------------------------------------
// Generic React hook for a live sensor stream published by one of the
// backend/*_mqtt_publisher.py scripts on the kiosk Pi. Used by
// tofLiveService.js and temperatureLiveService.js.
//
// Browsers can't open raw MQTT (TCP) connections, so this talks to the
// broker's WebSocket listener (port 9001 — see backend/mosquitto/medikiosk.conf).
// Set VITE_MQTT_URL=ws://<pi-ip>:9001 in .env if the broker isn't on the
// same machine serving the page.
// ============================================================
import { useEffect, useState } from 'react';

// MQTT.js is loaded on demand (dynamic import) so it only downloads when a
// live-feed screen is actually open, not with the rest of the app.

export const MQTT_URL =
  import.meta.env.VITE_MQTT_URL || `ws://${window.location.hostname || 'localhost'}:9001`;

const STALE_AFTER_MS = 3000; // no message for this long => "waiting for sensor"
const HISTORY_LENGTH = 60; // ~30 s of history at 0.5 s per reading

/**
 * React hook: live sensor feed over MQTT.
 *
 * topic         reading topic; `${topic}/status` carries "online" / "offline"
 * parse         (payloadText) => reading object, or null to ignore the message
 * historyValue  (reading) => number | null to append to `history` (null = gap)
 *
 * Returns:
 *   connection       'connecting' | 'connected' | 'reconnecting' | 'offline'
 *   publisherOnline  true / false / null (unknown yet) — from the status topic
 *   reading          latest parsed reading (with receivedAt) or null
 *   history          last ~60 historyValue() results, oldest first
 *   stale            true if no reading has arrived in the last 3 s
 */
export function useMqttSensorFeed({ topic, parse, historyValue }) {
  const [connection, setConnection] = useState('connecting');
  const [publisherOnline, setPublisherOnline] = useState(null);
  const [reading, setReading] = useState(null);
  const [history, setHistory] = useState([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const statusTopic = `${topic}/status`;
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
        client.subscribe([topic, statusTopic], { qos: 0 });
      });
      client.on('reconnect', () => setConnection('reconnecting'));
      client.on('offline', () => setConnection('offline'));
      client.on('close', () => setConnection((c) => (c === 'connected' ? 'offline' : c)));
      client.on('error', (err) => {
        console.warn(`[mqttSensorFeed ${topic}] MQTT error:`, err.message);
      });

      client.on('message', (msgTopic, payload) => {
        const text = payload.toString();
        if (msgTopic === statusTopic) {
          setPublisherOnline(text === 'online');
          return;
        }
        const parsed = parse(text);
        if (!parsed) return;
        const next = { ...parsed, receivedAt: Date.now() };
        setReading(next);
        setPublisherOnline(true);
        setHistory((h) => [...h.slice(-(HISTORY_LENGTH - 1)), historyValue(next)]);
      });
    });

    // Re-render once a second so `stale` flips even when messages stop.
    const tick = setInterval(() => setNow(Date.now()), 1000);

    return () => {
      cancelled = true;
      clearInterval(tick);
      if (client) client.end(true);
    };
    // parse / historyValue are expected to be module-level functions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic]);

  const stale = !reading || now - reading.receivedAt > STALE_AFTER_MS;

  return { connection, publisherOnline, reading, history, stale };
}
