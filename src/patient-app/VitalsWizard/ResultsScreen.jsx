import Button from '../../components/Button';
import { VITAL_STEPS, getStepReading, hasStepReading } from './stepsConfig';

function statusFor(step, reading) {
  // Simple demo status logic — a real implementation would use clinical ranges from the backend.
  if (!reading) return 'Pending';
  return 'Optimal';
}

export default function ResultsScreen({ readings, onFinish }) {
  return (
    <div className="mk-results">
      <div className="mk-results__header">
        <div className="mk-results__check">✓</div>
        <div>
          <h2 className="mk-results__title">Check-In Complete</h2>
          <p className="mk-results__subtitle">Here's your vital signs summary.</p>
        </div>
      </div>

      <div className="mk-results__grid">
        {VITAL_STEPS.map((step) => {
          const reading = getStepReading(step, readings);
          const hasReading = hasStepReading(step, reading);
          return (
            <div key={step.key} className="mk-results__card">
              <div className="mk-results__card-top">
                <div className="mk-results__card-icon" style={{ background: step.accentBg, color: step.accent }}>
                  {step.icon}
                </div>
                <span className="mk-results__status">{statusFor(step, hasReading)}</span>
              </div>
              <p className="mk-results__card-label">{step.label}</p>
              <p className="mk-results__card-value">
                {hasReading
                  ? step.isBloodPressure
                    ? `${reading.systolic}/${reading.diastolic} mmHg`
                    : step.isHeartRateSpo2
                      ? `${reading.heartRate.value} ${reading.heartRate.unit} · ${reading.spo2.value}${reading.spo2.unit}`
                      : `${reading.value} ${reading.unit}`
                  : '—'}
              </p>
            </div>
          );
        })}
      </div>

      <Button fullWidth onClick={onFinish}>
        ⌂ Finish &amp; Sign out
      </Button>
    </div>
  );
}
