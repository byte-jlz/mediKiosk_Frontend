import { useEffect, useRef, useState } from 'react';
import { DevMessage, DevScreen, useDev } from './devCommon';

// BP camera calibration - the touch version of hardware/bp_camTEST.py.
// The agent opens the BP camera (light on), reads the three boxes with the
// settings below and sends a preview + what it reads. Save writes
// hardware/bp_cam_settings.json (the old one is kept as bp_cam_settings.backup.json)
// and the next BP reading uses it right away.

const FIELDS = ['SYS', 'DIA', 'PUL'];
const BOX_COLORS = { SYS: '#e5484d', DIA: '#30a46c', PUL: '#3e8ed0' };
const MAIN = [
  { key: 'c', hint: 'raise to hide ghost segments' },
  { key: 'block', hint: 'threshold size' },
  { key: 'exposure', hint: '0 = auto' },
  { key: 'shear', hint: 'straightens slanted digits' },
  { key: 'seg_on', hint: '% lit to count a segment' },
];
const MORE = [
  { key: 'channel', hint: '0 gray · 1 blue · 2 green · 3 red' },
  { key: 'clahe', hint: 'contrast boost' },
  { key: 'blur', hint: '0 = off' },
  { key: 'close', hint: 'joins broken segments' },
];
const STEP = { exposure: 50 }; // everything else: 1

// The picture's size and shape are set HERE (inline), not in kiosk.css: the box
// always has the camera's own width:height, so the picture is never stretched or
// squashed and the boxes you drag line up with the real camera pixels.
// kiosk.css only adds looks (rounded corners, background).
const CAM_BOX = {
  position: 'relative',
  width: '100%',
  height: 'auto',
  minHeight: 0,
  maxHeight: 'none',
  flex: '0 0 auto',
  overflow: 'hidden',
  touchAction: 'none',
};
const CAM_IMG = {
  position: 'absolute',
  inset: 0,
  display: 'block',
  width: '100%',
  height: '100%',
  objectFit: 'contain',
  pointerEvents: 'none',
};
const KEEPALIVE_MS = 30000;

