import { useEffect, useRef } from 'react';

/**
 * The SpO2 & RR picture: the kiosk console seen from the front (screen on the
 * left, temperature / FINGER / QR sensors on the right), a hand resting flat
 * with the index fingertip on the finger sensor, and a side view of the
 * fingertip resting lightly on the sensor (red light under it).
 *
 * The drawn kiosk screen shows the state: SpO2 & RR, finger detected, the
 * countdown, finger off, starting again, the results, or an error.
 *
 *   mode            hand            drawn screen      colour
 *   wait            moves in (loop) SpO2 & RR         teal
 *   detected        resting         Finger detected   green
 *   measure         resting         countdown         green
 *   move            shaking         countdown         orange
 *   lift            lifted          Finger off        orange
 *   restartBack     resting         Starting again    orange   (6a: finger already back)
 *   again           moves in (loop) Put finger back   orange   (6b: waiting for the finger)
 *   fail / sensor   away            No steady reading / Sensor problem   red
 *   done            moves away      the results       green
 *
 * Every number comes from the agent (countdown, how long the finger is off,
 * the results). "Reduce motion" turns the moving hand into a still picture.
 */

const Y_AWAY = 260; // hand below the console (out of the picture)
const Y_REST = 110; // index fingertip on the finger sensor
const LOOP_MS = 4400;

const MODES = {
  wait: { hand: 'loop', screen: 'label', tone: 'teal' },
  detected: { hand: 'rest', screen: 'detected', tone: 'green' },
  measure: { hand: 'rest', screen: 'count', tone: 'green' },
  move: { hand: 'jiggle', screen: 'count', tone: 'orange' },
  lift: { hand: 'lift', screen: 'off', tone: 'orange' },
  restartBack: { hand: 'rest', screen: 'restart', tone: 'orange', lines: ['Starting', 'again'] },
  again: { hand: 'loop', screen: 'restart', tone: 'orange', lines: ['Put finger', 'back'] },
  fail: { hand: 'away', screen: 'error', tone: 'red', lines: ['No steady', 'reading'] },
  sensor: { hand: 'away', screen: 'error', tone: 'red', lines: ['Sensor', 'problem'] },
  done: { hand: 'leave', screen: 'done', tone: 'green' },
};

