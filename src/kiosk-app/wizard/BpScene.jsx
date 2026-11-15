import { useEffect, useRef } from 'react';
import { t } from '../i18n';

/** A two-line message on the drawn screen, translated as one phrase ('line 1\nline 2'). */
function two(text) {
  const key = Array.isArray(text) ? text.join('\n') : text;
  const [a = '', b = ''] = t(key).split('\n');
  return [a, b];
}

/**
 * The blood pressure picture: the kiosk console (screen + sensors), the shelf on
 * its right with the cuff, the patient's RIGHT arm, and a half-body side view
 * showing the arm resting on the shelf at heart level.
 *
 * The BP monitor itself is hidden inside the kiosk, so the DRAWN KIOSK SCREEN
 * shows what it is doing and the result.
 *
 *   mode       picture                                   drawn screen
 *   wait       loop: 1 wrap the cuff -> 2 close -> 3 rest   BP & HR + steps
 *   starting   arm in the cuff                           Starting monitor…
 *   pumping    cuff swells                               Cuff tightening + seconds
 *   measuring  cuff slowly loosens, heart beats          Measuring + seconds
 *   checking   arm in the cuff                           Getting your result…
 *   done       cuff opens, arm leaves                    SYS / DIA + heart rate
 *   error      arm in the cuff (orange)                  Re-wrap the cuff
 *   fault      no arm (red)                              Monitor not responding
 *
 * Seconds and results come from the agent. "Reduce motion" = still pictures.
 */

const WRAP_MS = 7600;
const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

const TONE = { error: 'orange', fault: 'red', done: 'green' };

