// Live push from the backend (WebSocket). The socket only says "the queue changed";
// the screen then re-reads the queue through the normal API call, so nothing sensitive
// travels over the socket. If the socket drops it reconnects by itself, and the screen
// falls back to polling in the meantime.
import { API_BASE_URL, getSession } from './api';

const wsUrl = (path) => API_BASE_URL.replace(/^http/, 'ws') + path;   // http -> ws, https -> wss

/** Connects, signs in with the staff token, calls onChange() on each nudge and onStatus('live'|'offline'). Returns a stop function. */
export function watchQueue({ onChange, onStatus }) {
  let ws = null;
  let retry = 0;
  let timer = null;
  let stopped = false;

  const connect = () => {
    const token = getSession('staff')?.token;
    if (stopped || !token) return;
    try {
      ws = new WebSocket(wsUrl('/api/ws/queue'));
    } catch {
      schedule();
      return;
    }
    ws.onopen = () => ws.send(JSON.stringify({ token }));          // token goes in the first message, not the URL
    ws.onmessage = (e) => {
      let msg = null;
      try { msg = JSON.parse(e.data); } catch { return; }
      if (msg.type === 'ready') { retry = 0; onStatus('live'); onChange(); }   // catch up on anything missed while offline
      else if (msg.type === 'queue_changed') onChange();
    };
    ws.onclose = (e) => {
      onStatus('offline');
      if (!stopped && e.code !== 4401 && e.code !== 4403) schedule();   // 4401/4403 = refused: don't hammer the server
    };
    ws.onerror = () => ws.close();
  };

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(connect, Math.min(1000 * 2 ** retry++, 30000));  // 1s, 2s, 4s ... up to 30s
  };

  const ping = setInterval(() => { if (ws?.readyState === 1) ws.send('ping'); }, 25000);   // keeps proxies from closing an idle socket
  connect();
  return () => { stopped = true; clearInterval(ping); clearTimeout(timer); ws?.close(); };
}