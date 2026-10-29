import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import WizardProgress from './wizard/WizardProgress';
import ScanStepScreen from './wizard/ScanStepScreen';
import KioskResults from './wizard/KioskResults';
import { KIOSK_STEPS, STEP_BY_KEY } from './wizard/kioskSteps';
import { KIOSK_ID, useKioskAgent } from '../services/kioskAgentService';
import { startKioskSession, getKioskSession, completeKioskSession } from '../services/kioskSessionService';
import { mirrorCheckInToAdminStore } from '../services/vitalsService';
import { getCurrentPatientProfile } from '../services/authService';
import Button from '../components/Button';
import './wizard/wizard.css';
import './KioskVitalsWizard.css';

const KIOSK_NAME = 'Lobby — North Gate';
const IDLE = { phase: 'idle' };

/**
 * The kiosk check-in.
 *
 *  1. Start a backend session (the agent files every result under it).
 *  2. For each step, send a scan to the kiosk agent over MQTT and follow its
 *     `state` messages: "I'm ready" prompts, countdowns, then the result.
 *  3. Failed?  Try again, or "Skip for now" ONCE (the step moves to the end).
 *     Failed again after skipping -> "Continue without it" (saved as
 *     incomplete and flagged for staff; the risk model is not run).
 *  4. Results: the patient's own readings only - the risk level is staff-only.
 */
