import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import { KioskCard, LeaveDialog, TopBar } from './ui/KioskUI';
import StepProgress from './wizard/StepProgress';
import ScanStepScreen from './wizard/ScanStepScreen';
import KioskResults from './wizard/KioskResults';
import { KIOSK_STEPS } from './wizard/kioskSteps';
import { KIOSK_ID, useKioskAgent } from '../services/kioskAgentService';
import { clearPatientSession, getCurrentPatient } from '../services/authService';
import { shortName } from './patientName';

const IDLE = { phase: 'idle' };
const SAVE_WAIT_MS = 20000; // how long to wait for the edge service to confirm the save

/** One id per check-in, made here on the kiosk (no backend call needed). */
function newCheckInId() {
  const rand = Math.random().toString(16).slice(2, 8);
  return `SES-${KIOSK_ID}-${Date.now().toString(36)}-${rand}`;
}

/**
 * The kiosk check-in.
 *
 *  REGISTERED PATIENT (signed in with QR)
 *    - the kiosk makes a check-in id; every scan carries it + the patient's id
 *    - agent -> edge service (on the Pi): when all 4 readings are in, the edge
 *      classifies the visit, saves it and queues it for the clinic backend
 *      (sent over the internet by edge/sync_worker.py, kept on the Pi until then)
 *    - every reading is required, in order - there is no skip
 *    - a failed reading must be tried again (or the staff called)
 *    - the results screen waits for the edge's "saved" for this check-in
 *
 *  GUEST
 *    - NO backend session: scans are sent with session = null, so nothing
 *      reaches the clinic staff or any record
 *    - any reading can be skipped
 *
 *  BOTH
 *    - whatever reading the agent returns is accepted and shown as it is;
 *      only an error (no reading) asks the patient to try again
 *    - the results screen shows the readings only - never the risk level
 */
