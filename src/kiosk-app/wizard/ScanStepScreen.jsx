import Icon from '../ui/Icon';
import BmiScene from './BmiScene';
import { IconTile, KioskButton, Note, NumberedList, Pill, Spacer } from '../ui/KioskUI';
import { CONFIRM_PROMPTS, formatLive, readingDisplay } from './kioskSteps';

/**
 * One reading of the check-in. What it shows depends on run.phase:
 *
 *   'idle'      intro: what happens, tips          -> Start measuring
 *   'starting'  command sent, waiting for the agent -> "Getting the sensors ready…"
 *   'awaiting'  the agent waits for the person      -> "Your turn" + I'm ready button
 *   'running'   measuring                           -> countdown ring (BMI: weight / height rows)
 *   'done'      got a reading                       -> the values + Next
 *   'failed'    no reading                          -> reason + Try again
 *
 * Registered patients can't skip (every reading is required).
 * Guests get "Skip this reading" on the intro and failed screens.
 *
 * BMI (Nov 2026, auto-zero scale): 'awaiting' / 'running' / 'done' show the
 * BmiScene picture. Normally there is no prompt at all - the patient stays on
 * the platform. The step off / step on prompts only come in the safety
 * fallback, and then the agent finishes them by itself (prompt.auto): the
 * button is shown as a smaller backup.
 */
export default function ScanStepScreen({
  step,
  run,
  reading,
  isGuest,
  isLast,
  sensorsReady,
  sensorsMessage,
  onStart,
  onConfirm,
  onContinue,
  onSkip,
}) {
  return (
    <div className="k-step" key={`${step.key}-${run.phase}`}>
      <div className="k-step__heading">
        <IconTile icon={step.icon} size={132} />
        <h1 className="k-h1 k-h1--step">{step.title}</h1>
      </div>
      <Body
        step={step}
        run={run}
        reading={reading}
        isGuest={isGuest}
        isLast={isLast}
        sensorsReady={sensorsReady}
        sensorsMessage={sensorsMessage}
        onStart={onStart}
        onConfirm={onConfirm}
        onContinue={onContinue}
        onSkip={onSkip}
      />
    </div>
  );
}

