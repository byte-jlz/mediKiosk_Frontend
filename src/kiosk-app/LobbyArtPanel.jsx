import './LobbyArtPanel.css';

/** Navy banner across the top of the portrait kiosk. Optional children sit on top of the art. */
export default function LobbyArtPanel({ children }) {
  return (
    <div className="mk-kiosk-art">
      <div className="mk-kiosk-art__glow mk-kiosk-art__glow--1" aria-hidden="true" />
      <div className="mk-kiosk-art__glow mk-kiosk-art__glow--2" aria-hidden="true" />
      <div className="mk-kiosk-art__floor" aria-hidden="true" />
      {children && <div className="mk-kiosk-art__content">{children}</div>}
    </div>
  );
}