const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function FingerScene({ mode = 'wait', secondsLeft = null, totalSeconds = 30, offSeconds = 0, rr, spo2 }) {
  const cfg = MODES[mode] || MODES.wait;
  const handRef = useRef(null);
  const fingerRef = useRef(null);

  // hand + side-view finger position (only the hand moves - everything else is CSS / props)
  useEffect(() => {
    const hand = handRef.current;
    const finger = fingerRef.current;
    const put = (y, x = 0, fx = 0) => {
      hand?.setAttribute('transform', `translate(${(162 + x).toFixed(1)},${y.toFixed(1)})`);
      finger?.setAttribute('transform', `translate(${fx.toFixed(1)},0)`);
    };
    const still = reducedMotion();
    if (cfg.hand === 'rest' || (still && cfg.hand !== 'away' && cfg.hand !== 'leave' && cfg.hand !== 'lift')) {
      put(Y_REST);
      return undefined;
    }
    if (cfg.hand === 'away' || (still && cfg.hand === 'leave')) {
      put(Y_AWAY, 0, -18);
      return undefined;
    }
    if (still && cfg.hand === 'lift') {
      put(Y_REST + 22, 0, -14);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = now - start;
      if (cfg.hand === 'loop') {
        const tl = t % LOOP_MS;
        const p = tl < 500 ? 0 : tl < 2100 ? ease((tl - 500) / 1600) : 1;
        put(Y_AWAY + (Y_REST - Y_AWAY) * p, 0, -18 + 18 * p);
      } else if (cfg.hand === 'jiggle') {
        put(Y_REST + Math.cos(now / 70) * 2, Math.sin(now / 55) * 4, Math.sin(now / 55) * 2);
      } else if (cfg.hand === 'lift') {
        const b = Math.sin(now / 400);
        put(Y_REST + 22 + 3 * b, 0, -14 + 2 * b);
      } else if (cfg.hand === 'leave') {
        const p = 1 - ease(clamp01(t / 1000));
        put(Y_AWAY + (Y_REST - Y_AWAY) * p, 0, -18 + 18 * p);
        if (p <= 0) return; // done - stop the loop
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cfg.hand]);

  const C = 188.5; // circumference of the countdown ring (r = 30)
  const total = Math.max(1, totalSeconds || 30);
  const left = secondsLeft == null ? total : Math.max(0, Math.ceil(secondsLeft));
  const glowOn = cfg.hand === 'rest' || cfg.hand === 'jiggle';

  return (
    <svg className={`k-fscene k-fscene--${cfg.tone} k-fscene--${mode}`} viewBox="0 0 320 210" role="img" aria-label={ARIA[mode]}>
      {/* the console: screen + the three sensors (temperature, FINGER, QR camera) */}
      <rect x="20" y="8" width="194" height="196" rx="10" className="k-fscene__wood" />
      <rect x="32" y="18" width="100" height="176" rx="8" className="k-fscene__bezel" />
      <rect x="37" y="23" width="90" height="166" rx="5" className="k-fscene__screen" />

      {cfg.screen === 'label' && (
        <g className="k-fscene__label">
          <text x="82" y="86" textAnchor="middle">SpO₂</text>
          <text x="82" y="112" textAnchor="middle" className="k-fscene__amp">&amp;</text>
          <text x="82" y="138" textAnchor="middle">RR</text>
        </g>
      )}
      {cfg.screen === 'detected' && (
        <g>
          <circle cx="82" cy="88" r="24" className="k-fscene__okdot" />
          <path d="M71 88 L79 96 L94 80" className="k-fscene__tick" />
          <text x="82" y="134" textAnchor="middle" className="k-fscene__msg">Finger</text>
          <text x="82" y="149" textAnchor="middle" className="k-fscene__msg">detected</text>
          <text x="82" y="170" textAnchor="middle" className="k-fscene__small">Starting…</text>
        </g>
      )}
      {cfg.screen === 'count' && (
        <g>
          <circle cx="82" cy="92" r="30" className="k-fscene__track" />
          <circle
            cx="82"
            cy="92"
            r="30"
            className="k-fscene__arc"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - left / total)}
            transform="rotate(-90 82 92)"
          />
          <text x="82" y="101" textAnchor="middle" className="k-fscene__secs">{left}</text>
          <text x="82" y="140" textAnchor="middle" className="k-fscene__small">seconds left</text>
          <text x="82" y="162" textAnchor="middle" className="k-fscene__msg">
            {mode === 'move' ? 'Keep still!' : 'Keep still'}
          </text>
        </g>
      )}
      {cfg.screen === 'off' && (
        <g>
          <path d="M82 62 L108 108 L56 108 Z" className="k-fscene__warn" />
          <text x="82" y="103" textAnchor="middle" className="k-fscene__bang">!</text>
          <text x="82" y="134" textAnchor="middle" className="k-fscene__msg">Finger</text>
          <text x="82" y="149" textAnchor="middle" className="k-fscene__msg">off sensor</text>
          <text x="82" y="170" textAnchor="middle" className="k-fscene__small">
            off {Math.max(1, Math.ceil(offSeconds || 0))} s
          </text>
        </g>
      )}
      {cfg.screen === 'restart' && (
        <g>
          <path d="M98 76 A22 22 0 1 0 104 96" className="k-fscene__redo" />
          <path d="M92 70 L100 77 L91 82" className="k-fscene__redo" />
          <text x="82" y="134" textAnchor="middle" className="k-fscene__msg">{cfg.lines[0]}</text>
          <text x="82" y="149" textAnchor="middle" className="k-fscene__msg">{cfg.lines[1]}</text>
        </g>
      )}
      {cfg.screen === 'error' && (
        <g>
          <circle cx="82" cy="88" r="24" className="k-fscene__errdot" />
          <text x="82" y="97" textAnchor="middle" className="k-fscene__bang">!</text>
          <text x="82" y="134" textAnchor="middle" className="k-fscene__msg">{cfg.lines[0]}</text>
          <text x="82" y="149" textAnchor="middle" className="k-fscene__msg">{cfg.lines[1]}</text>
        </g>
      )}
      {cfg.screen === 'done' && (
        <g className="k-fscene__done">
          <text x="82" y="48" textAnchor="middle" className="k-fscene__msg">✓ Done</text>
          <text x="82" y="90" textAnchor="middle" className="k-fscene__val">
            {rr ?? '—'}
            <tspan className="k-fscene__unit"> /min</tspan>
          </text>
          <text x="82" y="106" textAnchor="middle" className="k-fscene__small">Breathing</text>
          <line x1="52" y1="118" x2="112" y2="118" className="k-fscene__rule" />
          <text x="82" y="152" textAnchor="middle" className="k-fscene__val">
            {spo2 ?? '—'}
            <tspan className="k-fscene__unit"> %</tspan>
          </text>
          <text x="82" y="168" textAnchor="middle" className="k-fscene__small">Oxygen</text>
        </g>
      )}

      <rect x="148" y="26" width="40" height="34" rx="9" className="k-fscene__otherpad" />
      <rect x="148" y="90" width="40" height="40" rx="9" className="k-fscene__pad" />
      <circle cx="168" cy="110" r="6" className="k-fscene__led" />
      <rect x="148" y="160" width="40" height="34" rx="9" className="k-fscene__otherpad" />

      {/* the hand: back of a right hand, flat, five fingers, index fingertip on the sensor */}
      <g ref={handRef} transform={`translate(162,${Y_AWAY})`} className="k-fscene__hand">
        <line x1="22" y1="80" x2="30" y2="200" className="k-fscene__arm" />
        <line x1="26" y1="120" x2="32" y2="200" className="k-fscene__sleeve" />
        <rect x="-6" y="32" width="54" height="50" rx="16" />
        <rect x="0" y="0" width="11" height="42" rx="5.5" />
        <rect x="13" y="-6" width="11" height="48" rx="5.5" />
        <rect x="26" y="-2" width="11" height="44" rx="5.5" />
        <rect x="38.5" y="8" width="10" height="36" rx="5" />
        <rect x="-24" y="38" width="11" height="34" rx="5.5" transform="rotate(-38 -18 70)" />
        <line x1="11.8" y1="6" x2="11.8" y2="34" className="k-fscene__gap" />
        <line x1="24.8" y1="4" x2="24.8" y2="34" className="k-fscene__gap" />
        <line x1="37.6" y1="10" x2="37.6" y2="36" className="k-fscene__gap" />
      </g>
      {cfg.hand !== 'away' && cfg.hand !== 'leave' && <circle cx="168" cy="110" r="24" className="k-fscene__ring" />}

      {/* side view: the fingertip resting lightly on the sensor, red light under it */}
      <rect x="222" y="8" width="90" height="196" rx="10" className="k-fscene__side" />
      <text x="267" y="26" textAnchor="middle" className="k-fscene__sidetitle">
        Side view
      </text>
      <g transform="translate(284,104) rotate(24)">
        <line x1="0" y1="-62" x2="0" y2="66" className="k-fscene__face" />
        <rect x="-6" y="-8" width="5" height="16" rx="1" className="k-fscene__sidepad" />
        {glowOn && <ellipse cx="-6" cy="0" rx="6" ry="11" className="k-fscene__glow" />}
        <g ref={fingerRef} transform="translate(-18,0)">
          <rect x="-13" y="-10" width="11" height="62" rx="5.5" className="k-fscene__skin" />
        </g>
      </g>
      {(mode === 'wait' || mode === 'again') && (
        <text x="267" y="194" textAnchor="middle" className="k-fscene__hint">
          Rest lightly
        </text>
      )}
    </svg>
  );
}

const ARIA = {
  wait: 'Picture: rest your hand flat on the console with your index fingertip on the finger sensor.',
  detected: 'Picture: finger detected, keep still.',
  measure: 'Picture: keep your hand still while it measures.',
  move: 'Picture: your hand is moving, keep it still.',
  lift: 'Picture: your finger left the sensor, put it back.',
  restartBack: 'Picture: starting again, keep your finger still.',
  again: 'Picture: put your finger back on the sensor to start again.',
  fail: 'Picture: no steady reading.',
  sensor: 'Picture: the finger sensor is not working.',
  done: 'Picture: your breathing rate and oxygen.',
};
