import { useCallback, useEffect, useState } from 'react';
import Icon from '../ui/Icon';
import OnScreenKeyboard from './OnScreenKeyboard';
import { DevMessage, DevScreen, useDev } from './devCommon';

// Wi-Fi in Developer options. The agent does the work with nmcli on the Pi
// (agent/wifi_tools.py); on the laptop it pretends. The password goes to the
// agent once and is never shown again or written to the log.

function Bars({ signal }) {
  const on = signal >= 67 ? 3 : signal >= 34 ? 2 : 1;
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M2 8.8a15 15 0 0 1 20 0" opacity={on >= 3 ? 1 : 0.25} />
      <path d="M5 12.5a10 10 0 0 1 14 0" opacity={on >= 2 ? 1 : 0.25} />
      <path d="M8.5 16a5 5 0 0 1 7 0" />
      <path d="M12 19.5v.01" />
    </svg>
  );
}

function yesNo(v, yes, no) {
  if (v == null) return 'not set up';
  return v ? yes : no;
}

export default function DevWifi({ token, onBack }) {
  const { send } = useDev(token);
  const [status, setStatus] = useState(null);
  const [networks, setNetworks] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [picked, setPicked] = useState(null); // network being connected to
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [msg, setMsg] = useState({ tone: 'info', text: '' });

  const loadStatus = useCallback(() => send('dev_wifi', { op: 'status' }, 20000).then((r) => r.ok && setStatus(r)), [send]);
  const scan = useCallback(() => {
    setScanning(true);
    return send('dev_wifi', { op: 'scan' }, 40000).then((r) => {
      setScanning(false);
      if (r.ok) setNetworks(r.networks);
      else setMsg({ tone: 'bad', text: r.message });
    });
  }, [send]);

  useEffect(() => {
    loadStatus();
    scan();
  }, [loadStatus, scan]);

  const pick = (n) => {
    if (n.in_use) return;
    setMsg({ tone: 'info', text: '' });
    setPassword('');
    setShow(true);
    setPicked(n);
  };
  const needsPassword = picked && picked.secured && !picked.saved;

  const connect = async () => {
    if (needsPassword && (password.length < 8 || password.length > 63)) {
      setMsg({ tone: 'bad', text: 'A Wi-Fi password is 8 to 63 characters.' });
      return;
    }
    setConnecting(true);
    setMsg({ tone: 'info', text: `Connecting to ${picked.ssid}… (up to 45 s)` });
    const r = await send('dev_wifi', { op: 'connect', ssid: picked.ssid, password: needsPassword ? password : '' }, 70000);
    setConnecting(false);
    setPassword('');
    if (r.ok) {
      setStatus(r);
      setPicked(null);
      setMsg({ tone: 'ok', text: r.message });
      scan();
    } else {
      setMsg({ tone: 'bad', text: `${r.message} The kiosk stays on its saved network.` });
    }
  };

  // ---- step 2: password / confirm ----
  if (picked) {
    return (
      <DevScreen
        title={`Connect to ${picked.ssid}`}
        color="breath"
        sub={
          needsPassword
            ? null
            : picked.secured
              ? 'This network is saved - its password is already on the kiosk.'
              : 'This network has no password.'
        }
        onBack={() => (connecting ? null : setPicked(null))}
      >
        {needsPassword && (
          <>
            <label className="k-dev__numfield-label k-dev__pw-label" htmlFor="k-dev-pw">
              Password
            </label>
            <div className="k-dev__pw-row">
              <div id="k-dev-pw" className="k-dev__pw" aria-live="polite">
                {password ? (show ? password : '•'.repeat(password.length)) : <span className="is-empty">Type the password</span>}
                <span className="k-dev__caret" aria-hidden="true" />
              </div>
              <button type="button" className="k-dev__chip-btn k-dev__chip-btn--big" onClick={() => setShow((s) => !s)}>
                {show ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="k-dev__muted k-dev__note">Shown while typing so you can check it. Never logged or sent anywhere else.</p>
          </>
        )}
        <div className="k-dev__actions k-dev__wide">
          <button type="button" className="k-dev__system" disabled={connecting} onClick={() => setPicked(null)}>
            Cancel
          </button>
          <button type="button" className="k-dev__system k-dev__system--primary" disabled={connecting} onClick={connect}>
            {connecting ? 'Connecting…' : 'Connect'}
          </button>
        </div>
        <DevMessage tone={msg.tone}>{msg.text}</DevMessage>
        <p className="k-dev__muted k-dev__note">If you are connected over SSH, it drops when the network changes.</p>
        {needsPassword && (
          <div className="k-dev__osk-dock">
            <OnScreenKeyboard
              onKey={(c) => setPassword((p) => (p.length < 63 ? p + c : p))}
              onDelete={() => setPassword((p) => p.slice(0, -1))}
              onDone={connect}
              doneLabel="Connect"
            />
          </div>
        )}
      </DevScreen>
    );
  }

  // ---- step 1: status + list ----
  return (
    <DevScreen title="Wi-Fi" color="breath" onBack={onBack}>
      <div className="k-dev__wifi-status">
        <span>
          <span className="k-dev__live-label">Connected to</span>
          <span className="k-dev__wifi-value">{status ? status.ssid || 'nothing' : '…'}</span>
        </span>
        <span>
          <span className="k-dev__live-label">IP address (for SSH)</span>
          <span className="k-dev__wifi-value">{status ? status.ip || '--' : '…'}</span>
        </span>
        <span>
          <span className="k-dev__live-label">Internet</span>
          <span className="k-dev__wifi-value">{status ? yesNo(status.internet, '● Online', '○ Offline') : '…'}</span>
        </span>
        <span>
          <span className="k-dev__live-label">Staff console link (cloud broker)</span>
          <span className="k-dev__wifi-value">{status ? yesNo(status.broker, '● Reachable', '○ Not reachable') : '…'}</span>
        </span>
        <span>
          <span className="k-dev__live-label">Visits waiting to send</span>
          <span className="k-dev__wifi-value">{status ? (status.waiting ?? '--') : '…'}</span>
        </span>
        {status?.simulated && <span className="k-dev__live-note">Simulated (laptop) - nothing really changes.</span>}
      </div>

      <div className="k-dev__wifi-head">
        <h2 className="k-dev__section">NETWORKS NEARBY</h2>
        <button type="button" className="k-dev__chip-btn" disabled={scanning} onClick={() => { scan(); loadStatus(); }}>
          {scanning ? 'Scanning…' : 'Scan again'}
        </button>
      </div>
      <DevMessage tone={msg.tone}>{msg.text}</DevMessage>
      <div className="k-dev__nets">
        {networks == null && <p className="k-dev__muted">Looking for networks…</p>}
        {networks?.length === 0 && <p className="k-dev__muted">No networks found. Scan again.</p>}
        {networks?.map((n) => (
          <button key={n.ssid} type="button" className={`k-dev__net${n.in_use ? ' is-current' : ''}`} onClick={() => pick(n)}>
            <Bars signal={n.signal} />
            <span className="k-dev__row-text">
              <span className="k-dev__net-name">{n.ssid}</span>
              <span className="k-dev__tile-sub">
                {n.in_use ? 'Connected' : n.saved ? 'Saved' : n.secured ? 'Needs a password' : 'Open (no password)'} · signal{' '}
                {n.signal}%
              </span>
            </span>
            {n.secured && <Icon name="lock" size={40} label="Needs a password" />}
          </button>
        ))}
      </div>
      <p className="k-dev__muted k-dev__note">
        Tap a network to connect. If it fails, the kiosk goes back to its saved network by itself.
      </p>
    </DevScreen>
  );
}
