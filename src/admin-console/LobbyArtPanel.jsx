import logoFull from '../assets/logo-full-white.png';
import './LobbyArtPanel.css';

/** Left panel of the sign-in pages. */
export default function LobbyArtPanel() {
  return (
    <div className="mk-kiosk-art">
      <div className="mk-kiosk-art__glow mk-kiosk-art__glow--1" />
      <div className="mk-kiosk-art__glow mk-kiosk-art__glow--2" />
      <div className="mk-kiosk-art__content">
        <img src={logoFull} alt="MediKiosk" className="mk-kiosk-art__logo" />
        <p className="mk-kiosk-art__tagline">Vital-signs screening and queue priority for clinics.</p>
      </div>
    </div>
  );
}
