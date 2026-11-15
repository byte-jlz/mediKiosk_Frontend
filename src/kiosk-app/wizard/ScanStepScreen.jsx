import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import BmiScene from './BmiScene';
import FingerScene from './FingerScene';
import BpScene from './BpScene';
import TempScene from './TempScene';
import { IconTile, KioskButton, Note, Pill, Spacer } from '../ui/KioskUI';
import { CONFIRM_PROMPTS, FINGER_WAIT_LIMIT_S, STILL_THERE_S, formatLive, readingDisplay } from './kioskSteps';
import { t } from '../i18n';

const FINGER = 'respirationSpo2Hr'; // the SpO2 & RR step (live finger detection)
const BP = 'bloodPressure'; // the BP step (the monitor is hidden inside the kiosk)
const TEMP = 'temperature'; // the temperature step (wrist detection + safety checks)

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
 *
 * SpO2 & RR (Nov 2026, live finger detection): the agent reports live whether a
 * finger is on the sensor, whether the hand moves and how long the finger has
 * been off. Green = good contact, orange = movement / finger off / starting
 * again, red = no steady reading / sensor problem - shown on the panel border,
 * a big banner and the drawn kiosk screen together. No finger for
 * FINGER_WAIT_LIMIT_S -> "Are you still there?" (onAbandon closes the check-in).
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
  onAbandon,
}) {
  return (
    <div className="k-step" key={`${step.key}-${run.phase}`}>
      <div className="k-step__heading">
        <IconTile icon={step.icon} size={132} />
        <h1 className="k-h1 k-h1--step">{t(step.title)}</h1>
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
        onAbandon={onAbandon}
      />
    </div>
  );
}