export default function DevBpCamera({ token, onBack }) {
  const { agent, send } = useDev(token);
  const [info, setInfo] = useState(null); // settings / saved / sliders / frame / light
  const [readings, setReadings] = useState({});
  const [frame, setFrame] = useState(null); // [W, H] of the camera picture
  const [imgUrl, setImgUrl] = useState(null);
  const [target, setTarget] = useState('SYS');
  const [drag, setDrag] = useState(null); // box being drawn, in camera pixels
  const [more, setMore] = useState(false);
  const [msg, setMsg] = useState({ tone: 'info', text: 'Opening the BP camera…' });
  const [busy, setBusy] = useState(false);
  const area = useRef(null);
  const urlRef = useRef(null);

  // open the camera while this screen is shown
  useEffect(() => {
    if (!agent) return undefined;
    let alive = true;
    const offData = agent.onDev((m) => {
      if (m.kind !== 'bpcam') return;
      if (m.problem) setMsg({ tone: 'bad', text: m.problem });
      if (m.readings) setReadings(m.readings);
      if (m.frame) setFrame(m.frame);
    });
    const offPreview = agent.onDevPreview((jpg) => {
      const url = URL.createObjectURL(new Blob([jpg], { type: 'image/jpeg' }));
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      setImgUrl(url);
    });
    send('dev_bpcam', { op: 'start' }, 15000).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setInfo(r);
        setMsg({ tone: 'info', text: 'Turn the BP monitor on so it shows numbers.' });
      } else setMsg({ tone: 'bad', text: r.message });
    });
    const timer = setInterval(() => send('dev_bpcam', { op: 'keepalive' }), KEEPALIVE_MS);
    return () => {
      alive = false;
      offData();
      offPreview();
      clearInterval(timer);
      send('dev_bpcam', { op: 'stop' }); // camera closed, light off
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    };
  }, [agent, send]);

  const change = async (settings) => {
    const r = await send('dev_bpcam', { op: 'set', settings });
    if (r.ok) setInfo(r);
    else setMsg({ tone: 'bad', text: r.message });
  };

  // ---- drawing a box on the picture ----
  const toCam = (e) => {
    const rect = area.current.getBoundingClientRect();
    const [W, H] = frame;
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * W;
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)) * H;
    return [x, y];
  };
  const down = (e) => {
    if (!frame) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = toCam(e);
    setDrag({ start: p, end: p });
  };
  const move = (e) => drag && setDrag((d) => ({ ...d, end: toCam(e) }));
  const up = () => {
    if (!drag) return;
    const [x1, y1] = drag.start;
    const [x2, y2] = drag.end;
    setDrag(null);
    const box = [Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)].map(Math.round);
    if (box[2] < 10 || box[3] < 10) return; // a tap, not a drag
    change({ rois: { [target]: box } }).then(() => {
      const next = FIELDS.find((f) => f !== target && !info?.settings?.rois?.[f]);
      if (next) setTarget(next);
    });
  };

  const save = async () => {
    setBusy(true);
    const r = await send('dev_bpcam', { op: 'save' });
    setBusy(false);
    if (r.ok) {
      setInfo(r);
      setMsg({ tone: 'ok', text: 'Saved. The next BP reading uses these settings.' });
    } else setMsg({ tone: 'bad', text: r.message });
  };
  const undo = async () => {
    const r = await send('dev_bpcam', { op: 'reset' });
    if (r.ok) {
      setInfo(r);
      setMsg({ tone: 'info', text: 'Back to the saved settings.' });
    }
  };
  const light = () => send('dev_bpcam', { op: 'light', on: !info?.light }).then((r) => r.ok && setInfo(r));

  const s = info?.settings;
  const changed = info && JSON.stringify(info.settings) !== JSON.stringify(info.saved);
  const pct = (v, max) => `${Math.round((100 * v) / max)}%`;
  const boxStyle = (b, field) => {
    const [W, H] = frame;
    return {
      left: pct(b[0], W),
      top: pct(b[1], H),
      width: pct(b[2], W),
      height: pct(b[3], H),
      borderColor: BOX_COLORS[field],
    };
  };
  const dragBox = drag && [
    Math.min(drag.start[0], drag.end[0]),
    Math.min(drag.start[1], drag.end[1]),
    Math.abs(drag.end[0] - drag.start[0]),
    Math.abs(drag.end[1] - drag.start[1]),
  ];

  const sliderRow = ({ key, hint }) => {
    const max = info.sliders[key];
    const step = STEP[key] || 1;
    const v = s[key];
    return (
      <div key={key} className="k-dev__slider">
        <span className="k-dev__slider-name">
          <span>{key}</span>
          <span className="k-dev__slider-hint">{hint}</span>
        </span>
        <button
          type="button"
          className="k-dev__step-btn k-dev__step-btn--small"
          aria-label={`Lower ${key}`}
          disabled={v <= 0}
          onClick={() => change({ [key]: Math.max(0, v - step) })}
        >
          −
        </button>
        <span className="k-dev__slider-bar">
          <span style={{ width: pct(v, max) }} />
        </span>
        <span className="k-dev__slider-value">{v}</span>
        <button
          type="button"
          className="k-dev__step-btn k-dev__step-btn--small"
          aria-label={`Raise ${key}`}
          disabled={v >= max}
          onClick={() => change({ [key]: Math.min(max, v + step) })}
        >
          +
        </button>
      </div>
    );
  };

  return (
    <DevScreen
      title="Blood pressure camera"
      color="bp"
      sub="Turn the BP monitor on so it shows numbers, then draw a box around each number."
      onBack={onBack}
      bottom={
        <>
          <button type="button" className="k-dev__system" disabled={!changed || busy} onClick={undo}>
            Undo changes
          </button>
          <button type="button" className="k-dev__system k-dev__system--primary" disabled={!changed || busy} onClick={save}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      <div
        ref={area}
        className="k-dev__cam"
        style={{ ...CAM_BOX, aspectRatio: frame ? `${frame[0]} / ${frame[1]}` : '16 / 9' }}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setDrag(null)}
      >
        {imgUrl ? (
          <img src={imgUrl} alt="BP camera" className="k-dev__cam-img" style={CAM_IMG} draggable={false} />
        ) : (
          <span className="k-dev__cam-wait">Waiting for the camera…</span>
        )}
        {frame &&
          s &&
          FIELDS.map((f) =>
            s.rois[f] ? (
              <span key={f} className="k-dev__cam-box" style={boxStyle(s.rois[f], f)}>
                <span className="k-dev__cam-tag" style={{ background: BOX_COLORS[f] }}>
                  {f}
                </span>
              </span>
            ) : null
          )}
        {dragBox && frame && (
          <span className="k-dev__cam-box k-dev__cam-box--drag" style={boxStyle(dragBox, target)} />
        )}
        {info && <span className="k-dev__cam-live">LIVE · light {info.light ? 'on' : 'off'}</span>}
      </div>

      <div className="k-dev__fields">
        {FIELDS.map((f) => (
          <button
            key={f}
            type="button"
            className={`k-dev__field${target === f ? ' is-active' : ''}`}
            style={{ '--field': BOX_COLORS[f] }}
            onClick={() => setTarget(f)}
          >
            {f}
            {s?.rois[f] ? ' ✓' : ''}
          </button>
        ))}
        <button type="button" className="k-dev__field k-dev__field--plain" disabled={!info} onClick={light}>
          Light {info?.light ? 'off' : 'on'}
        </button>
      </div>
      <p className="k-dev__muted k-dev__note">Tap SYS, DIA or PUL, then drag on the picture. Drag again to redo a box.</p>

      <div className="k-dev__reads">
        {FIELDS.map((f) => (
          <span key={f}>
            <span className="k-dev__live-label">{f} reads</span>
            <span className="k-dev__reads-value">
              {readings[f]?.text || '--'}
              {readings[f]?.steady ? ' ✓' : ''}
            </span>
          </span>
        ))}
        <span className="k-dev__live-note">✓ = the same number 5 frames in a row (steady)</span>
      </div>

      {s && info.sliders && (
        <div className="k-dev__sliders">
          {MAIN.map(sliderRow)}
          {more && MORE.map(sliderRow)}
          <button type="button" className="k-dev__chip-btn" onClick={() => setMore((m) => !m)}>
            {more ? 'Fewer settings' : 'More settings (channel, contrast, blur, close)'}
          </button>
        </div>
      )}
      <DevMessage tone={msg.tone}>{msg.text}</DevMessage>
    </DevScreen>
  );
}
