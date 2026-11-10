import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import { KioskCard, LeaveDialog, TopBar } from './ui/KioskUI';
import StepProgress from './wizard/StepProgress';
import ScanStepScreen from './wizard/ScanStepScreen';
import KioskResults from './wizard/KioskResults';
import { KIOSK_STEPS, isBorderline } from './wizard/kioskSteps';
import { KIOSK_ID, useKioskAgent } from '../services/kioskAgentService';
import { completeKioskSession, startKioskSession } from '../services/kioskSessionService';
import { clearPatientSession, getCurrentPatient } from '../services/authService';
import { fullName, shortName } from './patientName';

const IDLE = { phase: 'idle' };

/**
 * The kiosk check-in.
 *
 *  REGISTERED PATIENT (signed in with QR)
 *    - a backend session is started; the kiosk agent files every result under it
 *    - every reading is required, in order - there is no skip
 *    - a failed reading must be tried again (or the staff called)
 *    - on the results screen the check-in is saved to their record and sent
 *      to the staff queue
 *
 *  GUEST
 *    - NO backend session: scans are sent with session = null, so nothing
 *      reaches the clinic staff or any record
 *    - any reading can be skipped
 *
 *  BOTH
 *    - a reading within the sensor's margin of error of a clinical cut-off
 *      asks for ONE repeat measurement (kioskSteps.js -> BORDERLINE_RULES)
 *    - the results screen shows the readings only - never the risk level
 */
export default function KioskVitalsWizard() {
  const navigate = useNavigate();
  const [patient] = useState(getCurrentPatient);
  const isGuest = !patient;

  const { agent, connection, agentOnline } = useKioskAgent();

  const [sessionId, setSessionId] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [index, setIndex] = useState(0); // KIOSK_STEPS.length = results screen
  const [readings, setReadings] = useState({}); // stepKey -> agent reading
  const [skipped, setSkipped] = useState(() => new Set());
  const recheckedRef = useRef(new Set()); // steps that already had their one repeat
  const [run, setRun] = useState(IDLE);
  const [saveState, setSaveState] = useState(isGuest ? 'none' : 'saving');
  const [saveError, setSaveError] = useState('');
  const [leaving, setLeaving] = useState(false); // "leave this check-in?" popup

  const scanIdRef = useRef(null);
  const agentRef = useRef(null);
  agentRef.current = agent;

  // ---- registered patients: ONE backend session per check-in
  const sessionRequestRef = useRef(null);
  const openSession = useCallback(() => {
    if (isGuest) return;
    setSessionError(null);
    sessionRequestRef.current = startKioskSession(KIOSK_ID, patient.id, fullName(patient));
    sessionRequestRef.current.then((s) => setSessionId(s.sessionId)).catch((e) => setSessionError(e.message));
  }, [isGuest, patient]);

  useEffect(() => {
    if (!sessionRequestRef.current) openSession(); // not twice (React dev mode runs effects twice)
  }, [openSession]);

  // Leaving the screen mid-scan: tell the agent to stop.
  useEffect(
    () => () => {
      if (scanIdRef.current && agentRef.current) agentRef.current.cancel(scanIdRef.current);
    },
    []
  );

  const isResults = index >= KIOSK_STEPS.length;
  const step = KIOSK_STEPS[Math.min(index, KIOSK_STEPS.length - 1)];

  // ---- one scan
  async function startScan() {
    if (!agent || (!isGuest && !sessionId)) return;
    const key = step.key;
    setRun({ phase: 'starting', totalSeconds: step.timerSeconds || 0 });
    const { id, done } = agent.scan(key, isGuest ? null : sessionId, (st) => {
      if (st.phase === 'awaiting_confirm') {
        setRun((r) => ({ ...r, phase: 'awaiting', prompt: { step: st.step, message: st.message }, tick: null }));
      } else if (st.phase === 'confirmed' || st.phase === 'accepted') {
        setRun((r) => ({ ...r, phase: 'running', prompt: null }));
      } else if (st.phase === 'measuring' && st.elapsed_s != null) {
        // BP: the monitor decides when it's done, so the agent counts UP -
        // show exactly the agent's seconds instead of a fake countdown.
        setRun((r) => ({
          ...r,
          phase: 'running',
          prompt: null,
          tick: { elapsed: st.elapsed_s, timeout: st.timeout_s || r.totalSeconds || 100, bpPhase: st.bp_phase },
        }));
      } else if (st.phase === 'measuring') {
        const secondsLeft = st.seconds_left ?? 0;
        setRun((r) => ({
          ...r,
          phase: 'running',
          prompt: null,
          // the agent may count from a different number than our default - use whichever is bigger
          totalSeconds: Math.max(r.totalSeconds || 0, Math.ceil(secondsLeft)),
          tick: { secondsLeft, live: st.live },
          weight: st.live?.kg != null && r.bmiStage !== 'height' ? { value: Number(st.live.kg).toFixed(1) } : r.weight,
        }));
      } else if (st.phase === 'countdown_end') {
        setRun((r) => ({ ...r, tick: null }));
      }
    });
    scanIdRef.current = id;
    setRun((r) => ({ ...r, scanId: id }));

    const result = await done;
    scanIdRef.current = null;
    if (result.ok) {
      setReadings((prev) => ({ ...prev, [key]: result.reading }));
      const needsRepeat = isBorderline(key, result.reading) && !recheckedRef.current.has(key);
      setRun({ phase: needsRepeat ? 'recheck' : 'done' });
    } else if (!result.cancelled) {
      setRun({
        phase: 'failed',
        error: result.rejected
          ? 'The sensors are busy. Please wait a moment and try again.'
          : friendlyError(result.error, key),
      });
    }
  }

  function confirmStep() {
    if (!agent || !run.scanId || !run.prompt) return;
    agent.confirm(run.scanId, run.prompt.step);
    setRun((r) => ({
      ...r,
      phase: 'running',
      prompt: null,
      bmiStage: r.prompt.step === 'stand_under' ? 'height' : r.prompt.step === 'step_on' ? 'weight' : r.bmiStage,
    }));
  }

  function measureAgain() {
    recheckedRef.current.add(step.key);
    startScan();
  }

  function next() {
    setRun(IDLE);
    setIndex((i) => i + 1);
  }

  function skip() {
    if (!isGuest) return; // registered patients must complete every reading
    setSkipped((s) => new Set(s).add(step.key));
    setReadings((r) => {
      const { [step.key]: _dropped, ...rest } = r;
      return rest;
    });
    next();
  }

  /**
   * Leave mid-check-in: stop any running scan and drop every reading taken.
   * A signed-in patient goes back to their Signed-in screen (still signed in);
   * a guest goes back to the guest welcome.
   */
  function leaveCheckIn() {
    if (scanIdRef.current && agent) agent.cancel(scanIdRef.current);
    navigate(isGuest ? '/kiosk/guest' : '/kiosk/signed-in');
  }

  /** Sign the patient out and go back to the Start screen. */
  function leave() {
    clearPatientSession();
    navigate('/kiosk');
  }

  // ---- results: save a registered patient's check-in right away
  const savingRef = useRef(false);
  const save = useCallback(() => {
    if (isGuest || !sessionId || savingRef.current) return;
    savingRef.current = true;
    setSaveState('saving');
    setSaveError('');
    completeKioskSession(sessionId)
      .then(() => setSaveState('saved'))
      .catch((e) => {
        setSaveError(e.message);
        setSaveState('error');
      })
      .finally(() => {
        savingRef.current = false;
      });
  }, [isGuest, sessionId]);

  useEffect(() => {
    if (isResults) save();
  }, [isResults, save]);

  // ---- what blocks scanning right now
  const sensorsReady =
    Boolean(agent) && connection === 'connected' && agentOnline && (isGuest || Boolean(sessionId));
  const sensorsMessage = sessionError
    ? sessionError
    : connection !== 'connected'
      ? 'Connecting to the kiosk sensors…'
      : !agentOnline
        ? 'The kiosk sensors are offline. Please ask the clinic staff for help.'
        : 'Getting ready…';

  // Readings that count as finished (a reading waiting for its repeat doesn't).
  const done = new Set(
    Object.keys(readings).filter((k) => !(k === step.key && run.phase === 'recheck' && !isResults))
  );
  const frac = progressOf(step, run);

  return (
    <KioskShell>
      <KioskCard color={isResults ? undefined : step.color}>
        <TopBar name={isGuest ? 'Guest' : shortName(patient)} onLeave={isResults ? undefined : () => setLeaving(true)} />

        {isResults ? (
          <KioskResults
            readings={readings}
            skipped={skipped}
            isGuest={isGuest}
            firstName={patient?.firstName}
            saveState={saveState}
            saveError={saveError}
            onFinish={leave}
            onRetrySave={save}
          />
        ) : (
          <>
            <StepProgress current={index} done={done} skipped={skipped} frac={frac} />
            <ScanStepScreen
              step={step}
              run={run}
              reading={readings[step.key]}
              isGuest={isGuest}
              isLast={index === KIOSK_STEPS.length - 1}
              sensorsReady={sensorsReady}
              sensorsMessage={sensorsMessage}
              onStart={startScan}
              onConfirm={confirmStep}
              onContinue={next}
              onRecheck={measureAgain}
              onSkip={skip}
            />
          </>
        )}
        {leaving && (
          <LeaveDialog
            destination={isGuest ? 'You’ll go back to the guest welcome page.' : 'You’ll go back to your Signed-in page.'}
            onStay={() => setLeaving(false)}
            onLeave={leaveCheckIn}
          />
        )}
      </KioskCard>
    </KioskShell>
  );
}