function Body({ step, run, reading, isGuest, isLast, sensorsReady, sensorsMessage, ...on }) {
  const skipButton = isGuest && (
    <KioskButton variant="secondary" icon="skip" onClick={on.onSkip}>
      {t('Skip this reading')}
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
            <p className="k-panel__title">{t('Getting the sensors ready…')}</p>
          </div>
          <Spacer />
        </>
      );

    case 'awaiting': {
      const prompt = translatePrompt(CONFIRM_PROMPTS[run.prompt?.step] || { text: run.prompt?.message, button: 'I’m ready' });
      if (step.key === 'bmi') return <BmiAwaiting run={run} prompt={prompt} onConfirm={on.onConfirm} />;
      if (step.key === FINGER)
        return <FingerAwaiting run={run} prompt={prompt} onConfirm={on.onConfirm} onAbandon={on.onAbandon} />;
      if (step.key === BP) return <BpAwaiting prompt={prompt} onConfirm={on.onConfirm} />;
      if (step.key === TEMP)
        return <TempAwaiting run={run} prompt={prompt} onConfirm={on.onConfirm} onAbandon={on.onAbandon} />;
      return (
        <>
          <Spacer />
          <div className="k-panel k-panel--turn">
            <span className="k-badge">
              <span className="k-badge__dot" />
              {t('YOUR TURN')}
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
      if (step.key === FINGER) return <FingerRunning run={run} />;
      if (step.key === BP) return <BpRunning run={run} />;
      if (step.key === TEMP) return <TempRunning run={run} />;
      return (
        <>
          <Spacer />
          <TimerRing run={run} step={step} />
          <div className="k-measuring">
            <p className="k-measuring__title">{t(step.measuring)}</p>
            <p className="k-measuring__hint">{t(step.measuringHint)}</p>
          </div>
          <Spacer />
        </>
      );

    case 'done': {
      if (step.key === TEMP) {
        return (
          <>
            <Spacer />
            <ScenePanel
              tone="green"
              badge="READING COMPLETE"
              banner={{ tone: 'green', text: t('✓ Reading complete') }}
              scene={<TempScene mode="done" value={reading?.value} />}
              big="Reading complete"
              sub="You can lower your arm now."
            />
            <Spacer />
            <KioskButton icon="arrow" onClick={on.onContinue}>
              {isLast ? t('See my results') : t('Next reading')}
            </KioskButton>
          </>
        );
      }
      if (step.key === BP) {
        return (
          <>
            <Spacer />
            <ScenePanel
              tone="green"
              badge="READING COMPLETE"
              banner={{ tone: 'green', text: t('✓ Reading complete') }}
              scene={
                <BpScene mode="done" systolic={reading?.systolic} diastolic={reading?.diastolic} pulse={reading?.pulse} />
              }
              big="Reading complete"
              sub="Open the cuff and take your arm out."
            />
            <Spacer />
            <KioskButton icon="arrow" onClick={on.onContinue}>
              {isLast ? t('See my results') : t('Next reading')}
            </KioskButton>
          </>
        );
      }
      if (step.key === FINGER) {
        return (
          <>
            <Spacer />
            <ScenePanel
              tone="green"
              badge="READING COMPLETE"
              banner={{ tone: 'green', text: t('✓ Reading complete') }}
              scene={<FingerScene mode="done" rr={reading?.respiration?.value} spo2={reading?.spo2?.value} />}
              big="Reading complete"
              sub="You can lift your hand now."
            />
            <Spacer />
            <KioskButton icon="arrow" onClick={on.onContinue}>
              {isLast ? t('See my results') : t('Next reading')}
            </KioskButton>
          </>
        );
      }
      if (step.key === 'bmi') {
        return (
          <>
            <Spacer />
            <div className="k-panel k-panel--center k-panel--tint k-panel--scene">
              <p className="k-reading__ok">
                <Icon name="check" size={34} stroke={2.6} />
                {t('Reading complete')}
              </p>
              <BmiScene
                mode="done"
                weight={reading?.weight?.value}
                heightCm={reading?.height?.value}
                bmi={reading?.value}
              />
            </div>
            <p className="k-after">{t('You can step off the platform now.')}</p>
            <Spacer />
            <KioskButton icon="arrow" onClick={on.onContinue}>
              {isLast ? t('See my results') : t('Next reading')}
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
              {t('Reading complete')}
            </p>
            {d?.main && (
              <p className={`k-reading__value${String(d.main.value).length > 5 ? ' k-reading__value--long' : ''}`}>
                {d.main.value}
                <span> {d.main.unit}</span>
              </p>
            )}
            {d?.main && <p className="k-reading__label">{t(d.main.label)}</p>}
            {d?.extra.length > 0 && (
              <div className="k-reading__extra">
                {d.extra.map((x) => (
                  <div key={x.label}>
                    <p>{t(x.label)}</p>
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
              ? t('You can step off the platform now.')
              : isLast
                ? t('Great job — that’s the last reading.')
                : t('Well done. On to the next reading.')}
          </p>
          <Spacer />
          <KioskButton icon="arrow" onClick={on.onContinue}>
            {isLast ? t('See my results') : t('Next reading')}
          </KioskButton>
        </>
      );
    }

    case 'failed':
      if (step.key === TEMP) {
        const tf = tempFailure(run.rawError || '');
        const coldTip = tf.mode === 'low' && (run.lowStreak || 0) >= 2;
        return (
          <>
            <Spacer />
            <ScenePanel
              tone={tf.tone}
              badge={tf.badge}
              banner={{ tone: tf.tone, text: tf.banner }}
              scene={<TempScene mode={tf.mode} />}
              big={tf.big}
              sub={coldTip ? t('Hold your wrist closer, about 2–5 cm away, and keep it still.') : tf.sub}
              extra={
                coldTip ? (
                  <p className="k-scene-tip">{t('Tip: if your hands feel cold, rub the inside of your wrist for a few seconds first.')}</p>
                ) : null
              }
            />
            <Spacer />
            <KioskButton variant={tf.tone === 'red' ? 'secondary' : 'primary'} icon="retry" onClick={on.onStart} disabled={!sensorsReady}>
              {t('Try again')}
            </KioskButton>
            {sensorsNote}
            {skipButton}
          </>
        );
      }
      if (step.key === BP) {
        const raw = run.rawError || '';
        // the monitor's own error screen / nobody tapped "The cuff is on" = the patient can fix it (orange);
        // no answer from the monitor or a hardware problem = not the patient's fault (red)
        const fixable = raw.startsWith('ERROR') || raw.startsWith('nobody confirmed');
        return (
          <>
            <Spacer />
            <ScenePanel
              tone={fixable ? 'orange' : 'red'}
              badge={fixable ? t('NO READING') : t('MONITOR PROBLEM')}
              banner={{
                tone: fixable ? 'orange' : 'red',
                text: raw.startsWith('nobody confirmed')
                  ? t('⚠ We waited a while for you')
                  : fixable
                    ? t('⚠ The monitor couldn’t measure')
                    : t('⚠ The blood pressure monitor isn’t responding'),
              }}
              scene={<BpScene mode={fixable ? 'error' : 'fault'} />}
              big={fixable ? t('Let’s re-wrap the cuff') : t('This isn’t your fault')}
              sub={
                fixable
                  ? t('Open the cuff and wrap it again snugly above the elbow. Keep still and don’t talk, then try again.')
                  : t('The monitor didn’t respond. Please ask the clinic staff for help.')
              }
            />
            <Spacer />
            <KioskButton variant={fixable ? 'primary' : 'secondary'} icon="retry" onClick={on.onStart} disabled={!sensorsReady}>
              {t('Try again')}
            </KioskButton>
            {sensorsNote}
            {skipButton}
          </>
        );
      }
      if (step.key === FINGER) {
        const sensor = (run.rawError || '').startsWith('sensor problem');
        return (
          <>
            <Spacer />
            <ScenePanel
              tone="red"
              badge={sensor ? t('SENSOR PROBLEM') : t('NO READING')}
              banner={{
                tone: 'red',
                text: sensor ? t('⚠ The finger sensor isn’t working') : t('We couldn’t get a steady reading'),
              }}
              scene={<FingerScene mode={sensor ? 'sensor' : 'fail'} />}
              big={sensor ? t('This isn’t your fault') : t('Let’s try once more')}
              sub={
                sensor
                  ? t('The finger sensor isn’t responding. Please ask the clinic staff for help.')
                  : t('Rest your hand flat and keep it still, or ask the clinic staff for help.')
              }
            />
            <Spacer />
            <KioskButton variant={sensor ? 'secondary' : 'primary'} icon="retry" onClick={on.onStart} disabled={!sensorsReady}>
              {t('Try again')}
            </KioskButton>
            {sensorsNote}
            {skipButton}
          </>
        );
      }
      return (
        <>
          <Spacer />
          <div className="k-callout k-callout--error" role="alert">
            <Icon name="alert" size={60} />
            <div>
              <strong>{t('We couldn’t get a reading')}</strong>
              <p>{run.error}</p>
            </div>
          </div>
          <Spacer />
          <KioskButton icon="retry" onClick={on.onStart} disabled={!sensorsReady}>
            {t('Try again')}
          </KioskButton>
          {sensorsNote}
          {skipButton}
          {!sensorsNote && (
          <Note icon={isGuest ? 'info' : 'lock'}>
            {isGuest
              ? t('Still not working? Skip it or ask the clinic staff.')
              : t('Required — still not working? Ask the clinic staff for help.')}
          </Note>
          )}
        </>
      );

    default: // 'idle'
      return (
        <>
          {/* Nov 2026: no paragraph here any more - short Do / Don't bullets instead; the animation
              on the next screen shows the rest. step.description / step.tips stay in kioskSteps.js. */}
          <Pill>{step.duration}</Pill>
          <DoDont dos={step.dos} donts={step.donts} />
          <Spacer />
          <KioskButton icon="arrow" onClick={on.onStart} disabled={!sensorsReady}>
            {t('Start measuring')}
          </KioskButton>
          {sensorsNote}
          {isGuest ? skipButton : !sensorsNote && <Note>Required — complete this reading to continue</Note>}
        </>
      );
  }
}

/** The intro's short "Do" and "Don't" bullets. */
function DoDont({ dos = [], donts = [] }) {
  return (
    <div className="k-dodont">
      <div className="k-dodont__group k-dodont__group--do">
        <p className="k-dodont__label">Do</p>
        <ul>
          {dos.map((d) => (
            <li key={d}>
              <Icon name="check" size={40} stroke={2.6} />
              <span>{t(d)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="k-dodont__group k-dodont__group--dont">
        <p className="k-dodont__label">Don’t</p>
        <ul>
          {donts.map((d) => (
            <li key={d}>
              <Icon name="x" size={40} stroke={2.6} />
              <span>{t(d)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/** A "Your turn" prompt (kioskSteps.js CONFIRM_PROMPTS) in the kiosk's language. */
function translatePrompt(p) {
  const out = { ...p };
  for (const k of ['text', 'sub', 'button', 'autoNote', 'note', 'pill']) if (out[k]) out[k] = t(out[k]);
  return out;
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
        <span>{started ? t(BP_PHASE_TEXT[tick.bpPhase] || 'seconds') : t(step.startingLabel || 'Starting…')}</span>
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
        <span>{live ? `${live.value} ${live.unit}` : run.tick ? t('seconds left · of {total}', { total }) : t('Starting…')}</span>
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
          {heightNext ? t('NEXT · HEIGHT') : t('YOUR TURN')}
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
          {height ? t('MEASURING · HEIGHT') : t('MEASURING · WEIGHT')}
        </span>
        <BmiScene
          mode={height ? 'height' : 'weigh'}
          kg={liveKg}
          weight={run.weight?.value}
          heightCm={run.heightCm ?? null}
        />
      </div>
      <div className="k-measuring">
        <p className="k-measuring__title">{height ? t(step.measuring) : t('Stand still')}</p>
        <p className="k-measuring__hint">
          {height
            ? t(step.measuringHint)
            : left != null
              ? t('Stay in the middle of the platform while we weigh you · {n}s left', { n: left })
              : t('Stay in the middle of the platform while we weigh you.')}
        </p>
      </div>
      <Spacer />
    </>
  );
}

/** One SpO2 & RR panel: colour on the border + a big banner + the picture. */
function ScenePanel({ tone, badge, banner, scene, big, sub, extra = null }) {
  return (
    <div className={`k-panel k-panel--turn k-panel--scene k-panel--finger${tone ? ` k-panel--tone-${tone}` : ''}`}>
      <span className="k-badge">
        <span className="k-badge__dot" />
        {t(badge)}
      </span>
      {banner && (
        <div className={`k-banner k-banner--${banner.tone}`} role="status" aria-live="polite">
          {t(banner.text)}
        </div>
      )}
      {scene}
      <p className="k-panel__big">{t(big)}</p>
      {sub && <p className="k-panel__sub">{t(sub)}</p>}
      {extra}
    </div>
  );
}

/** SpO2 & RR, waiting for the finger (first time, or after a restart). */
function FingerAwaiting({ run, prompt, onConfirm, onAbandon }) {
  const again = run.prompt?.step === 'finger_again';
  const fingerOn = !!run.finger;
  const auto = !!run.prompt?.auto;
  let view;
  if (fingerOn && again) {
    // 6a: the finger is already back - the new reading starts by itself
    view = {
      mode: 'restartBack',
      tone: 'orange',
      badge: t('STARTING AGAIN'),
      banner: { tone: 'orange', text: t('↻ Starting again — keep your finger still') },
      big: t('Let’s try that again'),
      sub: t('Keep your hand where it is. The new reading starts in a moment — no need to tap anything.'),
    };
  } else if (fingerOn) {
    view = {
      mode: 'detected',
      tone: 'green',
      badge: t('YOUR TURN'),
      banner: { tone: 'green', text: t('✓ Finger detected — keep still') },
      big: t('Good contact. Starting…'),
      sub: t('Keep your hand still and breathe normally.'),
    };
  } else if (again) {
    // 6b: the finger is still off - wait for it like the first time
    view = {
      mode: 'again',
      tone: 'orange',
      badge: t('STARTING AGAIN'),
      banner: { tone: 'orange', text: t('↻ Put your finger back to start again') },
      big: prompt.text,
      sub: prompt.sub,
    };
  } else {
    view = { mode: 'wait', badge: t('YOUR TURN'), big: prompt.text, sub: prompt.sub };
  }
  return (
    <>
      <Spacer />
      <ScenePanel {...view} scene={<FingerScene mode={view.mode} />} />
      <Spacer />
      {!fingerOn && (
        <>
          <KioskButton variant={auto ? 'secondary' : 'primary'} icon="check" onClick={onConfirm}>
            {prompt.button}
          </KioskButton>
          {auto && prompt.autoNote && <p className="k-scene-note">{prompt.autoNote}</p>}
        </>
      )}
      <StillThere waiting={!fingerOn} onAbandon={onAbandon} what="a finger on the sensor" />
    </>
  );
}

/** SpO2 & RR, the 30 s reading: green = good contact, orange = moving / finger off. */
function FingerRunning({ run }) {
  const live = run.tick?.live || {};
  const lifted = live.finger === false;
  const moving = !lifted && !!live.moving;
  const view = lifted
    ? {
        mode: 'lift',
        tone: 'orange',
        banner: { tone: 'orange', text: t('⚠ Put your finger back on the sensor') },
        big: t('Your finger left the sensor'),
        sub: t('Put it back quickly. If it stays off for more than 2 seconds, the reading starts again.'),
      }
    : moving
      ? {
          mode: 'move',
          tone: 'orange',
          banner: { tone: 'orange', text: t('⚠ Keep your hand still') },
          big: t('Your hand is moving'),
          sub: t('Hold still — the reading is still going.'),
        }
      : {
          mode: 'measure',
          tone: 'green',
          banner: { tone: 'green', text: t('✓ Good contact — keep still') },
          big: t('Keep your hand still'),
          sub: t('Breathe normally and avoid talking or moving.'),
        };
  return (
    <>
      <Spacer />
      <ScenePanel
        {...view}
        badge="MEASURING · SpO₂ & RR"
        scene={
          <FingerScene
            mode={view.mode}
            secondsLeft={run.tick?.secondsLeft ?? null}
            totalSeconds={run.totalSeconds || 30}
            offSeconds={live.off_s || 0}
          />
        }
      />
      <Spacer />
    </>
  );
}

/**
 * "Are you still there?" - no finger for FINGER_WAIT_LIMIT_S. Continue starts
 * the wait again; "I need help" keeps the screen open (no more questions for
 * this step); no answer within STILL_THERE_S -> onAbandon (check-in closed).
 */
function StillThere({ waiting, onAbandon, what = 'a finger on the sensor' }) {
  const [asking, setAsking] = useState(false);
  const [help, setHelp] = useState(false);
  const [left, setLeft] = useState(STILL_THERE_S);
  const sinceRef = useRef(0);
  const deadlineRef = useRef(0);
  const doneRef = useRef(false);

  // a finger on the sensor resets the waiting time (and closes the question)
  useEffect(() => {
    sinceRef.current = Date.now();
    if (!waiting) setAsking(false);
  }, [waiting]);

  useEffect(() => {
    if (help) return undefined;
    const id = setInterval(() => {
      const now = Date.now();
      if (!asking) {
        if (waiting && now - sinceRef.current >= FINGER_WAIT_LIMIT_S * 1000) {
          deadlineRef.current = now + STILL_THERE_S * 1000;
          setLeft(STILL_THERE_S);
          setAsking(true);
        }
        return;
      }
      const secs = Math.max(0, Math.ceil((deadlineRef.current - now) / 1000));
      setLeft(secs);
      if (secs === 0 && !doneRef.current) {
        doneRef.current = true;
        onAbandon?.();
      }
    }, 250);
    return () => clearInterval(id);
  }, [asking, waiting, help, onAbandon]);

  if (help) {
    return (
      <Note icon="info" role="status">
        {what === 'a finger on the sensor'
          ? t('A staff member can help you. The reading starts by itself once your finger is on the sensor.')
          : t('A staff member can help you. The reading starts by itself once your wrist is in front of the sensor.')}
      </Note>
    );
  }
  if (!asking) return null;
  return (
    <div className="k-still" role="alertdialog" aria-modal="true" aria-labelledby="k-still-title">
      <div className="k-still__box">
        <p id="k-still-title" className="k-still__title">
          {t('Are you still there?')}
        </p>
        <p className="k-still__text">
          {what === 'a finger on the sensor'
            ? t('We haven’t detected a finger on the sensor.')
            : t('We haven’t detected a wrist in front of the sensor.')}
        </p>
        <p className="k-still__count">{t('This check-in closes in {n} s', { n: left })}</p>
        <KioskButton
          icon="check"
          onClick={() => {
            sinceRef.current = Date.now();
            setAsking(false);
          }}
        >
          {t('Continue')}
        </KioskButton>
        <KioskButton
          variant="secondary"
          icon="info"
          onClick={() => {
            setHelp(true);
            setAsking(false);
          }}
        >
          {t('I need help')}
        </KioskButton>
      </div>
    </div>
  );
}

/** BP, waiting for the patient to wrap the cuff (nothing can sense it - the button is the main action). */
function BpAwaiting({ prompt, onConfirm }) {
  return (
    <>
      <Spacer />
      <ScenePanel badge="YOUR TURN" scene={<BpScene mode="wait" />} big={prompt.text} sub={prompt.sub} />
      <Spacer />
      <KioskButton icon="check" onClick={onConfirm}>
        {prompt.button}
      </KioskButton>
      {prompt.note && <p className="k-scene-note">{prompt.note}</p>}
    </>
  );
}

const BP_PHASES = {
  starting: { banner: null, big: t('Starting the monitor…'), sub: t('Keep your arm relaxed on the shelf.'), badge: 'STARTING' },
  pumping: {
    banner: t('The cuff is tightening — this is normal'),
    big: t('Keep still and don’t talk'),
    sub: t('It may feel tight for a moment. It loosens by itself.'),
  },
  measuring: {
    banner: t('Measuring — keep still, don’t talk'),
    big: t('Almost there'),
    sub: t('The cuff is slowly loosening. This usually takes about 40 to 70 seconds.'),
  },
  checking: {
    banner: t('Getting your result…'),
    big: t('Getting your result…'),
    sub: t('You can relax your arm. Keep the cuff on for a moment.'),
  },
};

/** BP, measuring: follows the agent's bp_phase (pumping -> measuring -> checking) and its seconds. */
function BpRunning({ run }) {
  const started = run.tick?.elapsed != null;
  const phase = started ? (BP_PHASES[run.tick.bpPhase] ? run.tick.bpPhase : 'measuring') : 'starting';
  const p = BP_PHASES[phase];
  return (
    <>
      <Spacer />
      <ScenePanel
        badge={p.badge || t('MEASURING · BLOOD PRESSURE')}
        banner={p.banner ? { tone: 'accent', text: p.banner } : null}
        scene={<BpScene mode={phase} elapsed={started ? run.tick.elapsed : null} />}
        big={p.big}
        sub={p.sub}
      />
      <Spacer />
    </>
  );
}

/** Temperature: what each failure from the agent means for the patient. */
function tempFailure(raw) {
  if (raw.startsWith('sensor problem'))
    return {
      tone: 'red',
      mode: 'sensor',
      badge: t('SENSOR PROBLEM'),
      banner: t('⚠ The temperature sensor isn’t working'),
      big: t('This isn’t your fault'),
      sub: t('The temperature sensor isn’t responding. Please ask the clinic staff for help.'),
    };
  if (raw.startsWith('no steady reading'))
    return {
      tone: 'red',
      mode: 'limit',
      badge: t('NO READING'),
      banner: t('We couldn’t get a steady reading'),
      big: t('Please ask the clinic staff'),
      sub: t('We tried a few times but the reading kept moving. A staff member can help you.'),
    };
  if (raw.startsWith('too low'))
    return {
      tone: 'orange',
      mode: 'low',
      badge: t('NO READING'),
      banner: t('⚠ That reading was too low'),
      big: t('Let’s try once more'),
      sub: t('Hold the inside of your wrist closer to the sensor, about 2–5 cm away, and keep it still.'),
    };
  if (raw.startsWith('too high'))
    return {
      tone: 'orange',
      mode: 'high',
      badge: t('NO READING'),
      banner: t('⚠ That reading doesn’t look right'),
      big: t('Let’s try once more'),
      sub: t('Make sure nothing else is in front of the sensor (like a cup or a phone), then hold up your wrist again.'),
    };
  if (raw.startsWith('nobody confirmed'))
    return {
      tone: 'orange',
      mode: 'nowrist',
      badge: t('NO READING'),
      banner: t('⚠ We waited a while for you'),
      big: t('Let’s try once more'),
      sub: t('Hold the inside of your right wrist 2–5 cm in front of the top sensor. The reading starts by itself.'),
    };
  return {
    tone: 'orange',
    mode: 'nowrist',
    badge: t('NO READING'),
    banner: t('⚠ We couldn’t detect your wrist'),
    big: t('Let’s try once more'),
    sub: t('Hold the inside of your wrist close to the top sensor, about 2–5 cm away, and keep it still.'),
  };
}

/** Temperature, waiting for the wrist (first time, or after an automatic restart). */
function TempAwaiting({ run, prompt, onConfirm, onAbandon }) {
  const again = run.prompt?.step === 'temp_again';
  const wristOn = !!run.wrist;
  const auto = !!run.prompt?.auto;
  let view;
  if (wristOn && again) {
    view = {
      mode: 'restartBack',
      tone: 'orange',
      badge: t('STARTING AGAIN'),
      banner: { tone: 'orange', text: t('↻ Starting again — hold your wrist still') },
      big: t('Let’s try that again'),
      sub: t('Keep your wrist where it is. The new reading starts by itself — no need to tap anything.'),
    };
  } else if (wristOn) {
    view = {
      mode: 'detected',
      tone: 'green',
      badge: t('YOUR TURN'),
      banner: { tone: 'green', text: t('✓ Wrist detected — hold still') },
      big: t('Good. Starting…'),
      sub: t('Keep your wrist where it is.'),
    };
  } else if (again) {
    view = {
      mode: 'again',
      tone: 'orange',
      badge: t('STARTING AGAIN'),
      banner: { tone: 'orange', text: t('↻ Hold your wrist up again') },
      big: prompt.text,
      sub: prompt.sub,
    };
  } else {
    view = { mode: 'wait', badge: t('YOUR TURN'), big: prompt.text, sub: prompt.sub };
  }
  return (
    <>
      <Spacer />
      <ScenePanel {...view} scene={<TempScene mode={view.mode} />} />
      <Spacer />
      {!wristOn && (
        <>
          <KioskButton variant={auto ? 'secondary' : 'primary'} icon="check" onClick={onConfirm}>
            {prompt.button}
          </KioskButton>
          {auto && prompt.autoNote && <p className="k-scene-note">{prompt.autoNote}</p>}
        </>
      )}
      <StillThere waiting={!wristOn} onAbandon={onAbandon} what="a wrist in front of the sensor" />
    </>
  );
}

/** Temperature, the 5 s reading: green = good, orange = wrist moving / too far (warnings only). */
function TempRunning({ run }) {
  const live = run.tick?.live || {};
  const far = live.wrist === false;
  const moving = !far && !!live.moving;
  const view = far
    ? {
        mode: 'far',
        tone: 'orange',
        banner: { tone: 'orange', text: t('⚠ Hold your wrist closer to the sensor') },
        big: t('Your wrist moved away'),
        sub: t('Bring it back to 2–5 cm from the sensor. The reading continues.'),
      }
    : moving
      ? {
          mode: 'wobble',
          tone: 'orange',
          banner: { tone: 'orange', text: t('⚠ Hold your wrist still') },
          big: t('Your wrist is moving'),
          sub: t('Keep it still — the reading is still going.'),
        }
      : {
          mode: 'measure',
          tone: 'green',
          banner: { tone: 'green', text: t('✓ Good — hold still') },
          big: t('Hold still'),
          sub: t('Keep your wrist 2–5 cm from the sensor until it’s done.'),
        };
  return (
    <>
      <Spacer />
      <ScenePanel
        {...view}
        badge="MEASURING · TEMPERATURE"
        scene={
          <TempScene
            mode={view.mode}
            liveC={live.object_c ?? null}
            secondsLeft={run.tick?.secondsLeft ?? null}
            totalSeconds={run.totalSeconds || 5}
          />
        }
      />
      <Spacer />
    </>
  );
}
