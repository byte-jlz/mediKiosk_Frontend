import { VITAL_STEPS } from './stepsConfig';

const ALL_LABELS = [...VITAL_STEPS.map((s) => s.label), 'Results'];

export default function WizardProgress({ currentStepIndex, patientName, patientCode }) {
  const totalSteps = ALL_LABELS.length;
  const percent = Math.round(((currentStepIndex + 1) / totalSteps) * 100);

  return (
    <div className="mk-wizard-progress">
      <p className="mk-wizard-progress__welcome">Welcome, Patient</p>
      <p className="mk-wizard-progress__patient">Patient - {patientCode}</p>

      <div className="mk-wizard-progress__meta">
        <span>Step {currentStepIndex + 1} of {totalSteps}</span>
        <span>{percent}% complete</span>
      </div>
      <div className="mk-wizard-progress__track">
        <div className="mk-wizard-progress__fill" style={{ width: `${percent}%` }} />
      </div>

      <div className="mk-wizard-progress__steps">
        {ALL_LABELS.map((label, i) => {
          const done = i < currentStepIndex;
          const active = i === currentStepIndex;
          return (
            <div key={label} className="mk-wizard-progress__step">
              <div
                className={`mk-wizard-progress__circle${done ? ' is-done' : ''}${active ? ' is-active' : ''}`}
              >
                {done ? '✓' : i + 1}
              </div>
              <span className={`mk-wizard-progress__label${active ? ' is-active' : ''}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