export default function KioskVitalsWizard() {
  const navigate = useNavigate();
  const patient = getCurrentPatientProfile();
  const patientId = patient?.id || null;
  const patientName = patient?.firstName || 'Guest';
  const fullName = [patient?.firstName, patient?.lastName].filter(Boolean).join(' ');

  const { agent, connection, agentOnline } = useKioskAgent();

  const [sessionId, setSessionId] = useState(null);
  const [sessionError, setSessionError] = useState(null);
  const [order, setOrder] = useState(() => KIOSK_STEPS.map((s) => s.key));
  const [position, setPosition] = useState(0); // index in `order`; order.length = results
  const [skipped, setSkipped] = useState({}); // key -> true once it was skipped
  const [missing, setMissing] = useState([]); // keys finished without
  const [readings, setReadings] = useState({}); // key -> agent reading
  const [run, setRun] = useState(IDLE);
  const [session, setSession] = useState(null); // backend view, for the results screen
  const [finishing, setFinishing] = useState(false);
  const [finishError, setFinishError] = useState(null);

  const scanIdRef = useRef(null);
  const agentRef = useRef(null);
  agentRef.current = agent;

  // ---- 1. backend session
  const openSession = useCallback(() => {
    setSessionError(null);
    startKioskSession(KIOSK_ID, patientId, fullName)
      .then((s) => setSessionId(s.sessionId))
      .catch((e) => setSessionError(e.message));
  }, [patientId, fullName]);

  useEffect(openSession, [openSession]);

  // Leaving the screen mid-scan: tell the agent to stop.
  useEffect(
    () => () => {
      if (scanIdRef.current && agentRef.current) agentRef.current.cancel(scanIdRef.current);
    },
    []
  );

  const isResults = position >= order.length;
  const currentKey = order[position];
  const step = STEP_BY_KEY[currentKey];
  const isLast = position === order.length - 1;

  // ---- results screen: fetch the backend's view (official heart rate etc.)
  useEffect(() => {
    if (!isResults || !sessionId) return;
    getKioskSession(sessionId)
      .then(setSession)
      .catch((e) => setFinishError(e.message));
  }, [isResults, sessionId]);

  // ---- 2. one scan
  async function startScan() {
    if (!agent || !sessionId) return;
    const key = currentKey;
    setRun({ phase: 'starting' });
    const { id, done } = agent.scan(key, sessionId, (st) => {
      if (st.phase === 'awaiting_confirm') {
        setRun((r) => ({ ...r, phase: 'awaiting', prompt: { step: st.step, message: st.message }, tick: null }));
      } else if (st.phase === 'confirmed' || st.phase === 'accepted') {
        setRun((r) => ({ ...r, phase: 'running', prompt: null }));
      } else if (st.phase === 'measuring') {
        setRun((r) => ({
          ...r,
          phase: 'running',
          tick: { secondsLeft: st.seconds_left ?? 0, live: st.live },
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
      setRun({ phase: 'done' });
    } else {
      setRun({
        phase: 'failed',
        error: result.rejected
          ? `The sensors are busy (${result.error}). Please wait a moment and try again.`
          : friendlyError(result.error),
      });
    }
  }

  function confirmStep() {
    if (agent && run.scanId && run.prompt) {
      agent.confirm(run.scanId, run.prompt.step);
      setRun((r) => ({ ...r, phase: 'running', prompt: null }));
    }
  }

  function next() {
    setRun(IDLE);
    setPosition((p) => p + 1);
  }

  // ---- 3. skip once: move this step to the end
  function skipForNow() {
    setSkipped((s) => ({ ...s, [currentKey]: true }));
    setOrder((o) => [...o.filter((k) => k !== currentKey), currentKey]);
    setRun(IDLE);
  }

  function giveUp() {
    setMissing((m) => [...m, currentKey]);
    next();
  }

  function cancelCheckIn() {
    if (scanIdRef.current && agent) agent.cancel(scanIdRef.current);
    navigate('/kiosk');
  }

  // ---- 4. finish
  async function finish() {
    setFinishing(true);
    setFinishError(null);
    try {
      const saved = await completeKioskSession(sessionId, missing.length > 0);
      if (patientId) {
        // Until the admin console reads check-ins from the backend (step 4b),
        // also keep its local demo store up to date.
        mirrorCheckInToAdminStore(patient, saved.readings, { id: KIOSK_ID, name: KIOSK_NAME });
      }
      navigate('/kiosk');
    } catch (e) {
      setFinishError(e.message);
      setFinishing(false);
    }
  }

  // ---- what blocks scanning right now
  const sensorsReady = Boolean(agent) && connection === 'connected' && agentOnline && Boolean(sessionId);
  const sensorsMessage = sessionError
    ? `Can't reach the clinic server (${sessionError}).`
    : connection !== 'connected'
      ? 'Connecting to the kiosk sensors…'
      : !agentOnline
        ? 'The kiosk sensors are offline. Please ask the staff for help.'
        : 'Getting ready…';

  const done = Object.fromEntries(Object.keys(readings).map((k) => [k, true]));
  const runActive = ['starting', 'awaiting', 'running'].includes(run.phase);

  return (
    <KioskShell>
      <div className="mk-kwizard">
        {!isResults && (
          <div className="mk-kwizard__top">
            <WizardProgress
              order={order}
              position={position}
              done={done}
              missing={missing}
              patientName={patientName}
            />
            <button type="button" className="mk-kwizard__cancel" onClick={cancelCheckIn}>
              ✕ Cancel check-in
            </button>
          </div>
        )}

        {sessionError && (
          <div className="mk-kwizard__banner" role="alert">
            Can't reach the clinic server: {sessionError}{' '}
            <Button variant="secondary" onClick={openSession}>
              Retry
            </Button>
          </div>
        )}

        <div className="mk-kwizard__content">
          {isResults ? (
            <KioskResults
              session={session}
              missing={missing}
              isGuest={!patientId}
              finishing={finishing}
              error={finishError}
              onFinish={finish}
            />
          ) : (
            <ScanStepScreen
              key={currentKey}
              step={step}
              run={run}
              reading={readings[currentKey]}
              sensorsReady={sensorsReady}
              sensorsMessage={sensorsMessage}
              canSkip={!skipped[currentKey] && !isLast && !runActive}
              canGiveUp={(Boolean(skipped[currentKey]) || isLast) && run.phase === 'failed'}
              onStart={startScan}
              onConfirm={confirmStep}
              onContinue={next}
              onRetry={startScan}
              onSkip={skipForNow}
              onGiveUp={giveUp}
            />
          )}
        </div>
      </div>
    </KioskShell>
  );
}

/** Agent error texts are written for logs - soften the common ones for the screen. */
function friendlyError(error) {
  if (!error) return 'Please try again.';
  if (error.startsWith('nobody confirmed')) return 'We waited a while for you. Press "Try again" when you are ready.';
  if (error.includes('finger')) return 'Your finger moved or was not on the sensor. Rest it gently on the pad and keep still.';
  if (error.startsWith('sensor problem')) return 'There is a problem with this sensor. You can try again or ask the staff for help.';
  return error.charAt(0).toUpperCase() + error.slice(1) + '.';
}
