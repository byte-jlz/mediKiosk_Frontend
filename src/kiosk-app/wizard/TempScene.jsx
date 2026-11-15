import { useEffect, useRef } from 'react';
import { t } from '../i18n';

/** A two-line message on the drawn screen, translated as one phrase ('line 1\nline 2'). */
function two(text) {
  const key = Array.isArray(text) ? text.join('\n') : text;
  const [a = '', b = ''] = t(key).split('\n');
  return [a, b];
}

/**
 * The temperature picture: the kiosk console (screen + the TOP sensor =
 * temperature), the patient's right forearm with the inside of the wrist
 * toward the sensor, and a side view showing the 2-5 cm gap (light stripe =
 * inside of the wrist, infrared waves while measuring).
 *
 * The drawn kiosk screen shows the state and the live / final temperature.
 *
 *   mode          arm                 drawn screen             colour
 *   wait          moves in (loop)     Temp                     orange-brown (step colour)
 *   detected      in place            Wrist detected           green
 *   measure       in place            live °C + 5 s ring       green
 *   wobble        shaking             live °C (Hold still!)    orange
 *   far           pulled back         Move closer              orange
 *   restartBack   in place            Starting again           orange
 *   again         moves in (loop)     Wrist back               orange
 *   low / high / nowrist   away       Too low / Check the sensor area / No wrist detected   orange
 *   limit / sensor         away       No steady reading / Sensor problem                    red
 *   done          moves away          the result               green
 *
 * Every number comes from the agent. "Reduce motion" = still pictures.
 */

const LOOP_MS = 4400;
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

