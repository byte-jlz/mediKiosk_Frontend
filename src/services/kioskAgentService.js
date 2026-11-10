// ============================================================
// KIOSK AGENT SERVICE (MQTT)
// ------------------------------------------------------------
// Talks to the kiosk agent on the Pi (MediKiosk_hardware/agent/kiosk_agent.py)
// over MQTT-over-WebSockets. The agent owns every sensor; this file only
// sends it commands and listens to what it reports:
//
//   medikiosk/<KIOSK_ID>/cmd     -> {action: "scan" | "confirm" | "cancel", ...}
//   medikiosk/<KIOSK_ID>/state   <- progress of the running scan (countdowns, "put the cuff on", ...)
//   medikiosk/<KIOSK_ID>/result  <- the final outcome of each scan
//   medikiosk/<KIOSK_ID>/status  <- agent online / busy (retained)
//   medikiosk/<KIOSK_ID>/qr      <- QR login: started / found (the code) / timeout / error
//   medikiosk/<KIOSK_ID>/qr/preview <- JPEG preview of the QR cam (raw bytes)
//
// The QR cam is opened by the AGENT (by its USB port), not by the browser:
// the BP cam is the same webcam model, so the browser can't tell them apart.
//
// Every message is documented in MediKiosk_hardware/agent/README.md.
// The kiosk NEVER subscribes to medikiosk/<id>/urgency - the risk level is
// for staff only.
//
//   VITE_MQTT_URL=ws://<pi-ip>:9001   (default: ws://<page host>:9001)
//   VITE_KIOSK_ID=K-01
// ============================================================
import { useEffect, useRef, useState } from 'react';
// MQTT broker over WebSockets (Mosquitto port 9001). Default: the same host as the page.
export const MQTT_URL =
  import.meta.env.VITE_MQTT_URL || `ws://${window.location.hostname || 'localhost'}:9001`;

export const KIOSK_ID = import.meta.env.VITE_KIOSK_ID || 'K-01';
const BASE = `medikiosk/${KIOSK_ID}`;

function newId() {
  return Math.random().toString(16).slice(2, 10);
}

/**
 * One MQTT connection to the agent. Create it with `connectKioskAgent()`
 * and call `close()` when the screen goes away.
 */
class KioskAgentConnection {
  constructor(client) {
    this.client = client;
    this.listeners = new Map(); // scan id -> (kind, message) => void
    this.statusListeners = new Set();
    this.qrListeners = new Map(); // qr session id -> (msg) => void
    this.previewListeners = new Set(); // (Uint8Array jpeg) => void
    this.status = null; // last agent status message
    this.connected = false;
  }

  _handle(topic, payload) {
    if (topic === `${BASE}/qr/preview`) {
      this.previewListeners.forEach((fn) => fn(payload)); // raw JPEG, not JSON
      return;
    }
    let msg;
    try {
      msg = JSON.parse(payload.toString());
    } catch {
      return;
    }
    const kind = topic.slice(BASE.length + 1); // "state" | "result" | "status" | "qr"
    if (kind === 'qr') {
      this.qrListeners.get(msg.id)?.(msg);
      return;
    }
    if (kind === 'status') {
      this.status = msg;
      this.statusListeners.forEach((fn) => fn(msg));
      return;
    }
    const fn = this.listeners.get(msg.id);
    if (fn) fn(kind, msg);
  }

