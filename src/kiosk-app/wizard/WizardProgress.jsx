import { STEP_BY_KEY } from './kioskSteps';

/**
 * Progress header for the kiosk check-in.
 *   order       step keys in the CURRENT order (a skipped step moves to the end)
 *   position    index in `order` (order.length = the results screen)
 *   done        { key: true } for steps that have a reading
 *   missing     [key, ...] steps the patient finished without
 */
export default function WizardProgress({ order, position, done, missing, patientName }) {
  const labels = [...order.map((key) => STEP_BY_KEY[key].label), 'Results'];
  const total = labels.length;
  const percent = Math.round(((position + 1) / total) * 100);

  return (
    <div className="mk-wizard-progress">
      <p className="mk-wizard-progress__welcome">Welcome, {patientName}</p>
      <p className="mk-wizard-progress__patient">Health check-in</p>

      <div className="mk-wizard-progress__meta">
        <span>
          Step {Math.min(position + 1, total)} of {total}
        </span>
        <span>{percent}% complete</span>
      </div>
      <div className="mk-wizard-progress__track">
        <div className="mk-wizard-progress__fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="mk-wizard-progress__steps">
        {labels.map((label, i) => {
          const key = order[i];
          const isDone = key && done[key];
          const isMissing = key && missing.includes(key);
          const active = i === position;
          return (
            <div key={label} className="mk-wizard-progress__step">
              <div
                className={`mk-wizard-progress__circle${isDone ? ' is-done' : ''}${
                  isMissing ? ' is-missing' : ''
                }${active ? ' is-active' : ''}`}
              >
                {isDone ? '✓' : isMissing ? '–' : i + 1}
              </div>
              <span className={`mk-wizard-progress__label${active ? ' is-active' : ''}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
