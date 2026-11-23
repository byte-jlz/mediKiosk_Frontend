import { useState } from 'react';
import {
  DevMessage,
  DevScanStatus,
  DevScreen,
  NumberField,
  SaveUndo,
  Stepper,
  fmtSigned,
  useCalDraft,
  useDev,
  useDevScan,
} from './devCommon';

// SpO2 calibration: SPO2_OFFSET in hardware/calibration.json (added to the sensor's
// own SpO2, never above 100 %). Take a finger reading here (the same 30 s finger
// step as the kiosk, nothing is saved) with a medical pulse oximeter on another
// finger, type the oximeter's number, and the offset is worked out.

export default function DevSpo2({ token, onBack }) {
  const { agent, send } = useDev(token);
  const draft = useCalDraft(send, ['SPO2_OFFSET']);
  const scan = useDevScan(agent, 'respirationSpo2Hr');
  const [oxi, setOxi] = useState('');

  const rawPct = scan.state.phase === 'done' ? scan.state.result.values?.spo2_raw_pct : null;
  const offset = draft.draft?.SPO2_OFFSET;

  const useOximeter = (n) => {
    setOxi(n);
    if (n < 70 || n > 100) {
      draft.setMsg({ tone: 'bad', text: 'An oximeter shows 70-100 %. Check the number.' });
      return;
    }
    if (rawPct == null) {
      draft.setMsg({ tone: 'bad', text: 'Take a kiosk reading first (Measure now).' });
      return;
    }
    const newOffset = Math.round(n - rawPct);
    draft.setDraft({ SPO2_OFFSET: newOffset });
    draft.setMsg({
      tone: 'info',
      text: `${n} − ${rawPct.toFixed(1)} = ${fmtSigned(newOffset, 0, '%')}. One comparison is a quick fix - 5-10 on different people is much safer.`,
    });
  };

  return (
    <DevScreen
      title="SpO₂"
      color="breath"
      sub="Put a medical pulse oximeter on one hand and the kiosk finger sensor on the other."
      onBack={onBack}
      bottom={draft.draft && <SaveUndo draft={draft} onSave={() => draft.save(oxi ? `spo2, oximeter ${oxi} %` : 'spo2 offset')} />}
    >
      {draft.error && <DevMessage tone="bad">{draft.error}</DevMessage>}
      {draft.draft && (
        <>
          <div className="k-dev__live">
            <div>
              <span className="k-dev__live-label">Sensor's own SpO₂</span>
              <span className="k-dev__live-value">{rawPct != null ? `${rawPct.toFixed(1)} %` : '--'}</span>
            </div>
            <div>
              <span className="k-dev__live-label">Patient would see</span>
              <span className="k-dev__live-value k-dev__live-value--accent">
                {rawPct != null ? `${Math.min(100, rawPct + offset).toFixed(0)} %` : '--'}
              </span>
            </div>
            <span className="k-dev__live-note">The kiosk never shows more than 100 %.</span>
          </div>

          {scan.state.phase === 'running' ? (
            <DevScanStatus scan={scan} label="Finger reading (about 30 s)" />
          ) : (
            <button type="button" className="k-dev__system k-dev__wide" onClick={scan.start}>
              {scan.state.phase === 'idle' ? 'Measure now' : 'Measure again'}
            </button>
          )}
          {scan.state.phase === 'failed' && <DevMessage tone="bad">{scan.state.message}</DevMessage>}

          <h2 className="k-dev__section">COMPARE WITH THE OXIMETER</h2>
          <NumberField label="Oximeter reading" unit="%" value={oxi} onChange={useOximeter} />

          <h2 className="k-dev__section">OFFSET</h2>
          <Stepper
            label="offset"
            value={offset}
            step={1}
            min={-10}
            max={15}
            format={(v) => (v === 0 ? 'Off (0 %)' : fmtSigned(v, 0, '%'))}
            onChange={(v) => draft.setDraft({ SPO2_OFFSET: v })}
          />
          <DevMessage tone={draft.msg.tone}>{draft.msg.text}</DevMessage>
          <p className="k-dev__muted k-dev__note">
            Saved on the Pi in calibration.json · now{' '}
            {draft.saved.SPO2_OFFSET === 0 ? 'off' : fmtSigned(draft.saved.SPO2_OFFSET, 0, '%')}
          </p>
        </>
      )}
    </DevScreen>
  );
}
