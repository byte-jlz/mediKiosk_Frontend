import { useEffect, useState } from 'react';
import { DevMessage, DevScreen, NumberField, SaveUndo, Stepper, fmtSigned, useCalDraft, useDev } from './devCommon';

// Temperature calibration: TEMP_OFFSET_C in hardware/calibration.json.
// The live wrist reading comes from the agent's live/temp feed (raw_c = before the offset).
// Option A: nudge the offset. Option B: type an armpit thermometer reading taken
// at the same time (armpit), and the offset is worked out from the live wrist reading.

export default function DevTemperature({ token, onBack }) {
  const { agent, send } = useDev(token);
  const draft = useCalDraft(send, ['TEMP_OFFSET_C']);
  const [live, setLive] = useState(null);
  const [refC, setRefC] = useState('');

  useEffect(() => (agent ? agent.onLiveTemp(setLive) : undefined), [agent]);

  const offset = draft.draft?.TEMP_OFFSET_C;
  const raw = live?.raw_c;
  const roomC = live?.ambient_c;
  const wristThere = raw != null && roomC != null && raw - roomC >= 1.5;

  const useReference = (n) => {
    setRefC(n);
    if (n < 34 || n > 42) {
      draft.setMsg({ tone: 'bad', text: `${n} °C isn’t a body temperature - type it in °C (34-42).` });
      return;
    }
    if (raw == null || !wristThere) {
      draft.setMsg({ tone: 'bad', text: 'Hold the wrist under the sensor first, then type the thermometer reading.' });
      return;
    }
    const newOffset = Math.round((n - raw) * 10) / 10;
    draft.setDraft({ TEMP_OFFSET_C: newOffset });
    draft.setMsg({
      tone: newOffset < 0 || newOffset > 6 ? 'bad' : 'info',
      text:
        `${n.toFixed(1)} − ${raw.toFixed(1)} = ${fmtSigned(newOffset, 1, '°C')}` +
        (newOffset < 0 || newOffset > 6 ? ' - unusual (normally +1 to +4 °C). Check and try again.' : '. Tap Save to keep it.'),
    });
  };

  return (
    <DevScreen
      title="Temperature"
      color="temp"
      sub="Hold the right wrist 2–5 cm under the top sensor."
      onBack={onBack}
      bottom={draft.draft && <SaveUndo draft={draft} onSave={() => draft.save(refC ? `temp, thermometer ${refC} °C` : 'temp offset')} />}
    >
      {draft.error && <DevMessage tone="bad">{draft.error}</DevMessage>}
      {draft.draft && (
        <>
          <div className="k-dev__live">
            <div>
              <span className="k-dev__live-label">Sensor now (live)</span>
              <span className="k-dev__live-value">{raw != null ? `${raw.toFixed(1)} °C` : '--'}</span>
            </div>
            <div>
              <span className="k-dev__live-label">Patient would see</span>
              <span className="k-dev__live-value k-dev__live-value--accent">
                {raw != null ? `${(raw + offset).toFixed(1)} °C` : '--'}
              </span>
            </div>
            <span className="k-dev__live-note">
              {live
                ? `Room ${roomC != null ? roomC.toFixed(1) : '--'} °C · ${wristThere ? 'wrist detected' : 'no wrist yet'}`
                : 'Waiting for the live sensor…'}
            </span>
          </div>

          <h2 className="k-dev__section">OPTION A · SET THE OFFSET</h2>
          <Stepper
            label="offset"
            value={offset}
            step={0.1}
            min={-2}
            max={8}
            format={(v) => fmtSigned(v, 1, '°C')}
            onChange={(v) => draft.setDraft({ TEMP_OFFSET_C: v })}
          />

          <h2 className="k-dev__section">OPTION B · COMPARE WITH A THERMOMETER</h2>
          <NumberField label="3rd party thermometer reading" unit="°C" value={refC} onChange={useReference} />
          <DevMessage tone={draft.msg.tone}>{draft.msg.text}</DevMessage>
          <p className="k-dev__muted k-dev__note">
            Saved on the Pi in calibration.json · now {fmtSigned(draft.saved.TEMP_OFFSET_C, 1, '°C')}
          </p>
        </>
      )}
    </DevScreen>
  );
}
