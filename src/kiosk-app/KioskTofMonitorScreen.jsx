import { useNavigate } from 'react-router-dom';
import KioskShell from './KioskShell';
import TofLiveFeed from './TofLiveFeed';
import Button from '../components/Button';
import './KioskTofMonitorScreen.css';

/**
 * Staff / debug screen: full-size live feed of the VL53L0X ToF sensor over MQTT.
 * Route: /kiosk/tof-live
 */
export default function KioskTofMonitorScreen() {
  const navigate = useNavigate();

  return (
    <KioskShell>
      <div className="mk-tofmon">
        <div className="mk-tofmon__top">
          <div>
            <h1 className="mk-tofmon__title">Sensor Monitor</h1>
            <p className="mk-tofmon__subtitle">
              Live readings from the Time-of-Flight height sensor, streamed from the kiosk over MQTT.
            </p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/kiosk')}>
            ← Back to kiosk
          </Button>
        </div>

        <div className="mk-tofmon__body">
          <TofLiveFeed />
        </div>
      </div>
    </KioskShell>
  );
}
