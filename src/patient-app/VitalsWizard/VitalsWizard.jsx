import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PhoneShell from '../PhoneShell';
import WizardProgress from './WizardProgress';
import VitalStepScreen from './VitalStepScreen';
import ResultsScreen from './ResultsScreen';
import { VITAL_STEPS } from './stepsConfig';
import { takeReading, takeBloodPressureReading, submitCheckIn } from '../../services/vitalsService';
import { getCurrentPatientProfile } from '../../services/authService';
import './VitalsWizard.css';

export default function VitalsWizard() {
  const navigate = useNavigate();
  const currentPatient = getCurrentPatientProfile();
  const patientCode = currentPatient?.id || 'guest';
  const [stepIndex, setStepIndex] = useState(0); // 0..5 = vital steps, 6 = results
  const [readings, setReadings] = useState({});
  const [scanning, setScanning] = useState(false);

  const isResultsStep = stepIndex === VITAL_STEPS.length;
  const currentStep = VITAL_STEPS[stepIndex];
  const currentReading = currentStep ? readings[currentStep.key] : null;
  const hasCurrentReading = currentStep
    ? currentStep.isBloodPressure
      ? currentReading?.systolic != null
      : currentReading?.value != null
    : false;

  async function handleScanOrContinue() {
    if (hasCurrentReading) {
      // Already have a reading for this step — just advance.
      goNext();
      return;
    }

    setScanning(true);
    try {
      const result = currentStep.isBloodPressure
        ? await takeBloodPressureReading()
        : await takeReading(currentStep.key);
      setReadings((prev) => ({ ...prev, [currentStep.key]: result }));
    } finally {
      setScanning(false);
    }
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, VITAL_STEPS.length));
  }

  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }

  async function handleFinish() {
    await submitCheckIn(patientCode, readings);
    navigate('/app/vitals-home');
  }

  return (
    <PhoneShell>
      <div className="mk-wizard">
        {!isResultsStep && (
          <WizardProgress
            currentStepIndex={stepIndex}
            patientCode={patientCode}
          />
        )}

        <div className="mk-wizard__content">
          {isResultsStep ? (
            <ResultsScreen readings={readings} onFinish={handleFinish} />
          ) : (
            <VitalStepScreen
              step={currentStep}
              scanning={scanning}
              reading={currentReading}
              onBack={goBack}
              onScan={handleScanOrContinue}
              isFirstStep={stepIndex === 0}
            />
          )}
        </div>
      </div>
    </PhoneShell>
  );
}
