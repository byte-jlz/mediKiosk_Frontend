import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import StartScreen from './kiosk-app/StartScreen';
import WelcomeScreen from './kiosk-app/WelcomeScreen';
import KioskQrScanScreen from './kiosk-app/KioskQrScanScreen';
import SignedInScreen from './kiosk-app/SignedInScreen';
import GuestWelcomeScreen from './kiosk-app/GuestWelcomeScreen';
import KioskVitalsWizard from './kiosk-app/KioskVitalsWizard';

// The kiosk app: a portrait touchscreen (1080 x 1920) in the clinic.
//
//   Start -> Welcome -> Login with QR -> Signed in ----> check-in -> results
//                    \-> Continue as Guest -> Guest welcome -/
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/kiosk" element={<StartScreen />} />
        <Route path="/kiosk/welcome" element={<WelcomeScreen />} />
        <Route path="/kiosk/qr-scan" element={<KioskQrScanScreen />} />
        <Route path="/kiosk/signed-in" element={<SignedInScreen />} />
        <Route path="/kiosk/guest" element={<GuestWelcomeScreen />} />
        <Route path="/kiosk/vitals" element={<KioskVitalsWizard />} />
        <Route path="*" element={<Navigate to="/kiosk" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
