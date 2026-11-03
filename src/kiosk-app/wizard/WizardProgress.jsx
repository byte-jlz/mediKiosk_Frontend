import { STEP_BY_KEY } from './kioskSteps';

/**
 * Vertical progress rail for the kiosk check-in (left side of the portrait screen).
 *   order       step keys in the CURRENT order (a skipped step moves to the end)
 *   position    index in `order` (order.length = the results screen)
 *   done        { key: true } for steps that have a reading
 *   missing     [key, ...] steps the patient finished without
 */
export default function WizardProgress({ order, position, done, missing }) {
  const steps = [...order.map((key) => ({ key, label: STEP_BY_KEY[key].label })), { key: null, label: 'Results' }];
  const total = steps.length;
  const current = Math.min(position, total - 1);
  const percent = Math.round(((current + 1) / total) * 100);
  // The colored line runs from the first circle down to the current one.
  const fill = total > 1 ? (current / (total - 1)) * 100 : 0;

  return (
    <nav className="mk-vprogress" aria-label="Check-in progress">
      <div className="mk-vprogress__summary">
        <span className="mk-vprogress__percent">{percent}%</span>
        <span className="mk-vprogress__count">
          Step {current + 1} of {total}
        </span>
      </div>

      <ol className="mk-vprogress__steps">
        <span className="mk-vprogress__track" aria-hidden="true">
          <span className="mk-vprogress__fill" style={{ height: `${fill}%` }} />
        </span>

        {steps.map((s, i) => {
          const isDone = s.key && done[s.key];
          const isMissing = s.key && missing.includes(s.key);
          const active = i === current;
          const state = active ? 'is-active' : isDone ? 'is-done' : isMissing ? 'is-missing' : '';
          return (
            <li key={s.label} className={`mk-vprogress__step ${state}`} aria-current={active ? 'step' : undefined}>
              <span className="mk-vprogress__circle">{isDone && !active ? '✓' : isMissing && !active ? '–' : i + 1}</span>
              <span className="mk-vprogress__label">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
