import { useEffect, useRef } from 'react';

/**
 * The BMI picture: the real kiosk (side view, drawn from the photo) with a
 * person, plus the Height / Weight result cards in the empty space beside them.
 *
 *   mode 'stepOff'  loop: the person walks OFF the platform (safety re-zero only)
 *   mode 'stepOn'   loop: the person walks back ONTO the platform
 *   mode 'weigh'    standing still, platform pulses, Weight card counts live
 *   mode 'height'   standing still, beam from the overhead sensor, Height card counts live
 *   mode 'done'     both cards done + the BMI line
 *
 * Numbers come from the agent (live kg / cm) - nothing here is made up.
 * The walking loops respect "reduce motion" (then the person just stands
 * where they should end up).
 */

const ON = 198; // x of the person standing on the platform
const OFF = 72; // x of the person standing next to it
const WALK_MS = 1400;
const LOOP = {
  stepOff: 3600, // stand 700 -> walk 1400 -> wait / flash 1500
  stepOn: 3600, // stand 700 -> walk 1400 -> wait 1500
};

const ease = (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2);
const baseY = (x) => (x >= 158 ? 222 : x <= 142 ? 230 : 230 - 8 * ((x - 142) / 16)); // step up onto the platform

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

/** Puts the person at x (walking = legs swing + a small bob). */
function placePerson(refs, x, walkP = 0, walking = false) {
  let y = baseY(x);
  let ang = 0;
  if (walking) {
    y -= Math.abs(Math.sin(walkP * Math.PI * 5)) * 4;
    ang = Math.sin(walkP * Math.PI * 5) * 16;
  }
  refs.person.current?.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`);
  refs.legL.current?.setAttribute('transform', `rotate(${ang.toFixed(1)} 0 -62)`);
  refs.legR.current?.setAttribute('transform', `rotate(${(-ang).toFixed(1)} 0 -62)`);
}

export default function BmiScene({ mode, kg = null, weight = null, heightCm = null, bmi = null, zeroed = false }) {
  const refs = {
    person: useRef(null),
    legL: useRef(null),
    legR: useRef(null),
    arrowOff: useRef(null),
    arrowOn: useRef(null),
    frame: useRef(null),
  };

  // The two walking loops (only while the agent waits for the person).
  useEffect(() => {
    const walkingMode = mode === 'stepOff' || mode === 'stepOn';
    const show = (el, v) => el.current?.setAttribute('opacity', v);
    if (!walkingMode) {
      placePerson(refs, ON);
      show(refs.arrowOff, 0);
      show(refs.arrowOn, 0);
      return undefined;
    }
    const off = mode === 'stepOff';
    const from = off ? ON : OFF;
    const to = off ? OFF : ON;
    const arrow = off ? refs.arrowOff : refs.arrowOn;
    show(off ? refs.arrowOn : refs.arrowOff, 0);
    if (reducedMotion()) {
      placePerson(refs, to);
      show(arrow, 1);
      return undefined;
    }
    const frameEl = refs.frame.current;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const t = (now - start) % LOOP[mode];
      let frameOn = false;
      if (t < 700) {
        placePerson(refs, from);
        show(arrow, Math.sin(t / 120) > 0 ? 1 : 0.3);
      } else if (t < 700 + WALK_MS) {
        const p = (t - 700) / WALK_MS;
        placePerson(refs, from + (to - from) * ease(p), p, true);
        show(arrow, 0);
      } else {
        placePerson(refs, to);
        show(arrow, 0);
        frameOn = off && Math.floor((t - 700 - WALK_MS) / 150) % 2 === 0; // "the platform is empty"
      }
      frameEl?.classList.toggle('is-flash', frameOn);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      frameEl?.classList.remove('is-flash');
    };
    // refs are stable; only the mode restarts the loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const walking = mode === 'stepOff' || mode === 'stepOn';
  const heightState = mode === 'height' ? 'active' : mode === 'done' ? 'done' : 'pending';
  const weightState = mode === 'weigh' ? 'active' : mode === 'height' || mode === 'done' ? 'done' : 'pending';
  const fmtKg = (v) =>
    v == null || Number.isNaN(Number(v)) ? '—' : Math.abs(Number(v)) < 0.05 ? '0.0' : Number(v).toFixed(1);
  const weightShown = weightState === 'active' ? fmtKg(kg) : fmtKg(weight);
  const heightShown =
    heightCm == null || Number.isNaN(Number(heightCm))
      ? '—'
      : heightState === 'active'
        ? String(Math.round(Number(heightCm)))
        : String(heightCm);

  // the small pill under the platform: only in the step off / step on loops
  let pill = null;
  if (walking) {
    if (mode === 'stepOn' && zeroed && (kg == null || Math.abs(kg) < 1)) pill = { text: '0.0 kg ✓', ok: true };
    else if (kg != null) pill = { text: `${fmtKg(kg)} kg`, ok: false };
  }

  return (
    <svg className={`k-scene k-scene--${mode}`} viewBox="0 0 320 270" role="img" aria-label={ARIA[mode]}>
      {/* the kiosk */}
      <line x1="8" y1="230" x2="312" y2="230" className="k-scene__floor" />
      <rect x="282" y="24" width="9" height="206" className="k-scene__post" />
      <rect x="181" y="22" width="110" height="8" className="k-scene__arm" />
      <rect x="189" y="30" width="18" height="9" rx="2" className="k-scene__sensor" />
      <line x1="198" y1="41" x2="198" y2="70" className="k-scene__beam" />
      <path d="M246 230 L246 128 L272 128 L272 230 Z" className="k-scene__column" />
      <path d="M250 150 q8 10 4 24 M262 190 q-6 8 2 18" className="k-scene__marble" />
      <g transform="translate(0,-28) rotate(-65 261 121)">
        <rect x="222" y="116" width="78" height="10" rx="2" className="k-scene__wood" />
        <rect x="230" y="113" width="32" height="4" rx="1" className="k-scene__bezel" />
        <rect x="232" y="112" width="28" height="3" className="k-scene__screen" />
        <rect x="270" y="113" width="5" height="3" className="k-scene__dot" />
        <rect x="281" y="113" width="5" height="3" className="k-scene__dot" />
      </g>
      <rect ref={refs.frame} x="150" y="222" width="96" height="8" rx="2" className="k-scene__frame" />
      <rect x="153" y="222" width="90" height="5" rx="1" className="k-scene__wood" />

      {/* result cards (hidden while the person needs that space to step off / on) */}
      {!walking && (
        <g className="k-scene__cards">
          <path d="M154 76 L170 76 L170 34 L189 34" className={`k-scene__link is-${heightState}`} />
          <path d="M154 154 L162 154 L162 220" className={`k-scene__link is-${weightState}`} />
          <ResultCard y={44} label="Height" unit="cm" state={heightState} value={heightShown} />
          <ResultCard y={122} label="Weight" unit="kg" state={weightState} value={weightShown} />
          {mode === 'done' && bmi != null && (
            <g className="k-scene__bmi">
              <rect x="14" y="196" width="140" height="28" rx="14" />
              <text x="84" y="215" textAnchor="middle">
                BMI {bmi} kg/m²
              </text>
            </g>
          )}
        </g>
      )}

      <g ref={refs.arrowOff} opacity="0" className="k-scene__arrow">
        <path d="M146 150 L118 150 M126 141 L117 150 L126 159" />
      </g>
      <g ref={refs.arrowOn} opacity="0" className="k-scene__arrow">
        <path d="M198 172 L198 206 M189 197 L198 207 L207 197" />
      </g>

      {/* the person */}
      <g ref={refs.person} transform={`translate(${ON},222)`}>
        <g ref={refs.legL}>
          <rect x="-14" y="-62" width="11" height="62" rx="5" className="k-scene__skin" />
        </g>
        <g ref={refs.legR}>
          <rect x="3" y="-62" width="11" height="62" rx="5" className="k-scene__skin" />
        </g>
        <rect x="-19" y="-128" width="38" height="72" rx="15" className="k-scene__body" />
        <circle cx="0" cy="-146" r="15" className="k-scene__skin" />
      </g>

      {pill && (
        <g className={`k-scene__pill${pill.ok ? ' is-ok' : ''}`}>
          <rect x="143" y="238" width="110" height="26" rx="13" />
          <text x="198" y="256" textAnchor="middle">
            {pill.text}
          </text>
        </g>
      )}
    </svg>
  );
}

const STATUS = { pending: 'next', active: 'measuring…', done: '✓ done' };

function ResultCard({ y, label, unit, state, value }) {
  return (
    <g className={`k-scene__card is-${state}`}>
      <rect x="14" y={y} width="140" height="66" rx="10" />
      <text x="26" y={y + 20} className="k-scene__card-label">
        {label}
      </text>
      <text x="142" y={y + 20} textAnchor="end" className="k-scene__card-status">
        {state === 'active' && value === '—' ? 'starting…' : STATUS[state]}
      </text>
      <text x="26" y={y + 54} className="k-scene__card-value">
        {value}
        <tspan className="k-scene__card-unit"> {unit}</tspan>
      </text>
    </g>
  );
}

const ARIA = {
  stepOff: 'Picture: step off the platform so the scale can zero.',
  stepOn: 'Picture: step onto the middle of the platform.',
  weigh: 'Picture: stand still on the platform while you are weighed.',
  height: 'Picture: stand up straight under the height sensor.',
  done: 'Picture: your height, weight and BMI.',
};
