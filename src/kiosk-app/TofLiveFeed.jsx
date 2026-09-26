import { useTofLiveFeed, MQTT_URL, TOF_TOPIC } from '../services/tofLiveService';
import './TofLiveFeed.css';

const SPARK_W = 320;
const SPARK_H = 64;

/** Turns the history array into SVG path data, leaving gaps where the sensor was out of range. */
function sparklinePath(history) {
  const values = history.filter((v) => v != null);
  if (values.length < 2) return '';
  const max = Math.max(120, ...values) * 1.1; // cm; keep a sensible floor so small jitter looks small
  const step = SPARK_W / Math.max(history.length - 1, 1);
  let d = '';
  let penDown = false;
  history.forEach((v, i) => {
    if (v == null) {
      penDown = false;
      return;
    }
    const x = (i * step).toFixed(1);
    const y = (SPARK_H - (v / max) * SPARK_H).toFixed(1);
    d += `${penDown ? 'L' : 'M'}${x},${y} `;
    penDown = true;
  });
  return d.trim();
}

function statusOf({ connection, publisherOnline, stale, reading }) {
  if (connection !== 'connected') {
    return {
      tone: 'error',
      label: connection === 'connecting' ? 'Connecting…' : 'Broker offline',
      hint: `Can't reach the MQTT broker at ${MQTT_URL}. Is Mosquitto running with the WebSocket listener?`,
    };
  }
  if (publisherOnline === false || stale) {
    return {
      tone: 'warn',
      label: 'Waiting for sensor',
      hint: 'Connected to the broker, but no ToF readings are arriving. Start tof_mqtt_publisher.py on the Pi.',
    };
  }
  return {
    tone: 'live',
    label: reading?.simulated ? 'Live · simulated' : 'Live',
    hint: null,
  };
}

/**
 * Live readout of the VL53L0X Time-of-Flight sensor, streamed over MQTT.
 * `compact` renders a smaller card for embedding inside the vitals wizard.
 */
export default function TofLiveFeed({ compact = false }) {
  const feed = useTofLiveFeed();
  const { reading, history, stale } = feed;
  const status = statusOf(feed);
  const showValue = reading && !stale;

  return (
    <section className={`mk-tof${compact ? ' mk-tof--compact' : ''}`} aria-live="polite">
      <header className="mk-tof__header">
        <span className="mk-tof__title">{compact ? 'ToF sensor' : 'ToF distance sensor'}</span>
        <span className={`mk-tof__pill mk-tof__pill--${status.tone}`}>
          <span className="mk-tof__dot" aria-hidden="true" />
          {status.label}
        </span>
      </header>

      <div className="mk-tof__value">
        {!showValue ? (
          <span className="mk-tof__placeholder">—</span>
        ) : reading.inRange ? (
          <>
            <span className="mk-tof__number">{reading.distanceCm.toFixed(1)}</span>
            <span className="mk-tof__unit">cm</span>
          </>
        ) : (
          <span className="mk-tof__out">Out of range</span>
        )}
      </div>

      <svg
        className="mk-tof__spark"
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Distance over the last 30 seconds"
      >
        <line x1="0" y1={SPARK_H - 0.5} x2={SPARK_W} y2={SPARK_H - 0.5} className="mk-tof__baseline" />
        <path d={sparklinePath(history)} className="mk-tof__line" />
      </svg>

      {status.hint && <p className="mk-tof__hint">{status.hint}</p>}

      {!compact && (
        <dl className="mk-tof__meta">
          <div>
            <dt>Broker</dt>
            <dd>{MQTT_URL}</dd>
          </div>
          <div>
            <dt>Topic</dt>
            <dd>{TOF_TOPIC}</dd>
          </div>
          <div>
            <dt>Raw</dt>
            <dd>{showValue && reading.distanceMm != null ? `${reading.distanceMm} mm` : '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