  onStatus(fn) {
    this.statusListeners.add(fn);
    if (this.status) fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  _send(cmd) {
    this.client.publish(`${BASE}/cmd`, JSON.stringify(cmd), { qos: 1 });
  }

  /**
   * Start a scan on the agent.
   *   vital    'bmi' | 'respirationSpo2Hr' | 'bloodPressure' | 'temperature'
   *   session  the backend session id (so the backend files the result),
   *            or null for a guest (the result is shown on screen only)
   *   onState  called with every `state` message for this scan
   * Returns { id, done } - `done` resolves with the agent's `result` message
   * (ok or not), or with { ok: false, rejected: true, error } if the agent
   * refused the command (e.g. busy).
   */
  scan(vital, session, onState) {
    const id = newId();
    const done = new Promise((resolve) => {
      this.listeners.set(id, (kind, msg) => {
        if (kind === 'result') {
          this.listeners.delete(id);
          resolve(msg);
        } else if (kind === 'state') {
          if (msg.phase === 'rejected' && msg.vital === vital) {
            this.listeners.delete(id);
            resolve({ id, ok: false, rejected: true, error: msg.message });
            return;
          }
          onState?.(msg);
        }
      });
    });
    this._send({ action: 'scan', id, vital, session });
    return { id, done };
  }

  confirm(id, step) {
    this._send({ action: 'confirm', id, step });
  }

  cancel(id) {
    this._send(id ? { action: 'cancel', id } : { action: 'cancel' });
  }

  /**
   * Look for a QR code with the agent's QR cam.
   *   onEvent    called with every `qr` message: started | found {text} | timeout | error {error}
   *   onPreview  called with each JPEG preview frame (Uint8Array)
   * Returns stop() - call it when the screen goes away.
   */
  startQr({ onEvent, onPreview } = {}) {
    const id = newId();
    if (onEvent) this.qrListeners.set(id, onEvent);
    if (onPreview) this.previewListeners.add(onPreview);
    this._send({ action: 'qr_start', id });
    return () => {
      this.qrListeners.delete(id);
      if (onPreview) this.previewListeners.delete(onPreview);
      this._send({ action: 'qr_stop', id });
    };
  }

  close() {
    this.listeners.clear();
    this.qrListeners.clear();
    this.previewListeners.clear();
    this.statusListeners.clear();
    this.client.end(true);
  }
}

/** Connect to the broker; resolves with a KioskAgentConnection. */
export async function connectKioskAgent({ onConnectionChange } = {}) {
  const { default: mqtt } = await import('mqtt');
  const client = mqtt.connect(MQTT_URL, {
    clientId: `medikiosk-kiosk-${KIOSK_ID}-${newId()}`,
    reconnectPeriod: 2000,
    connectTimeout: 5000,
    clean: true,
  });
  const conn = new KioskAgentConnection(client);
  client.on('connect', () => {
    conn.connected = true;
    client.subscribe([`${BASE}/state`, `${BASE}/result`, `${BASE}/status`, `${BASE}/qr`], { qos: 1 });
    client.subscribe(`${BASE}/qr/preview`, { qos: 0 });
    onConnectionChange?.('connected');
  });
  client.on('reconnect', () => onConnectionChange?.('reconnecting'));
  client.on('offline', () => {
    conn.connected = false;
    onConnectionChange?.('offline');
  });
  client.on('error', (err) => console.warn('[kioskAgent] MQTT error:', err.message));
  client.on('message', (topic, payload) => conn._handle(topic, payload));
  return conn;
}

/**
 * React hook: one agent connection for the lifetime of a screen.
 * Returns { agent, connection, agentOnline, agentBusy, simulated }.
 */
export function useKioskAgent() {
  const [connection, setConnection] = useState('connecting');
  const [status, setStatus] = useState(null);
  const agentRef = useRef(null);
  const [, force] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let conn = null;
    let unsub = () => {};
    connectKioskAgent({ onConnectionChange: (c) => !cancelled && setConnection(c) }).then((c) => {
      if (cancelled) {
        c.close();
        return;
      }
      conn = c;
      agentRef.current = c;
      unsub = c.onStatus((s) => setStatus(s));
      force((n) => n + 1);
    });
    return () => {
      cancelled = true;
      unsub();
      if (conn) conn.close();
      agentRef.current = null;
    };
  }, []);

  return {
    agent: agentRef.current,
    connection,
    agentOnline: Boolean(status?.online),
    agentBusy: Boolean(status?.busy),
    simulated: Boolean(status?.simulated),
  };
}
