import { useEffect, useRef, useState } from 'react';
import Icon from '../ui/Icon';
import { KioskButton, Spacer } from '../ui/KioskUI';
import { officialHeartRate } from './kioskSteps';

const RETURN_AFTER_SECONDS = 30;

/**
 * Last screen: the patient's own readings - and nothing about risk.
 * The risk level is only shown to staff in the admin console.
 *
 *   readings   { stepKey: agent reading }
 *   skipped    Set of steps a guest skipped
 *   saveState  registered: 'saving' | 'saved' | 'error'; guest: 'none'
 *   onFinish   back to the Start screen (signs the patient out)
 *   onRetrySave
 */
export default function KioskResults({ readings, skipped, isGuest, firstName, saveState, saveError, onFinish, onRetrySave }) {
  const canLeave = isGuest || saveState === 'saved';
  const secondsLeft = useCountdown(RETURN_AFTER_SECONDS, canLeave, onFinish);

  const finger = readings.respirationSpo2Hr;
  const bp = readings.bloodPressure;
  const hr = officialHeartRate(readings);
  const bmi = readings.bmi;
  const temp = readings.temperature;

  const cards = [
    // same order as the check-in: BMI first
    { color: 'bmi', icon: 'bmi', label: 'BMI', skip: skipped.has('bmi'), value: bmi?.value, unit: bmi?.unit || 'kg/m²',
      sub: bmi?.weight && bmi?.height ? `${Number(bmi.weight.value).toFixed(1)} kg · ${bmi.height.value} cm` : null },
    { color: 'breath', icon: 'breath', label: 'Breathing rate', skip: skipped.has('respirationSpo2Hr'),
      value: finger?.respiration?.value, unit: finger?.respiration?.unit || '/min' },
    { color: 'breath', icon: 'drop', label: 'Blood oxygen', skip: skipped.has('respirationSpo2Hr'),
      value: finger?.spo2?.value, unit: finger?.spo2?.unit || '%' },
    { color: 'bp', icon: 'bp', label: 'Blood pressure', skip: skipped.has('bloodPressure'),
      value: bp && `${bp.systolic}/${bp.diastolic}`, unit: bp?.unit || 'mmHg' },
    { color: 'bp', icon: 'heart', label: 'Heart rate', skip: !hr && skipped.has('bloodPressure'),
      value: hr?.value, unit: 'bpm' },
    { color: 'temp', icon: 'temp', label: 'Temperature', skip: skipped.has('temperature'),
      value: temp?.value, unit: temp?.unit || '°C' },
  ];

  const subtitle = isGuest
    ? 'Thank you! Here’s a summary of your readings.'
    : saveState === 'saved'
      ? `Thank you, ${firstName}. Your readings are saved to your record.`
      : saveState === 'error'
        ? 'Your readings are below, but they haven’t been saved yet.'
        : 'Saving your readings to your record…';

  return (
    <div className="k-results">
      <div className="k-results__header">
        <div className="k-results__check">
          <Icon name="check" size={70} stroke={2.6} />
        </div>
        <div>
          <h1 className="k-h1 k-h1--results">Check-in complete</h1>
          <p className="k-results__sub">{subtitle}</p>
        </div>
      </div>

      <div className="k-results__grid">
        {cards.map((c) => (
          <div key={c.label} className="k-result" data-color={c.color}>
            <div className="k-result__top">
              <span className="k-result__icon">
                <Icon name={c.icon} size={30} stroke={1.9} />
              </span>
              <span>{c.label}</span>
            </div>
            {c.value != null && c.value !== '' ? (
              <p className="k-result__value">
                {c.value}
                <span> {c.unit}</span>
              </p>
            ) : (
              <p className="k-result__missing">{c.skip ? 'Skipped' : 'Not measured'}</p>
            )}
            {c.value != null && c.sub && <p className="k-result__sub">{c.sub}</p>}
          </div>
        ))}
      </div>

      {saveState === 'error' ? (
        <div className="k-callout k-callout--error" role="alert">
          <Icon name="alert" size={40} />
          <div>
            <strong>We couldn’t save your check-in</strong>
            <p>{saveError}</p>
          </div>
        </div>
      ) : (
        <div className="k-callout k-callout--tint">
          <Icon name="info" size={40} />
          <p>
            {isGuest
              ? 'These readings are not sent to the clinic staff. Sign in next time to save them to your record.'
              : 'Please take a seat. A nurse will review your readings and call your name.'}
          </p>
        </div>
      )}

      <Spacer />
      {saveState === 'error' ? (
        <KioskButton icon="retry" onClick={onRetrySave}>
          Try saving again
        </KioskButton>
      ) : (
        <KioskButton icon="home" onClick={onFinish} disabled={!canLeave}>
          {isGuest ? 'Finish' : saveState === 'saving' ? 'Saving…' : 'Finish & sign out'}
        </KioskButton>
      )}
      <p className="k-small-center">
        {canLeave
          ? `Returning to the start screen in ${secondsLeft} second${secondsLeft === 1 ? '' : 's'}`
          : saveState === 'error'
            ? 'If this keeps happening, please ask the clinic staff for help.'
            : ' '}
      </p>
    </div>
  );
}

/** Counts down once `running` is true, then calls onDone. */
function useCountdown(seconds, running, onDone) {
  const [left, setLeft] = useState(seconds);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    if (!running) return undefined;
    setLeft(seconds);
    const started = Date.now();
    const id = setInterval(() => {
      const remaining = seconds - Math.floor((Date.now() - started) / 1000);
      setLeft(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(id);
        onDoneRef.current();
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, seconds]);
  return left;
}