/** How far the current reading is (0..1), for the step bar's line. */
function progressOf(step, run) {
  if (run.phase !== 'running' && run.phase !== 'awaiting') return 0;
  if (step.key === 'bmi') return run.bmiStage === 'height' ? 0.5 : run.bmiStage === 'weight' ? 0.25 : 0;
  if (run.phase === 'running' && run.tick?.elapsed != null) {
    return Math.min(1, run.tick.elapsed / run.tick.timeout);
  }
  if (run.phase === 'running' && run.tick && run.totalSeconds) {
    return Math.min(1, Math.max(0, 1 - run.tick.secondsLeft / run.totalSeconds));
  }
  return 0;
}

/** What to tell the patient when a reading didn't work - same wording as each step's instructions. */
const RETRY_HELP = {
  respirationSpo2Hr:
    'We couldn’t read your fingertip. Gently place your index fingertip on the sensor pad, breathe normally and avoid talking or moving until the measurement is complete.',
  bloodPressure:
    'The cuff couldn’t get a reading. Slide your arm into the cuff with your palm facing upward, keep it supported at heart level and remain still until the measurement is complete.',
  temperature:
    'We couldn’t get a temperature reading. Position the required body part near the sensor as indicated on the screen and remain still until the reading is complete.',
  bmi: 'We couldn’t measure your height and weight. Stand upright on the platform, face forward and keep your feet still while you are measured.',
};

/** Agent error texts are written for logs - turn them into plain wording for the screen. */
function friendlyError(error, stepKey) {
  if (error?.startsWith('nobody confirmed')) return 'We waited a while for you. Tap “Try again” when you are ready.';
  if (error?.startsWith('sensor problem')) return 'There’s a problem with this sensor. You can try again or ask the clinic staff for help.';
  return RETRY_HELP[stepKey] || 'Please try again.';
}