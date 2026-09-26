import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import TofLiveFeed from './TofLiveFeed';
import WizardProgress from '../patient-app/VitalsWizard/WizardProgress';
import VitalStepScreen from '../patient-app/VitalsWizard/VitalStepScreen';
import ResultsScreen from '../patient-app/VitalsWizard/ResultsScreen';
import { VITAL_STEPS } from '../patient-app/VitalsWizard/stepsConfig';
import { takeReading, takeBloodPressureReading, submitCheckIn } from '../services/vitalsService';
import { getCurrentPatientProfile } from '../services/authService';
import '../patient-app/VitalsWizard/VitalsWizard.css';
import './KioskVitalsWizard.css';

export default function KioskVitalsWizard() {
  const navigate = useNavigate();
  const currentPatient = getCurrentPatientProfile();
  const patientCode = currentPatient?.id || 'guest';
  const [stepIndex, setStepIndex] = useState(0);
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
    await submitCheckIn(patientCode, readings, {
      id: 'K-01',
      name: 'Lobby — North Gate',
    });
    navigate('/kiosk');
  }

  return (
    <KioskShell>
      <div className="mk-kwizard">
        {!isResultsStep && (
          <WizardProgress currentStepIndex={stepIndex} patientCode={patientCode} />
        )}
        <div className="mk-kwizard__content">
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
              extra={currentStep.key === 'bmi' ? <TofLiveFeed compact /> : null}
            />
          )}
        </div>
      </div>
    </KioskShell>
  );
}