export default function BpScene({ mode = 'wait', elapsed = null, systolic, diastolic, pulse }) {
  const r = { arm: useRef(null), cuff: useRef(null), flat: useRef(null), snug: useRef(null), s1: useRef(null), s2: useRef(null), s3: useRef(null) };

  // the arm + the cuff wrapping / unwrapping (everything else is CSS / props)
  useEffect(() => {
    const set = (ref, attr, v) => ref.current?.setAttribute(attr, v);
    const arm = (p) => set(r.arm, 'transform', `translate(0,${(150 * (1 - p)).toFixed(1)})`);
    const show = (wrapped, flat, snug) => {
      set(r.cuff, 'opacity', wrapped.toFixed(2));
      set(r.flat, 'opacity', flat.toFixed(2));
      set(r.snug, 'opacity', snug);
    };
    const step = (n) => [r.s1, r.s2, r.s3].forEach((ref, i) => set(ref, 'opacity', n === 0 || i + 1 === n ? 1 : 0.3));
    const still = reducedMotion();
    if (mode === 'fault') {
      arm(0);
      show(0, 1, 0);
      return undefined;
    }
    if (mode !== 'wait' && mode !== 'done') {
      arm(1);
      show(1, 0, 0);
      return undefined;
    }
    if (still) {
      if (mode === 'wait') {
        arm(1);
        show(1, 0, 1);
        step(0);
      } else {
        arm(0);
        show(0, 1, 0);
      }
      return undefined;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = now - start;
      if (mode === 'done') {
        const p = 1 - ease(clamp01(t / 1000));
        arm(p);
        show(p, 1 - p, 0);
        if (p <= 0) return;
      } else {
        const tl = t % WRAP_MS;
        if (tl < 1800) {
          step(1);
          arm(tl < 300 ? 0 : ease(clamp01((tl - 300) / 1500)));
          show(0, 1, 0);
        } else if (tl < 3600) {
          step(1);
          arm(1);
          const p = ease((tl - 1800) / 1800);
          show(p, 1 - p, 0);
        } else if (tl < 5400) {
          step(2);
          arm(1);
          show(1, 0, tl > 4300 ? 1 : 0);
        } else {
          step(3);
          arm(1);
          show(1, 0, 0);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // refs are stable; only the mode restarts the animation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const secs = elapsed == null ? null : Math.floor(elapsed);
  return (
    <svg className={`k-bpscene k-bpscene--${mode} k-bpscene--${TONE[mode] || 'bp'}`} viewBox="0 0 320 210" role="img" aria-label={ARIA[mode]}>
      {/* the console: screen + temperature / finger / QR sensors */}
      <rect x="10" y="8" width="140" height="196" rx="10" className="k-bpscene__wood" />
      <rect x="20" y="18" width="78" height="176" rx="7" className="k-bpscene__bezel" />
      <rect x="24" y="22" width="70" height="168" rx="5" className="k-bpscene__screen" />
      <rect x="108" y="28" width="32" height="28" rx="8" className="k-bpscene__pad" />
      <rect x="108" y="92" width="32" height="28" rx="8" className="k-bpscene__pad" />
      <rect x="108" y="160" width="32" height="28" rx="8" className="k-bpscene__pad" />

      {mode === 'wait' && (
        <g className="k-bpscene__steps">
          <text x="59" y="46" textAnchor="middle" className="k-bpscene__title">{t('BP & HR')}</text>
          {['Wrap', 'Close', 'Rest'].map((label, i) => (
            <g key={label} ref={[r.s1, r.s2, r.s3][i]}>
              <circle cx="38" cy={78 + 34 * i} r="11" className="k-bpscene__num" />
              <text x="38" y={83 + 34 * i} textAnchor="middle" className="k-bpscene__numtext">{i + 1}</text>
              <text x="56" y={83 + 34 * i} className="k-bpscene__msg">{t(label)}</text>
            </g>
          ))}
        </g>
      )}
      {mode === 'starting' && (
        <g>
          <circle cx="59" cy="88" r="18" className="k-bpscene__track" />
          <path d="M59 70 A18 18 0 0 1 77 88" className="k-bpscene__spin" />
          <text x="59" y="130" textAnchor="middle" className="k-bpscene__msg">{two('Starting\nmonitor…')[0]}</text>
          <text x="59" y="145" textAnchor="middle" className="k-bpscene__msg">{two('Starting\nmonitor…')[1]}</text>
        </g>
      )}
      {mode === 'pumping' && (
        <g>
          <path d="M50 98 L59 86 L68 98 M50 82 L59 70 L68 82" className="k-bpscene__up" />
          <text x="59" y="124" textAnchor="middle" className="k-bpscene__msg">{two('Cuff\ntightening')[0]}</text>
          <text x="59" y="138" textAnchor="middle" className="k-bpscene__msg">{two('Cuff\ntightening')[1]}</text>
          {secs != null && <text x="59" y="165" textAnchor="middle" className="k-bpscene__secs">{secs} s</text>}
        </g>
      )}
      {mode === 'measuring' && (
        <g>
          <path d="M59 102 L45 88 A8 8 0 0 1 59 78 A8 8 0 0 1 73 88 Z" className="k-bpscene__heart" />
          <text x="59" y="124" textAnchor="middle" className="k-bpscene__msg">{t('Measuring')}</text>
          <text x="59" y="138" textAnchor="middle" className="k-bpscene__small">{t('keep still')}</text>
          {secs != null && <text x="59" y="165" textAnchor="middle" className="k-bpscene__secs">{secs} s</text>}
        </g>
      )}
      {mode === 'checking' && (
        <g className="k-bpscene__dots">
          <circle cx="45" cy="88" r="6" />
          <circle cx="59" cy="88" r="6" />
          <circle cx="73" cy="88" r="6" />
          <text x="59" y="124" textAnchor="middle" className="k-bpscene__msg">{two('Getting your\nresult…')[0]}</text>
          <text x="59" y="138" textAnchor="middle" className="k-bpscene__msg">{two('Getting your\nresult…')[1]}</text>
        </g>
      )}
      {mode === 'done' && (
        <g className="k-bpscene__done">
          <text x="59" y="44" textAnchor="middle" className="k-bpscene__ok">{t('✓ Done')}</text>
          <text x="59" y="84" textAnchor="middle" className="k-bpscene__val">{systolic ?? '—'}</text>
          <line x1="40" y1="92" x2="78" y2="92" className="k-bpscene__bar" />
          <text x="59" y="114" textAnchor="middle" className="k-bpscene__val">{diastolic ?? '—'}</text>
          <text x="59" y="128" textAnchor="middle" className="k-bpscene__small">mmHg</text>
          {pulse != null && (
            <>
              <text x="59" y="160" textAnchor="middle" className="k-bpscene__val k-bpscene__val--sm">
                {pulse}
                <tspan className="k-bpscene__unit"> bpm</tspan>
              </text>
              <text x="59" y="174" textAnchor="middle" className="k-bpscene__small">{t('Heart rate')}</text>
            </>
          )}
        </g>
      )}
      {mode === 'error' && (
        <g>
          <path d="M59 66 L81 106 L37 106 Z" className="k-bpscene__warn" />
          <text x="59" y="101" textAnchor="middle" className="k-bpscene__bang">!</text>
          <text x="59" y="130" textAnchor="middle" className="k-bpscene__msg">{two('Re-wrap\nthe cuff')[0]}</text>
          <text x="59" y="145" textAnchor="middle" className="k-bpscene__msg">{two('Re-wrap\nthe cuff')[1]}</text>
        </g>
      )}
      {mode === 'fault' && (
        <g>
          <circle cx="59" cy="86" r="20" className="k-bpscene__err" />
          <text x="59" y="94" textAnchor="middle" className="k-bpscene__bang">!</text>
          <text x="59" y="130" textAnchor="middle" className="k-bpscene__msg">{two('Monitor not\nresponding')[0]}</text>
          <text x="59" y="145" textAnchor="middle" className="k-bpscene__msg">{two('Monitor not\nresponding')[1]}</text>
        </g>
      )}

      {/* the shelf with the cuff (lying open until it's wrapped) */}
      <path d="M150 140 L228 140 L218 158 L150 158 Z" className="k-bpscene__shelf" />
      <rect x="150" y="158" width="68" height="6" className="k-bpscene__shelfedge" />
      <g ref={r.flat} opacity="0">
        <rect x="194" y="128" width="34" height="14" rx="3" className="k-bpscene__cuffcloth" />
        <rect x="222" y="128" width="6" height="14" rx="2" className="k-bpscene__velcro" />
      </g>
      {/* the right arm, palm up (comes up from below) */}
      <g ref={r.arm} transform="translate(0,150)">
        <line x1="187" y1="250" x2="187" y2="106" className="k-bpscene__armline" />
        <line x1="187" y1="250" x2="187" y2="200" className="k-bpscene__sleeve" />
        <ellipse cx="187" cy="94" rx="13" ry="17" className="k-bpscene__palm" />
        <rect x="179" y="70" width="5" height="16" rx="2.5" className="k-bpscene__palm" />
        <rect x="185" y="68" width="5" height="18" rx="2.5" className="k-bpscene__palm" />
        <rect x="191" y="71" width="5" height="16" rx="2.5" className="k-bpscene__palm" />
      </g>
      <g ref={r.cuff} opacity="0" className="k-bpscene__cuff">
        <rect x="171" y="120" width="32" height="30" rx="8" className="k-bpscene__cuffcloth" />
        <rect x="196" y="122" width="8" height="26" rx="3" className="k-bpscene__velcro" />
      </g>
      <g ref={r.snug} opacity="0">
        <circle cx="216" cy="118" r="10" className="k-bpscene__okdot" />
        <path d="M211 118 L215 122 L222 114" className="k-bpscene__tick" />
      </g>
      {mode !== 'done' && mode !== 'fault' && <circle cx="187" cy="135" r="28" className="k-bpscene__ring" />}

      {/* side view: half a body, arm on the shelf at heart level, cuff on the upper arm */}
      <rect x="236" y="8" width="76" height="196" rx="10" className="k-bpscene__side" />
      <text x="274" y="24" textAnchor="middle" className="k-bpscene__sidetitle">{t('Side view')}</text>
      <clipPath id="k-bp-half">
        <rect x="237" y="30" width="74" height="150" />
      </clipPath>
      <g clipPath="url(#k-bp-half)">
        <circle cx="258" cy="62" r="13" className="k-bpscene__skin" />
        <rect x="246" y="78" width="26" height="110" rx="11" className="k-bpscene__body" />
        <path d="M262 88 L280 122 L306 122" className="k-bpscene__sidearm" />
        <rect x="264" y="96" width="13" height="20" rx="4" transform="rotate(-38 270 106)" className="k-bpscene__cuffcloth k-bpscene__sidecuff" />
        <line x1="276" y1="128" x2="312" y2="128" className="k-bpscene__sideshelf" />
        <path d="M258 108 L253 103 A3 3 0 0 1 258 99 A3 3 0 0 1 263 103 Z" className="k-bpscene__sideheart" />
        <line x1="263" y1="106" x2="310" y2="106" className="k-bpscene__level" />
      </g>
      <text x="274" y="196" textAnchor="middle" className="k-bpscene__hint">{t('heart level ✓')}</text>
    </svg>
  );
}

const ARIA = {
  wait: 'Picture: wrap the cuff around your right upper arm, close it, and rest your arm on the shelf at heart level.',
  starting: 'Picture: starting the blood pressure monitor.',
  pumping: 'Picture: the cuff is tightening.',
  measuring: 'Picture: measuring, keep still.',
  checking: 'Picture: getting your result.',
  done: 'Picture: your blood pressure and heart rate.',
  error: 'Picture: re-wrap the cuff.',
  fault: 'Picture: the blood pressure monitor is not responding.',
};
