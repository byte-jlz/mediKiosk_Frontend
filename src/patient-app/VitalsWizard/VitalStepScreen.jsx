import Button from '../../components/Button';

/**
 * Renders one step of the vitals wizard. Handles both single-value vitals
 * (heart rate, bmi, temperature, spo2, respiration) and the special two-value
 * blood pressure step.
 */
export default function VitalStepScreen({
  step,
  scanning,
  reading,
  onBack,
  onScan,
  isFirstStep,
}) {
  const hasReading = step.isBloodPressure
    ? reading && reading.systolic != null
    : reading && reading.value != null;

  return (
    <div className="mk-vital-step">
      <div className="mk-vital-step__panel" style={{ background: step.accentBg }}>
        <div className="mk-vital-step__icon" style={{ background: step.accent }}>
          {step.icon}
        </div>
        <h2 className="mk-vital-step__title">{step.label}</h2>
        <p className="mk-vital-step__desc">{step.description}</p>

        <div className="mk-vital-step__actions">
          {!isFirstStep && (
            <Button variant="secondary" onClick={onBack} disabled={scanning}>
              ← Back
            </Button>
          )}
          <Button
            accentColor={step.accent}
            variant="accent"
            onClick={onScan}
            disabled={scanning}
          >
            {scanning ? 'Reading…' : hasReading ? 'Continue →' : `${step.scanButtonLabel} →`}
          </Button>
        </div>
      </div>

      <div className="mk-vital-step__readout">
        <div className={`mk-vital-step__dial${scanning ? ' is-scanning' : ''}`}>
          {scanning ? (
            <span className="mk-vital-step__spinner" aria-hidden="true" />
          ) : step.isBloodPressure ? (
            <span className="mk-vital-step__value">
              {hasReading ? `${reading.systolic}/${reading.diastolic}` : '—'}
            </span>
          ) : (
            <span className="mk-vital-step__value">
              {hasReading ? reading.value : '—'}
            </span>
          )}
        </div>
        <p className="mk-vital-step__unit">
          {hasReading
            ? step.isBloodPressure
              ? 'mmHg'
              : reading.unit
            : ''}
        </p>
        <p className="mk-vital-step__unit-label">{step.unitLabel}</p>
      </div>
    </div>
  );
}