const MODES = {
  wait: { arm: 'loop', screen: 'label', tone: 'temp' },
  detected: { arm: 'in', screen: 'detected', tone: 'green' },
  measure: { arm: 'in', screen: 'live', tone: 'green', waves: true },
  wobble: { arm: 'jiggle', screen: 'live', tone: 'orange', waves: true },
  far: { arm: 'far', screen: 'warn', tone: 'orange', lines: ['Move', 'closer'] },
  restartBack: { arm: 'in', screen: 'restart', tone: 'orange', lines: ['Starting', 'again'] },
  again: { arm: 'loop', screen: 'restart', tone: 'orange', lines: ['Wrist', 'back'] },
  low: { arm: 'away', screen: 'warn', tone: 'orange', lines: ['Too', 'low'] },
  high: { arm: 'away', screen: 'warn', tone: 'orange', lines: ['Check the', 'sensor area'] },
  nowrist: { arm: 'away', screen: 'warn', tone: 'orange', lines: ['No wrist', 'detected'] },
  limit: { arm: 'away', screen: 'error', tone: 'red', lines: ['No steady', 'reading'] },
  sensor: { arm: 'away', screen: 'error', tone: 'red', lines: ['Sensor', 'problem'] },
  done: { arm: 'leave', screen: 'done', tone: 'green' },
};

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export default function TempScene({ mode = 'wait', liveC = null, secondsLeft = null, totalSeconds = 5, value }) {
  const cfg = MODES[mode] || MODES.wait;
  const armRef = useRef(null);
  const wristRef = useRef(null);
  const gapRef = useRef(null);

  useEffect(() => {
    const arm = armRef.current;
    const wrist = wristRef.current;
    const gap = gapRef.current;
    // p = 1: wrist at the sensor, 0: arm out of the picture; e = pulled back a bit
    const put = (p, e = 0, dx = 0) => {
      arm?.setAttribute('transform', `translate(${(150 * (1 - p) + e * 0.6 + dx).toFixed(1)},${(190 * (1 - p) + e).toFixed(1)})`);
      wrist?.setAttribute('transform', `translate(${(-60 + 50 * p - e * 0.9).toFixed(1)},0)`);
    };
    const showGap = (on) => gap?.setAttribute('opacity', on ? 1 : 0);
    const still = reducedMotion();
    if (cfg.arm === 'in' || (still && (cfg.arm === 'loop' || cfg.arm === 'jiggle'))) {
      put(1);
      showGap(cfg.arm === 'loop' || mode === 'detected');
      return undefined;
    }
    if (cfg.arm === 'away' || (still && cfg.arm === 'leave')) {
      put(0);
      showGap(false);
      return undefined;
    }
    if (still && cfg.arm === 'far') {
      put(1, 28);
      showGap(false);
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = now - start;
      if (cfg.arm === 'loop') {
        const tl = t % LOOP_MS;
        const p = tl < 500 ? 0 : tl < 2100 ? ease((tl - 500) / 1600) : 1;
        put(p);
        showGap(tl >= 2100 && tl < 4000);
      } else if (cfg.arm === 'jiggle') {
        put(1, Math.cos(now / 70) * 3, Math.sin(now / 55) * 5);
        showGap(false);
      } else if (cfg.arm === 'far') {
        put(1, 26 + 4 * Math.sin(now / 400));
        showGap(false);
      } else if (cfg.arm === 'leave') {
        const p = 1 - ease(clamp01(t / 1000));
        put(p);
        showGap(false);
        if (p <= 0) return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [cfg.arm, mode]);

  const C = 201; // circumference of the 5 s ring (r = 32)
  const total = Math.max(1, totalSeconds || 5);
  const left = secondsLeft == null ? total : Math.max(0, secondsLeft);
  const fmt = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : Number(v).toFixed(1));

  return (
    <svg className={`k-tscene k-tscene--${cfg.tone} k-tscene--${mode}`} viewBox="0 0 320 210" role="img" aria-label={ARIA[mode]}>
      {/* the console: screen + TEMPERATURE (top) / finger / QR sensors */}
      <rect x="20" y="8" width="194" height="196" rx="10" className="k-tscene__wood" />
      <rect x="32" y="18" width="100" height="176" rx="8" className="k-tscene__bezel" />
      <rect x="37" y="23" width="90" height="166" rx="5" className="k-tscene__screen" />

      {cfg.screen === 'label' && (
        <g>
          <path d="M78 60 L78 112 A12 12 0 1 0 86 112 L86 60 A4 4 0 0 0 78 60 Z" className="k-tscene__therm" />
          <circle cx="82" cy="122" r="7" className="k-tscene__bulb" />
          <line x1="82" y1="80" x2="82" y2="118" className="k-tscene__mercury" />
          <text x="82" y="160" textAnchor="middle" className="k-tscene__label">{t('Temp')}</text>
        </g>
      )}
      {cfg.screen === 'detected' && (
        <g>
          <circle cx="82" cy="88" r="24" className="k-tscene__okdot" />
          <path d="M71 88 L79 96 L94 80" className="k-tscene__tick" />
          <text x="82" y="134" textAnchor="middle" className="k-tscene__msg">{two('Wrist\ndetected')[0]}</text>
          <text x="82" y="149" textAnchor="middle" className="k-tscene__msg">{two('Wrist\ndetected')[1]}</text>
          <text x="82" y="170" textAnchor="middle" className="k-tscene__small">{t('Starting…')}</text>
        </g>
      )}
      {cfg.screen === 'live' && (
        <g>
          <circle cx="82" cy="86" r="32" className="k-tscene__track" />
          <circle
            cx="82"
            cy="86"
            r="32"
            className="k-tscene__arc"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - left / total)}
            transform="rotate(-90 82 86)"
          />
          <text x="82" y="92" textAnchor="middle" className="k-tscene__live">{fmt(liveC)}°</text>
          <text x="82" y="140" textAnchor="middle" className="k-tscene__small">{t('{n} s left', { n: Math.ceil(left) })}</text>
          <text x="82" y="160" textAnchor="middle" className="k-tscene__msg">{mode === 'wobble' ? t('Hold still!') : t('Hold still')}</text>
        </g>
      )}
      {cfg.screen === 'warn' && (
        <g>
          <path d="M82 62 L108 108 L56 108 Z" className="k-tscene__warn" />
          <text x="82" y="103" textAnchor="middle" className="k-tscene__bang">!</text>
          <text x="82" y="134" textAnchor="middle" className="k-tscene__msg">{two(cfg.lines)[0]}</text>
          <text x="82" y="149" textAnchor="middle" className="k-tscene__msg">{two(cfg.lines)[1]}</text>
        </g>
      )}
      {cfg.screen === 'restart' && (
        <g>
          <path d="M98 76 A22 22 0 1 0 104 96" className="k-tscene__redo" />
          <path d="M92 70 L100 77 L91 82" className="k-tscene__redo" />
          <text x="82" y="134" textAnchor="middle" className="k-tscene__msg">{two(cfg.lines)[0]}</text>
          <text x="82" y="149" textAnchor="middle" className="k-tscene__msg">{two(cfg.lines)[1]}</text>
        </g>
      )}
      {cfg.screen === 'error' && (
        <g>
          <circle cx="82" cy="88" r="24" className="k-tscene__errdot" />
          <text x="82" y="97" textAnchor="middle" className="k-tscene__bang">!</text>
          <text x="82" y="134" textAnchor="middle" className="k-tscene__msg">{two(cfg.lines)[0]}</text>
          <text x="82" y="149" textAnchor="middle" className="k-tscene__msg">{two(cfg.lines)[1]}</text>
        </g>
      )}
      {cfg.screen === 'done' && (
        <g>
          <text x="82" y="56" textAnchor="middle" className="k-tscene__ok">{t('✓ Done')}</text>
          <text x="82" y="108" textAnchor="middle" className="k-tscene__val">
            {fmt(value)}
            <tspan className="k-tscene__unit"> °C</tspan>
          </text>
          <text x="82" y="128" textAnchor="middle" className="k-tscene__small">{t('Body temperature')}</text>
        </g>
      )}

      <rect x="148" y="26" width="40" height="36" rx="9" className="k-tscene__pad" />
      <circle cx="168" cy="44" r="6" className="k-tscene__eye" />
      <rect x="148" y="90" width="40" height="40" rx="9" className="k-tscene__otherpad" />
      <rect x="148" y="160" width="40" height="34" rx="9" className="k-tscene__otherpad" />

      {/* the right forearm (back of the wrist toward us = the inside faces the sensor) */}
      <g ref={armRef} transform="translate(150,190)">
        <line x1="168" y1="58" x2="300" y2="250" className="k-tscene__arm" />
        <line x1="250" y1="180" x2="320" y2="280" className="k-tscene__sleeve" />
        <ellipse cx="154" cy="36" rx="15" ry="22" transform="rotate(-34 154 36)" className="k-tscene__hand" />
      </g>
      {cfg.arm !== 'away' && cfg.arm !== 'leave' && <circle cx="168" cy="44" r="24" className="k-tscene__ring" />}

      {/* side view: the inside of the wrist (light stripe) 2-5 cm from the sensor */}
      <rect x="222" y="8" width="90" height="196" rx="10" className="k-tscene__side" />
      <text x="267" y="26" textAnchor="middle" className="k-tscene__sidetitle">{t('Side view')}</text>
      <g transform="translate(288,100) rotate(24)">
        <line x1="0" y1="-62" x2="0" y2="66" className="k-tscene__face" />
        <rect x="-6" y="-7" width="5" height="14" rx="1" className="k-tscene__sidesensor" />
        {cfg.waves && (
          <g className="k-tscene__waves">
            <path d="M-9 -6 Q-12 0 -9 6" />
            <path d="M-14 -9 Q-18 0 -14 9" />
            <path d="M-19 -12 Q-24 0 -19 12" />
          </g>
        )}
        <g ref={wristRef} transform="translate(-60,0)">
          <rect x="-20" y="-16" width="20" height="32" rx="9" className="k-tscene__skin" />
          <line x1="-1.5" y1="-11" x2="-1.5" y2="11" className="k-tscene__inside" />
        </g>
        <g ref={gapRef} opacity="0" className="k-tscene__gap">
          <path d="M-26 22 L-26 27 L-4 27 L-4 22" />
        </g>
      </g>
      {(mode === 'wait' || mode === 'again' || mode === 'detected') && (
        <text x="267" y="168" textAnchor="middle" className="k-tscene__hint">2–5 cm ✓</text>
      )}
      <text x="267" y="190" textAnchor="middle" className="k-tscene__inlabel">{t('inside of wrist')}</text>
    </svg>
  );
}

const ARIA = {
  wait: 'Picture: hold the inside of your right wrist 2 to 5 cm in front of the top sensor.',
  detected: 'Picture: wrist detected, hold still.',
  measure: 'Picture: measuring your temperature, hold still.',
  wobble: 'Picture: your wrist is moving, hold it still.',
  far: 'Picture: your wrist moved away, bring it closer.',
  restartBack: 'Picture: starting again, hold your wrist still.',
  again: 'Picture: hold your wrist in front of the sensor again.',
  low: 'Picture: the reading was too low.',
  high: 'Picture: the reading does not look right.',
  nowrist: 'Picture: no wrist was detected.',
  limit: 'Picture: no steady reading.',
  sensor: 'Picture: the temperature sensor is not working.',
  done: 'Picture: your body temperature.',
};