function Body({ step, run, reading, isGuest, isLast, sensorsReady, sensorsMessage, ...on }) {
  const skipButton = isGuest && (
    <KioskButton variant="secondary" icon="skip" onClick={on.onSkip}>
      Skip this reading
    </KioskButton>
  );
  // Shown under the main button while the sensors / server aren't ready.
  const sensorsNote = !sensorsReady && (
    <Note icon="alert" className="k-note--warn" role="status">
      {sensorsMessage}
    </Note>
  );

  switch (run.phase) {
    case 'starting':
      return (
        <>
          <Spacer />
          <div className="k-panel k-panel--center k-panel--tint">
            <span className="k-spinner" aria-hidden="true" />
            <p className="k-panel__title">Getting the sensors ready…</p>
          </div>
          <Spacer />
        </>
      );

    case 'awaiting': {
      const prompt = CONFIRM_PROMPTS[run.prompt?.step] || { text: run.prompt?.message, button: 'I’m ready' };
      if (step.key === 'bmi') return <BmiAwaiting run={run} prompt={prompt} onConfirm={on.onConfirm} />;
      return (
        <>
          <Spacer />
          <div className="k-panel k-panel--turn">
            <span className="k-badge">
              <span className="k-badge__dot" />
              YOUR TURN
            </span>
            <p className="k-panel__big">{prompt.text}</p>
            {prompt.sub && <p className="k-panel__sub">{prompt.sub}</p>}
          </div>
          {prompt.pill && <Pill>{prompt.pill}</Pill>}
          <Spacer />
          <KioskButton icon="check" onClick={on.onConfirm}>
            {prompt.button}
          </KioskButton>
        </>
      );
    }

    case 'running':
      if (step.key === 'bmi') return <BmiRunning run={run} step={step} />;
      return (
        <>
          <Spacer />
          <TimerRing run={run} step={step} />
          <div className="k-measuring">
            <p className="k-measuring__title">{step.measuring}</p>
            <p className="k-measuring__hint">{step.measuringHint}</p>
          </div>
          <Spacer />
        </>
      );

    case 'done': {
      if (step.key === 'bmi') {
        return (
          <>
            <Spacer />
            <div className="k-panel k-panel--center k-panel--tint k-panel--scene">
              <p className="k-reading__ok">
                <Icon name="check" size={34} stroke={2.6} />
                Reading complete
              </p>
              <BmiScene
                mode="done"
                weight={reading?.weight?.value}
                heightCm={reading?.height?.value}
                bmi={reading?.value}
              />
            </div>
            <p className="k-after">You can step off the platform now.</p>
            <Spacer />
            <KioskButton icon="arrow" onClick={on.onContinue}>
              {isLast ? 'See my results' : 'Next reading'}
            </KioskButton>
          </>
        );
      }
      const d = readingDisplay(step.key, reading);
      return (
        <>
          <Spacer />
          <div className="k-panel k-panel--center k-panel--tint k-reading">
            <p className="k-reading__ok">
              <Icon name="check" size={34} stroke={2.6} />
              Reading complete
            </p>
            {d?.main && (
              <p className={`k-reading__value${String(d.main.value).length > 5 ? ' k-reading__value--long' : ''}`}>
                {d.main.value}
                <span> {d.main.unit}</span>
              </p>
            )}
            {d?.main && <p className="k-reading__label">{d.main.label}</p>}
            {d?.extra.length > 0 && (
              <div className="k-reading__extra">
                {d.extra.map((x) => (
                  <div key={x.label}>
                    <p>{x.label}</p>
                    <strong>
                      {x.value}
                      <span> {x.unit}</span>
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="k-after">
            {step.key === 'bmi'
              ? 'You can step off the platform now.'
              : isLast
                ? 'Great job — that’s the last reading.'
                : 'Well done. On to the next reading.'}
          </p>
          <Spacer />
          <KioskButton icon="arrow" onClick={on.onContinue}>
            {isLast ? 'See my results' : 'Next reading'}
          </KioskButton>
        </>
      );
    }

    case 'failed':
      return (
        <>
          <Spacer />
          <div className="k-callout k-callout--error" role="alert">
            <Icon name="alert" size={60} />
            <div>
              <strong>We couldn’t get a reading</strong>
              <p>{run.error}</p>
            </div>
          </div>
          <Spacer />
          <KioskButton icon="retry" onClick={on.onStart} disabled={!sensorsReady}>
            Try again
          </KioskButton>
          {sensorsNote}
          {skipButton}
          {!sensorsNote && (
          <Note icon={isGuest ? 'info' : 'lock'}>
            {isGuest
              ? 'Still not working? Skip it or ask the clinic staff.'
              : 'Required — still not working? Ask the clinic staff for help.'}
          </Note>
          )}
        </>
      );

    default: // 'idle'
      return (
        <>
          <p className="k-body k-body--lg">{step.description}</p>
          <Pill>{step.duration}</Pill>
          <NumberedList items={step.tips} className="k-steps-list--lg" />
          <Spacer />
          <KioskButton icon="arrow" onClick={on.onStart} disabled={!sensorsReady}>
            Start measuring
          </KioskButton>
          {sensorsNote}
          {isGuest ? skipButton : !sensorsNote && <Note>Required — complete this reading to continue</Note>}
        </>
      );
  }
}

const RING_R = 200;
const RING_C = 2 * Math.PI * RING_R;

const BP_PHASE_TEXT = {
  pumping: 'seconds · cuff inflating',
  measuring: 'seconds · measuring',
  checking: 'seconds · reading the result',
};

/** BP ring: counts UP with the agent's own seconds (same as the agent log). */
function ElapsedRing({ tick, step }) {
  const started = tick?.elapsed != null;
  const seconds = started ? Math.floor(tick.elapsed) : 0;
  const filled = started ? Math.min(1, tick.elapsed / tick.timeout) : 0;
  return (
    <div className="k-ring" role="timer" aria-live="off">
      <svg width="480" height="480" viewBox="0 0 480 480" aria-hidden="true">
        <circle className="k-ring__track" cx="240" cy="240" r={RING_R} />
        <circle
          className="k-ring__arc"
          cx="240"
          cy="240"
          r={RING_R}
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - filled)}
          transform="rotate(-90 240 240)"
        />
      </svg>
      <div className="k-ring__center">
        <strong>{started ? seconds : '…'}</strong>
        <span>{started ? BP_PHASE_TEXT[tick.bpPhase] || 'seconds' : step.startingLabel || 'Starting…'}</span>
      </div>
    </div>
  );
}

/** Countdown ring - the colored arc shrinks as the seconds run out. */
function TimerRing({ run, step }) {
  if (step.countUp) return <ElapsedRing tick={run.tick} step={step} />;
  const total = run.totalSeconds || step.timerSeconds || 30;
  const left = run.tick ? Math.max(0, Math.ceil(run.tick.secondsLeft)) : total;
  // (before the first tick there is nothing to count yet - show a full ring)
  const live = formatLive(run.tick?.live);
  return (
    <div className="k-ring" role="timer" aria-live="off">
      <svg width="480" height="480" viewBox="0 0 480 480" aria-hidden="true">
        <circle className="k-ring__track" cx="240" cy="240" r={RING_R} />
        <circle
          className="k-ring__arc"
          cx="240"
          cy="240"
          r={RING_R}
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - left / total)}
          transform="rotate(-90 240 240)"
        />
      </svg>
      <div className="k-ring__center">
        <strong>{left}</strong>
        <span>{live ? `${live.value} ${live.unit}` : run.tick ? `seconds left · of ${total}` : 'Starting…'}</span>
      </div>
    </div>
  );
}

/** BMI, waiting for the person: step off / step on (safety re-zero) or "stand up straight". */
function BmiAwaiting({ run, prompt, onConfirm }) {
  const stepKey = run.prompt?.step;
  const mode = stepKey === 'scale_empty' ? 'stepOff' : stepKey === 'step_on' ? 'stepOn' : 'height';
  const auto = !!run.prompt?.auto;
  const heightNext = stepKey === 'stand_under';
  return (
    <>
      <Spacer />
      <div className="k-panel k-panel--turn k-panel--scene">
        <span className="k-badge">
          <span className="k-badge__dot" />
          {heightNext ? 'NEXT · HEIGHT' : 'YOUR TURN'}
        </span>
        <BmiScene
          mode={mode}
          kg={run.watchKg}
          weight={run.weight?.value}
          heightCm={null}
          zeroed={!!run.zeroed}
        />
        <p className="k-panel__big">{prompt.text}</p>
        {prompt.sub && <p className="k-panel__sub">{prompt.sub}</p>}
      </div>
      <Spacer />
      {auto && heightNext ? (
        <p className="k-scene-note">{prompt.autoNote}</p>
      ) : (
        <>
          <KioskButton variant={auto ? 'secondary' : 'primary'} icon="check" onClick={onConfirm}>
            {prompt.button}
          </KioskButton>
          {auto && prompt.autoNote && <p className="k-scene-note">{prompt.autoNote}</p>}
        </>
      )}
    </>
  );
}

/** BMI, measuring: weight (live kg) first, then height (live cm). */
function BmiRunning({ run, step }) {
  if (run.bmiStage === 'zeroing') {
    // safety re-zero: the platform is empty, the scale is being zeroed right now
    return (
      <>
        <Spacer />
        <div className="k-panel k-panel--turn k-panel--scene">
          <span className="k-badge">
            <span className="k-badge__dot" />
            ZEROING
          </span>
          <BmiScene mode="stepOff" kg={run.watchKg} />
          <p className="k-panel__big">Zeroing the scale…</p>
          <p className="k-panel__sub">Stay off the platform for a moment.</p>
        </div>
        <Spacer />
      </>
    );
  }
  const height = run.bmiStage === 'height';
  const left = run.tick?.secondsLeft != null ? Math.max(0, Math.ceil(run.tick.secondsLeft)) : null;
  const liveKg = run.tick?.live?.kg ?? run.watchKg ?? null;
  return (
    <>
      <Spacer />
      <div className="k-panel k-panel--center k-panel--tint k-panel--scene">
        <span className="k-badge">
          <span className="k-badge__dot" />
          {height ? 'MEASURING · HEIGHT' : 'MEASURING · WEIGHT'}
        </span>
        <BmiScene
          mode={height ? 'height' : 'weigh'}
          kg={liveKg}
          weight={run.weight?.value}
          heightCm={run.heightCm ?? null}
        />
      </div>
      <div className="k-measuring">
        <p className="k-measuring__title">{height ? step.measuring : 'Stand still'}</p>
        <p className="k-measuring__hint">
          {height
            ? step.measuringHint
            : `Stay in the middle of the platform while we weigh you${left != null ? ` · ${left}s left` : '.'}`}
        </p>
      </div>
      <Spacer />
    </>
  );
}
