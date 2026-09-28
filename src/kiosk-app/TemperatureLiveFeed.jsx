import { useTemperatureLiveFeed, MQTT_URL, TEMP_TOPIC } from '../services/temperatureLiveService';
import './TofLiveFeed.css';

const SPARK_W = 320;
const SPARK_H = 64;
const SPARK_MIN_C = 20; // fixed °C scale so room vs. forehead is easy to see
const SPARK_MAX_C = 42;

/** Turns the history array into SVG path data, leaving gaps where readings were invalid. */
function sparklinePath(history) {
  if (history.filter((v) => v != null).length < 2) return '';
  const step = SPARK_W / Math.max(history.length - 1, 1);
  let d = '';
  let penDown = false;
  history.forEach((v, i) => {
    if (v == null) {
      penDown = false;
      return;
    }
    const clamped = Math.min(SPARK_MAX_C, Math.max(SPARK_MIN_C, v));
    const x = (i * step).toFixed(1);
    const y = (SPARK_H - ((clamped - SPARK_MIN_C) / (SPARK_MAX_C - SPARK_MIN_C)) * SPARK_H).toFixed(1);
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
      hint: 'Connected to the broker, but no temperature readings are arriving. Start temp_mqtt_publisher.py on the Pi.',
    };
  }
  return {
    tone: 'live',
    label: reading?.simulated ? 'Live · simulated' : 'Live',
    hint: null,
  };
}

/**
 * Live readout of the MLX90614 (GY-906) infrared thermometer, streamed over MQTT.
 * Shows the object (target) temperature large, with ambient alongside.
 * `compact` renders a smaller card for embedding inside the vitals wizard.
 */
export default function TemperatureLiveFeed({ compact = false }) {
  const feed = useTemperatureLiveFeed();
  const { reading, history, stale } = feed;
  const status = statusOf(feed);
  const showValue = reading && !stale;

  return (
    <section className={`mk-tof${compact ? ' mk-tof--compact' : ''}`} aria-live="polite">
      <header className="mk-tof__header">
        <span className="mk-tof__title">{compact ? 'IR thermometer' : 'IR temperature sensor'}</span>
        <span className={`mk-tof__pill mk-tof__pill--${status.tone}`}>
          <span className="mk-tof__dot" aria-hidden="true" />
          {status.label}
        </span>
      </header>

      <div className="mk-tof__value">
        {!showValue ? (
          <span className="mk-tof__placeholder">—</span>
        ) : reading.valid ? (
          <>
            <span className="mk-tof__number">{reading.objectC.toFixed(1)}</span>
            <span className="mk-tof__unit">°C</span>
            {reading.ambientC != null && (
              <span className="mk-tof__unit mk-tof__secondary">
                ambient {reading.ambientC.toFixed(1)} °C
              </span>
            )}
          </>
        ) : (
          <span className="mk-tof__out">Reading unavailable</span>
        )}
      </div>

      <svg
        className="mk-tof__spark mk-tof__spark--temp"
        viewBox={`0 0 ${SPARK_W} ${SPARK_H}`}
        preserveAspectRatio="none"
        role="img"
        aria-label="Object temperature over the last 30 seconds"
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
            <dd>{TEMP_TOPIC}</dd>
          </div>
          <div>
            <dt>Ambient</dt>
            <dd>{showValue && reading.ambientC != null ? `${reading.ambientC.toFixed(2)} °C` : '—'}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
