// ============================================================
// TRIAGE SERVICE - Clinic Staff queue, alerts and live updates
// ------------------------------------------------------------
// Backend: backend/app/routers/triage.py (Clinic Staff only).
//
// One live WebSocket and one copy of the queue are shared by every staff
// screen (dashboard, queue, alerts bell), so a new check-in updates them all
// at once without refreshing the page. If the live link drops, the queue is
// re-fetched every 15 s until it comes back.
// ============================================================

import { API_BASE_URL, AUTH_EVENT, getStaffToken, request } from './apiClient';

export const getQueue = () => request('GET', '/admin/queue');
/** Patient records: every check-in (waiting + seen), the same list for every staff account. */
export const getRecords = (search = '') =>
  request('GET', `/admin/records${search ? `?search=${encodeURIComponent(search)}` : ''}`);
export const getCheckIn = (id) => request('GET', `/admin/queue/${encodeURIComponent(id)}`);
// after an action, refresh the shared queue right away (don't wait for the live event)
export const markSeen = (id) =>
  request('POST', `/admin/queue/${encodeURIComponent(id)}/seen`).then(async (r) => {
    await refreshQueue();
    return r;
  });
export const acknowledgeAlert = (id) =>
  request('POST', `/admin/queue/${encodeURIComponent(id)}/acknowledge`).then(async (r) => {
    await refreshQueue();
    return r;
  });

// ------------------------------------------------------------ shared state
const POLL_MS = 15000;
let state = { data: null, error: '', live: 'connecting' }; // live: connecting | live | offline
const stateListeners = new Set();
const eventListeners = new Set();

let socket = null;
let retryTimer = null;
let pollTimer = null;
let closeTimer = null;
let retryMs = 1000;
let fetching = null;

function setState(patch) {
  state = { ...state, ...patch };
  stateListeners.forEach((fn) => fn(state));
}

let refetch = false;
let settled = null;      // promise that resolves when the queue is up to date
let resolveSettled = null;

function runFetch() {
  fetching = getQueue()
    .then((data) => setState({ data, error: '' }))
    .catch((err) => setState({ error: err.message }))
    .finally(() => {
      fetching = null;
      if (refetch) {            // something changed while we were loading: load once more
        refetch = false;
        runFetch();
      } else {
        resolveSettled();
      }
    });
}

/**
 * Re-load the queue. One request at a time; a refresh asked for while one is
 * loading runs once more afterwards. The returned promise resolves when the
 * queue on screen includes every change made before the call.
 */
export function refreshQueue() {
  if (fetching) {
    refetch = true;
    return settled;
  }
  settled = new Promise((resolve) => {
    resolveSettled = resolve;
  });
  runFetch();
  return settled;
}

function liveUrl() {
  const base = API_BASE_URL.replace(/^http/, 'ws');
  return `${base}/api/admin/live?token=${encodeURIComponent(getStaffToken())}`;
}

function startPolling() {
  if (!pollTimer) pollTimer = setInterval(refreshQueue, POLL_MS);
}

function stopPolling() {
  clearInterval(pollTimer);
  pollTimer = null;
}

function connect() {
  clearTimeout(retryTimer);
  if (socket || !getStaffToken()) return;
  setState({ live: 'connecting' });
  let ws;
  try {
    ws = new WebSocket(liveUrl());
  } catch {
    scheduleRetry();
    return;
  }
  socket = ws;

  ws.onopen = () => {
    retryMs = 1000;
    stopPolling();
    setState({ live: 'live' });
    refreshQueue();                        // catch up on anything missed while offline
  };
  ws.onmessage = (msg) => {
    let event;
    try {
      event = JSON.parse(msg.data);
    } catch {
      return;
    }
    if (event.type === 'ping' || event.type === 'hello') return;
    eventListeners.forEach((fn) => fn(event));
    refreshQueue();
  };
  ws.onclose = (e) => {
    socket = null;
    if (stateListeners.size === 0 && eventListeners.size === 0) return;   // nobody listening
    setState({ live: 'offline' });
    startPolling();
    // 4401/4403 = login expired or wrong role: the next API call sends us to login
    if (e.code === 4401 || e.code === 4403) {
      refreshQueue();
      return;
    }
    scheduleRetry();
  };
}

function scheduleRetry() {
  clearTimeout(retryTimer);
  retryTimer = setTimeout(connect, retryMs);
  retryMs = Math.min(retryMs * 2, 15000);
}

function disconnectSoon() {
  // small grace period so moving between staff pages doesn't reconnect
  clearTimeout(closeTimer);
  closeTimer = setTimeout(() => {
    if (stateListeners.size || eventListeners.size) return;
    clearTimeout(retryTimer);
    stopPolling();
    if (socket) {
      const s = socket;
      socket = null;
      s.close();
    }
    state = { data: null, error: '', live: 'connecting' };
  }, 2000);
}

function ensureRunning() {
  clearTimeout(closeTimer);
  if (!state.data && !fetching) refreshQueue();
  if (!socket) connect();
}

/** Queue + counts + open alerts, kept up to date. Returns an unsubscribe fn. */
export function subscribeQueue(listener) {
  stateListeners.add(listener);
  listener(state);
  ensureRunning();
  return () => {
    stateListeners.delete(listener);
    disconnectSoon();
  };
}

/** Raw live events ({type: 'checkin' | 'alert' | 'queue', ...}). */
export function subscribeLiveEvents(listener) {
  eventListeners.add(listener);
  ensureRunning();
  return () => {
    eventListeners.delete(listener);
    disconnectSoon();
  };
}

// Logging out: drop the connection and the cached queue right away.
if (typeof window !== 'undefined') {
  window.addEventListener(AUTH_EVENT, () => {
    if (getStaffToken()) return;
    clearTimeout(retryTimer);
    clearTimeout(closeTimer);
    stopPolling();
    if (socket) {
      const s = socket;
      socket = null;
      s.close();
    }
    state = { data: null, error: '', live: 'connecting' };
  });
}
