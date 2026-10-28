import Button from '../../components/Button';
import { STEP_BY_KEY } from './kioskSteps';

/**
 * Last screen: the patient's own readings - and nothing about risk.
 * The risk level (Normal / Medium / High) is only shown to staff in the
 * admin console.
 *
 *   session  GET /api/kiosk-sessions/{id} (readings + official heart rate)
 *   missing  steps the patient finished without
 */
export default function KioskResults({ session, missing, isGuest, finishing, error, onFinish }) {
  const r = session?.readings || {};
  const finger = r.respirationSpo2Hr;
  const bp = r.bloodPressure;
  const hr = session?.heartRate; // official: BP monitor pulse, finger sensor if no BP

  const fromStep = (key) => ({ icon: STEP_BY_KEY[key].icon, accent: STEP_BY_KEY[key].accent, accentBg: STEP_BY_KEY[key].accentBg });
  const cards = [
    { ...fromStep('bmi'), label: 'BMI', value: r.bmi && `${r.bmi.value} ${r.bmi.unit}`,
      sub: r.bmi && `${Number(r.bmi.weight?.value).toFixed(1)} kg · ${r.bmi.height?.value} cm` },
    { ...fromStep('respirationSpo2Hr'), label: 'Breathing rate',
      value: finger?.respiration && `${finger.respiration.value} ${finger.respiration.unit}` },
    { icon: '◉', accent: 'var(--vital-spo2)', accentBg: 'var(--vital-spo2-bg)', label: 'Blood oxygen (SpO2)',
      value: finger?.spo2 && `${finger.spo2.value}${finger.spo2.unit}` },
    { ...fromStep('bloodPressure'), label: 'Blood pressure', value: bp && `${bp.systolic}/${bp.diastolic} ${bp.unit}` },
    { icon: '♥', accent: 'var(--vital-heart)', accentBg: 'var(--vital-heart-bg)', label: 'Heart rate',
      value: hr && `${hr.value} ${hr.unit}` },
    { ...fromStep('temperature'), label: 'Temperature', value: r.temperature && `${r.temperature.value} ${r.temperature.unit}` },
  ];

  return (
    <div className="mk-results">
      <div className="mk-results__header">
        <div className="mk-results__check">✓</div>
        <div>
          <h2 className="mk-results__title">Check-In Complete</h2>
          <p className="mk-results__subtitle">
            {isGuest
              ? 'Thank you! Here is a summary of your readings.'
              : 'Thank you! Your readings have been saved to your record.'}
            {missing.length > 0 && ' Some readings could not be taken - our staff will help you with those.'}
          </p>
        </div>
      </div>

      <div className="mk-results__grid">
        {cards.map((c) => {
          return (
            <div key={c.label} className="mk-results__card">
              <div className="mk-results__card-top">
                <div className="mk-results__card-icon" style={{ background: c.accentBg, color: c.accent }}>
                  {c.icon}
                </div>
              </div>
              <p className="mk-results__card-label">{c.label}</p>
              <p className="mk-results__card-value">{c.value || 'Not measured'}</p>
              {c.value && c.sub && <p className="mk-results__card-sub">{c.sub}</p>}
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mk-scan__error" role="alert">
          <strong>Could not save your check-in.</strong>
          <span>{error}</span>
        </div>
      )}

      <Button fullWidth onClick={onFinish} disabled={finishing}>
        {finishing ? 'Saving…' : error ? '↻ Try saving again' : '⌂ Finish & Sign out'}
      </Button>
    </div>
  );
}
