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
    this.status = null; // last agent status message
    this.connected = false;
  }

  _handle(topic, payload) {
    let msg;
    try {
      msg = JSON.parse(payload.toString());
    } catch {
      return;
    }
    const kind = topic.slice(BASE.length + 1); // "state" | "result" | "status"
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
   *   session  the backend session id (so the backend files the result)
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

  close() {
    this.listeners.clear();
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
    client.subscribe([`${BASE}/state`, `${BASE}/result`, `${BASE}/status`], { qos: 1 });
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
