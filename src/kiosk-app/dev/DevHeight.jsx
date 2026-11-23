import { useEffect, useState } from 'react';
import { DevMessage, DevScanStatus, DevScreen, NumberField, SaveUndo, useCalDraft, useDev, useDevScan } from './devCommon';

// Height calibration: SENSOR_MOUNT_MM + TOF_SCALE in hardware/calibration.json,
//   height_mm = SENSOR_MOUNT_MM - TOF_SCALE * raw_distance_mm
// Same method as sensor_test.py --calibrate-height: people of KNOWN height (measured
// against a wall, no shoes) stand under the sensor. 1 person = offset only;
// 2-3 people of different heights also fixes the scale.

function fit(points) {
  const xs = points.map((p) => p.rawMm);
  const ys = points.map((p) => p.knownMm);
  let scale = 1;
  let mount;
  if (points.length === 1 || Math.max(...xs) - Math.min(...xs) < 100) {
    mount = points.reduce((a, p) => a + p.knownMm + p.rawMm, 0) / points.length;
  } else {
    const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const my = ys.reduce((a, b) => a + b, 0) / ys.length;
    const slope =
      points.reduce((a, p) => a + (p.rawMm - mx) * (p.knownMm - my), 0) /
      xs.reduce((a, x) => a + (x - mx) ** 2, 0);
    scale = -slope;
    mount = my + scale * mx;
  }
  const worst = Math.max(...points.map((p) => Math.abs(mount - scale * p.rawMm - p.knownMm)));
  const problems = [];
  if (scale < 0.9 || scale > 1.1) problems.push(`scale ${scale.toFixed(3)} is far from 1.0 (a typo in a height, or something else in the beam)`);
  if (worst > 20) problems.push(`a point is ${(worst / 10).toFixed(1)} cm off after fitting`);
  return { mount: Math.round(mount), scale: Math.round(scale * 10000) / 10000, worst, problems };
}

export default function DevHeight({ token, onBack }) {
  const { agent, send } = useDev(token);
  const draft = useCalDraft(send, ['SENSOR_MOUNT_MM', 'TOF_SCALE']);
  const scan = useDevScan(agent, 'height');
  const [knownCm, setKnownCm] = useState('');
  const [points, setPoints] = useState([]);

  // a finished reading becomes a point (once)
  const result = scan.state.phase === 'done' ? scan.state.result : null;
  useEffect(() => {
    if (!result) return;
    const rawMm = result.values?.raw_mm;
    if (rawMm != null && knownCm !== '') {
      const next = [...points, { knownMm: knownCm * 10, rawMm }];
      setPoints(next);
      const f = fit(next);
      draft.setDraft({ SENSOR_MOUNT_MM: f.mount, TOF_SCALE: f.scale });
      draft.setMsg(
        f.problems.length
          ? { tone: 'bad', text: `These points don’t agree: ${f.problems.join('; ')}. Remove the odd one or redo it.` }
          : { tone: 'info', text: `Fit from ${next.length} point${next.length > 1 ? 's' : ''}: worst ${(f.worst / 10).toFixed(1)} cm. Tap Save to keep it.` }
      );
      setKnownCm('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  const removePoint = (i) => {
    const next = points.filter((_, j) => j !== i);
    setPoints(next);
    if (next.length) {
      const f = fit(next);
      draft.setDraft({ SENSOR_MOUNT_MM: f.mount, TOF_SCALE: f.scale });
    } else {
      draft.setDraft(draft.saved);
    }
  };

  const f = points.length ? fit(points) : null;
  const d = draft.draft;
  const startPoint = () => {
    if (knownCm === '') {
      draft.setMsg({ tone: 'bad', text: 'Type the person’s real height first.' });
      return;
    }
    scan.start();
  };

  return (
    <DevScreen
      title="Height"
      color="bmi"
      sub="Use people of known height (measured against a wall, no shoes). 2–3 people of different heights is best."
      onBack={onBack}
      bottom={
        d && (
          <SaveUndo
            draft={draft}
            blocked={Boolean(f?.problems.length)}
            onSave={() => draft.save(`height, ${points.length} points, worst ${(f.worst / 10).toFixed(1)} cm`)}
          />
        )
      }
    >
      {draft.error && <DevMessage tone="bad">{draft.error}</DevMessage>}
      {d && (
        <>
          <div className="k-dev__live">
            <div>
              <span className="k-dev__live-label">Sensor height</span>
              <span className="k-dev__live-value">{(d.SENSOR_MOUNT_MM / 10).toFixed(1)} cm</span>
            </div>
            <div>
              <span className="k-dev__live-label">Scale</span>
              <span className="k-dev__live-value">{d.TOF_SCALE.toFixed(4)}</span>
            </div>
            <span className="k-dev__live-note">
              Saved now: {(draft.saved.SENSOR_MOUNT_MM / 10).toFixed(1)} cm · {draft.saved.TOF_SCALE.toFixed(4)}
            </span>
          </div>

          <h2 className="k-dev__section">ADD A PERSON</h2>
          <NumberField label="Their real height" unit="cm" value={knownCm} onChange={(n) => setKnownCm(n)} />
          {scan.state.phase === 'running' ? (
            <DevScanStatus scan={scan} label="Height reading" />
          ) : (
            <button type="button" className="k-dev__system k-dev__wide" onClick={startPoint}>
              Measure this person
            </button>
          )}
          {scan.state.phase === 'failed' && <DevMessage tone="bad">{scan.state.message}</DevMessage>}

          {points.length > 0 && (
            <ul className="k-dev__points">
              {points.map((p, i) => (
                <li key={i}>
                  <span>
                    Real {(p.knownMm / 10).toFixed(1)} cm · kiosk now {((f.mount - f.scale * p.rawMm) / 10).toFixed(1)} cm
                  </span>
                  <button type="button" className="k-dev__chip-btn" onClick={() => removePoint(i)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <DevMessage tone={draft.msg.tone}>{draft.msg.text}</DevMessage>
        </>
      )}
    </DevScreen>
  );
}
