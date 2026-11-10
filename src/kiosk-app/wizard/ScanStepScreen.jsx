import Icon from '../ui/Icon';
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
 *   'recheck'   reading near a clinical cut-off     -> "Let's take that reading once more"
 *   'failed'    no reading                          -> reason + Try again
 *
 * Registered patients can't skip (every reading is required).
 * Guests get "Skip this reading" on the intro, failed and recheck screens.
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
  onRecheck,
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
        onRecheck={onRecheck}
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
      return (
        <>
          <Spacer />
          {step.key === 'bmi' ? <BmiProgress run={run} /> : <TimerRing run={run} step={step} />}
          <div className="k-measuring">
            <p className="k-measuring__title">
              {step.key === 'bmi' && run.bmiStage !== 'height' ? 'Stand still' : step.measuring}
            </p>
            <p className="k-measuring__hint">
              {step.key === 'bmi' && run.bmiStage !== 'height'
                ? 'Stay in the middle of the platform while we weigh you.'
                : step.measuringHint}
            </p>
          </div>
          <Spacer />
        </>
      );

    case 'done': {
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

    case 'recheck':
      return (
        <>
          <Spacer />
          <div className="k-callout k-callout--step">
            <Icon name="retry" size={60} />
            <div>
              <strong>Let’s take that reading once more</strong>
              <p>
                Your result landed within the sensor’s normal margin of error of a clinical cut-off. Measuring again
                makes sure it’s accurate.
              </p>
              <p className="k-callout__muted">This is a routine check. It doesn’t mean anything is wrong.</p>
            </div>
          </div>
          {step.recheckTip && <NumberedList items={[step.recheckTip]} className="k-steps-list--grey" />}
          <Spacer />
          <KioskButton icon="retry" onClick={on.onRecheck} disabled={!sensorsReady}>
            Measure again
          </KioskButton>
          {sensorsNote}
          {isGuest ? skipButton : !sensorsNote && <Note>A repeat is needed before you can continue</Note>}
        </>
      );

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

/** Countdown ring - the colored arc shrinks as the seconds run out. */
function TimerRing({ run, step }) {
  const total = run.totalSeconds || step.timerSeconds || 30;
  const left = run.tick ? Math.max(0, Math.ceil(run.tick.secondsLeft)) : total;
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
        <span>{live ? `${live.value} ${live.unit}` : step.timerLabel}</span>
      </div>
    </div>
  );
}

/** BMI: weight first (live kg), then height. */
function BmiProgress({ run }) {
  const live = formatLive(run.tick?.live);
  const weighing = run.bmiStage !== 'height';
  const weight = weighing ? live : run.weight;
  return (
    <div className="k-panel k-panel--tint k-bmi">
      <div className={`k-bmi__row${weighing ? ' is-active' : ' is-done'}`}>
        {weighing ? <span className="k-spinner k-spinner--small" /> : <BadgeCheck />}
        <div className="k-bmi__label">
          <strong>Weight</strong>
          <span>{weighing ? 'Measuring now…' : 'Measured'}</span>
        </div>
        <p className="k-bmi__value">
          {weight ? weight.value : '—'}
          <span> kg</span>
        </p>
      </div>
      <div className={`k-bmi__row${weighing ? '' : ' is-active'}`}>
        {weighing ? <span className="k-bmi__pending" /> : <span className="k-spinner k-spinner--small" />}
        <div className="k-bmi__label">
          <strong>Height</strong>
          <span>{weighing ? 'Next' : 'Measuring now…'}</span>
        </div>
        <p className="k-bmi__value k-bmi__value--muted">
          —<span> cm</span>
        </p>
      </div>
    </div>
  );
}

function BadgeCheck() {
  return (
    <span className="k-bmi__badge">
      <Icon name="check" size={34} stroke={2.6} />
    </span>
  );
}