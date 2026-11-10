import Icon from '../ui/Icon';
import { KIOSK_STEPS } from './kioskSteps';

/**
 * The step bar at the top of every check-in screen:
 *   "Reading 2 of 4" .................. "35% complete"
 *   (✓)──(2)──(3)──(4)   one dot per reading, in its own color
 *
 *   current  index of the reading on screen
 *   done     Set of step keys that have a reading
 *   skipped  Set of step keys a guest skipped
 *   frac     how far the current reading is (0..1) - fills the line after its dot
 */
export default function StepProgress({ current, done, skipped, frac = 0 }) {
  const finished = done.size + skipped.size;
  const currentKey = KIOSK_STEPS[current]?.key;
  const currentCounted = done.has(currentKey) || skipped.has(currentKey);
  const percent = Math.min(100, Math.round(((finished + (currentCounted ? 0 : frac)) / KIOSK_STEPS.length) * 100));
  const color = KIOSK_STEPS[Math.min(current, KIOSK_STEPS.length - 1)].color;

  return (
    <nav className="k-progress" aria-label="Check-in progress">
      <div className="k-progress__summary" data-color={color}>
        <span className="k-progress__count">
          {percent >= 100 ? 'All readings done' : `Reading ${current + 1} of ${KIOSK_STEPS.length}`}
        </span>
        <span className="k-progress__percent">
          <strong>{percent}%</strong> complete
        </span>
      </div>

      <ol className="k-progress__steps">
        {KIOSK_STEPS.map((s, i) => {
          const isDone = done.has(s.key);
          const isSkipped = skipped.has(s.key);
          const isCurrent = i === current && !isDone && !isSkipped;
          const state = isSkipped ? 'skipped' : isDone ? 'done' : isCurrent ? 'current' : 'todo';
          const lineFill = isDone || isSkipped ? 100 : i === current ? frac * 100 : 0;
          return (
            <li key={s.key} className={`k-progress__step is-${state}`} data-color={s.color}
              aria-current={i === current ? 'step' : undefined}>
              <div className="k-progress__item">
                <span className="k-progress__dot">
                  {state === 'done' ? <Icon name="check" size={30} stroke={2.6} /> : state === 'skipped' ? '–' : i + 1}
                </span>
                <span className="k-progress__label">{s.label}</span>
              </div>
              {i < KIOSK_STEPS.length - 1 && (
                <span className="k-progress__line" aria-hidden="true">
                  <span style={{ width: `${lineFill}%` }} />
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