export default function KioskVitalsWizard() {
  const navigate = useNavigate();
  const [patient] = useState(getCurrentPatient);
  const isGuest = !patient;

  const { agent, connection, agentOnline, agentBusy } = useKioskAgent();
  const agentBusyRef = useRef(false);
  const scanningRef = useRef(false);
  agentBusyRef.current = agentBusy;

  const [sessionId] = useState(() => (patient ? newCheckInId() : null));
  const [index, setIndex] = useState(0); // KIOSK_STEPS.length = results screen
  const [readings, setReadings] = useState({}); // stepKey -> agent reading
  const [skipped, setSkipped] = useState(() => new Set());
  const [run, setRun] = useState(IDLE);
  const [saveState, setSaveState] = useState(isGuest ? 'none' : 'saving');
  const [saveError, setSaveError] = useState('');
  const [leaving, setLeaving] = useState(false); // "leave this check-in?" popup

  const scanIdRef = useRef(null);
  const agentRef = useRef(null);
  agentRef.current = agent;

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
  async function waitUntilAgentFree(ms) {
    for (let waited = 0; agentBusyRef.current && waited < ms; waited += 200) {
      await new Promise((ok) => setTimeout(ok, 200));
    }
  }

  async function startScan() {
    if (!agent || (!isGuest && !sessionId)) return;
    if (scanningRef.current) return; // a double tap must not start a second scan
    scanningRef.current = true;
    try {
      await runScan();
    } finally {
      scanningRef.current = false;
    }
  }

  async function runScan() {
    const key = step.key;
    setRun({ phase: 'starting', totalSeconds: step.timerSeconds || 0 });
    // A scan that was just cancelled (Leave / Try again) needs a moment to stop
    // on the agent - wait for it to be free instead of being refused as "busy".
    await waitUntilAgentFree(5000);

    let result = await sendScan(key);
    if (result.rejected && /^busy/.test(result.error || '')) {
      // The touchscreen is the kiosk's only screen, so a scan we don't know about
      // is a leftover (e.g. its screen was closed before it could cancel). It would
      // keep the sensors blocked for up to 2 minutes - cancel it and try once more.
      console.warn('[kiosk] agent busy with a leftover scan - cancelling it:', result.error);
      agent.cancel();
      await new Promise((ok) => setTimeout(ok, 500));
      await waitUntilAgentFree(8000);
      result = await sendScan(key);
    }
    scanIdRef.current = null;
    if (result.ok) {
      setReadings((prev) => ({ ...prev, [key]: result.reading }));
      setRun({ phase: 'done' }); // the agent's reading is accepted as it is
    } else if (!result.cancelled) {
      if (result.rejected) console.warn('[kiosk] agent refused the scan:', result.error);
      setRun({
        phase: 'failed',
        error: !result.rejected
          ? friendlyError(result.error, key)
          : /^busy/.test(result.error || '')
            ? 'The sensors are busy. Please wait a moment and try again.'
            : 'The kiosk couldn’t start this reading. Please try again or ask the clinic staff for help.',
      });
    }
  }

  function sendScan(key) {
    const extra = isGuest ? {} : { patient: patient.id }; // the edge saves the visit under this patient
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
          // The first tick of each countdown tells us how long the agent will
          // read (measurements.py HR/RR/TEMP/WEIGHT/HEIGHT_SECONDS), so the ring
          // always matches the hardware - no hard-coded seconds here.
          totalSeconds: r.tick ? r.totalSeconds : Math.max(1, Math.ceil(secondsLeft)),
          tick: { secondsLeft, live: st.live },
          weight: st.live?.kg != null && r.bmiStage !== 'height' ? { value: Number(st.live.kg).toFixed(1) } : r.weight,
        }));
      } else if (st.phase === 'countdown_end') {
        setRun((r) => ({ ...r, tick: null }));
      }
    }, extra);
    scanIdRef.current = id;
    setRun((r) => ({ ...r, scanId: id }));
    return done;
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

  // ---- results: wait for the edge service to confirm it saved this check-in
  // (it saves as soon as the 4th reading arrives - usually before this screen shows)
  const [waitKey, setWaitKey] = useState(0); // bump to wait again ("Try saving again")
  const redoRef = useRef(null);
  useEffect(() => {
    if (!isResults || isGuest || !agent) return undefined;
    setSaveState('saving');
    setSaveError('');
    redoRef.current = null;
    const timer = setTimeout(() => {
      setSaveError('The kiosk could not confirm the save. Please ask the clinic staff for help.');
      setSaveState('error');
    }, SAVE_WAIT_MS);
    const unsub = agent.onAssessment(sessionId, (msg) => {
      clearTimeout(timer);
      if (msg.status === 'saved') {
        setSaveState('saved');
      } else {
        // incomplete / rejected: the edge says which reading to take again
        redoRef.current = msg.redo_vitals || [];
        const names = redoRef.current.map((k) => KIOSK_STEPS.find((s) => s.key === k)?.name || k);
        setSaveError(
          names.length
            ? `This reading needs to be taken again: ${names.join(', ')}.`
            : 'The kiosk could not use these readings. Please try again.'
        );
        setSaveState('error');
      }
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [isResults, isGuest, agent, sessionId, waitKey]);

  /** "Try saving again": redo the reading the edge asked for, or just wait again. */
  function retrySave() {
    const redo = redoRef.current || [];
    const at = KIOSK_STEPS.findIndex((s) => redo.includes(s.key));
    if (at >= 0) {
      setReadings((r) => Object.fromEntries(Object.entries(r).filter(([k]) => !redo.includes(k))));
      setRun(IDLE);
      setIndex(at);
    } else {
      setWaitKey((k) => k + 1);
    }
  }

  // ---- what blocks scanning right now
  const sensorsReady = Boolean(agent) && connection === 'connected' && agentOnline;
  const sensorsMessage =
    connection !== 'connected'
      ? 'Connecting to the kiosk sensors…'
      : !agentOnline
        ? 'The kiosk sensors are offline. Please ask the clinic staff for help.'
        : 'Getting ready…';

  const done = new Set(Object.keys(readings));
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
            onRetrySave={retrySave}
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