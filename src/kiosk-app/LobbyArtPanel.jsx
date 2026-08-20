import './LobbyArtPanel.css';

export default function LobbyArtPanel() {
  return (
    <div className="mk-kiosk-art" aria-hidden="true">
      <div className="mk-kiosk-art__glow mk-kiosk-art__glow--1" />
      <div className="mk-kiosk-art__glow mk-kiosk-art__glow--2" />
      <div className="mk-kiosk-art__floor" />
    </div>
  );
}
