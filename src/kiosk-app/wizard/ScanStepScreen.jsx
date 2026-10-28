import Button from '../../components/Button';
import { CONFIRM_PROMPTS, formatLive } from './kioskSteps';

/**
 * One kiosk check-in step.
 *
 * run.phase:
 *   'idle'      not started yet            -> Start (+ Skip for now)
 *   'starting'  command sent to the agent
 *   'awaiting'  agent waits for the person -> instruction + "I'm ready" button
 *   'running'   measuring                  -> countdown + live value
 *   'done'      got a reading              -> values + Continue
 *   'failed'    no reading                 -> reason + Try again (+ Skip / Continue without it)
 */
export default function ScanStepScreen({
  step,
  run,
  reading,
  sensorsReady,
  sensorsMessage,
  canSkip,
  canGiveUp,
  onStart,
  onConfirm,
  onContinue,
  onRetry,
  onSkip,
  onGiveUp,
}) {
  const busy = run.phase === 'starting' || run.phase === 'running' || run.phase === 'awaiting';
  const prompt = run.phase === 'awaiting' ? CONFIRM_PROMPTS[run.prompt?.step] : null;
  const values = reading ? step.values(reading).filter(Boolean) : [];
  const live = formatLive(run.tick?.live);

  let instruction = step.description;
  if (run.phase === 'awaiting') instruction = prompt?.text || run.prompt?.message;
  else if (run.phase === 'running') instruction = step.measuring;
  else if (run.phase === 'starting') instruction = 'Getting the sensors ready…';
  else if (run.phase === 'done') instruction = 'Done! Here is your reading.';

  return (
    <div className="mk-vital-step mk-vital-step--readout-in-panel">
      <div className="mk-vital-step__panel mk-vital-step__panel--with-extra" style={{ background: step.accentBg }}>
        <div className="mk-vital-step__icon" style={{ background: step.accent }}>
          {step.icon}
        </div>
        <h2 className="mk-vital-step__title">{step.label}</h2>
        <p className={`mk-vital-step__desc${run.phase === 'awaiting' ? ' mk-scan__instruction' : ''}`}>
          {instruction}
        </p>

        {run.phase === 'idle' && <p className="mk-scan__hint">Takes {step.duration}.</p>}

        {run.phase === 'failed' && (
          <div className="mk-scan__error" role="alert">
            <strong>We couldn't get a reading.</strong>
            <span>{run.error}</span>
          </div>
        )}

        {!sensorsReady && !busy && run.phase !== 'done' && (
          <div className="mk-scan__error" role="status">
            <span>{sensorsMessage}</span>
          </div>
        )}

        <div className="mk-vital-step__actions">
          {run.phase === 'idle' && (
            <Button variant="accent" accentColor={step.accent} onClick={onStart} disabled={!sensorsReady}>
              Start →
            </Button>
          )}
          {run.phase === 'awaiting' && (
            <Button variant="accent" accentColor={step.accent} onClick={onConfirm}>
              {prompt?.button || "I'm ready"} ✓
            </Button>
          )}
          {run.phase === 'done' && (
            <Button variant="accent" accentColor={step.accent} onClick={onContinue}>
              Continue →
            </Button>
          )}
          {run.phase === 'failed' && (
            <Button variant="accent" accentColor={step.accent} onClick={onRetry} disabled={!sensorsReady}>
              ↻ Try again
            </Button>
          )}
          {(run.phase === 'idle' || run.phase === 'failed') && canSkip && (
            <Button variant="secondary" onClick={onSkip}>
              Skip for now
            </Button>
          )}
          {(run.phase === 'idle' || run.phase === 'failed') && canGiveUp && (
            <Button variant="secondary" onClick={onGiveUp}>
              Continue without it
            </Button>
          )}
        </div>

        <div className="mk-vital-step__extra">
          <div className="mk-vital-step__readout">
            <div className={`mk-vital-step__dial${busy ? ' is-scanning' : ''}`}>
              {run.phase === 'running' && run.tick ? (
                <span className="mk-scan__countdown">
                  {Math.ceil(run.tick.secondsLeft)}
                  <small>sec</small>
                </span>
              ) : busy ? (
                <span className="mk-vital-step__spinner" aria-hidden="true" />
              ) : values.length ? (
                <span className="mk-vital-step__value">{values[0].value}</span>
              ) : (
                <span className="mk-vital-step__value">—</span>
              )}
            </div>
            <p className="mk-vital-step__unit">
              {run.phase === 'running' ? live || ' ' : values.length ? values[0].unit : ' '}
            </p>
            <p className="mk-vital-step__unit-label">{step.unitLabel}</p>

            {values.length > 1 && (
              <dl className="mk-scan__values">
                {values.slice(1).map((v) => (
                  <div key={v.label}>
                    <dt>{v.label}</dt>
                    <dd>
                      {v.value} <span>{v.unit}</span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
