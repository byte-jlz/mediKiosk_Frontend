import { useState } from 'react';
import BmiScene from '../kiosk-app/wizard/BmiScene';
import FingerScene from '../kiosk-app/wizard/FingerScene';
import BpScene from '../kiosk-app/wizard/BpScene';
import TempScene from '../kiosk-app/wizard/TempScene';
import logo from '../assets/medikiosk-logo.png';

import { T } from './timeline';

const ADVISER = {
  img: 'calo', name: 'Mr. Al-Monte Vince M. Calo, DIT', role: 'Capstone Adviser',
  desc: 'Guided and mentored the team throughout the project.',
};
// ms = how long each person stays on screen (Julz and Joana a little longer)
const MEMBERS = [
  { img: 'plaza', name: 'Julz Christian J. Plaza', role: 'System Analyst', ms: 4500,
    desc: 'Designed the overall system and brought it together: the sensors, the Raspberry Pi kiosk software, and the link to the clinic app.' },
  { img: 'pailanan', name: 'Joana Mae B. Pailanan', role: 'Back-End Developer', ms: 4500,
    desc: 'Trained the machine-learning model, built the database, deployed the system, and designed the front end.' },
  { img: 'odchigue', name: 'Althea Shane M. Odchigue', role: 'Front-End Developer', ms: 3500,
    desc: 'Developed the front-end interfaces and led the data gathering.' },
  { img: 'canoy', name: 'Jan Michael Leo A. Canoy Jr', role: 'Database Administrator', ms: 3500,
    desc: 'Managed the database and helped build the kiosk hardware.' },
  { img: 'ronquillo', name: 'James Vern V. Ronquillo', role: 'Technical Writer', ms: 3500,
    desc: 'Wrote the project documentation, helped build the hardware, and gathered data.' },
];
const SCHOOL = 'University of Science and Technology of Southern Philippines';
const DEPT = 'College of Information Technology and Computing';

const C = {
  primary: '#17727f', heading: '#1b5560', text: '#2b3d44', muted: '#566a72', line: '#d6e5e9', tint: '#e6f2f4', page: '#f3f8f9',
  bmi: ['#2f6aa8', '#e8f0f9', '#1f4f80'],
  breath: ['#17727f', '#e6f2f4', '#1b5560'],
  bp: ['#b3365b', '#fbe9ef', '#7f2341'],
  temp: ['#b45309', '#fdf0e2', '#7a3a08'],
};

/* ---------- small helpers ---------- */
const clamp = (v) => Math.max(0, Math.min(1, v));
const easeOut = (p) => 1 - Math.pow(1 - clamp(p), 3);
const easeIO = (p) => { p = clamp(p); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const prog = (t, a, b) => clamp((t - a) / (b - a));
/** opacity for something shown from a to b with fade in / out */
const vis = (t, a, b, fin = 400, fout = 400) => Math.min(clamp((t - a) / fin), clamp((b - t) / fout));
const lerp = (a, b, p) => a + (b - a) * p;
// team photos live next to this file, so they're only bundled into the render page, not the kiosk app
const PHOTOS = import.meta.glob('./team/*.png', { eager: true, import: 'default' });
const img = (k) => PHOTOS[`./team/${k}.png`];

const abs = (style) => ({ position: 'absolute', left: 0, right: 0, textAlign: 'center', ...style });

/* ---------- pieces ---------- */
function Photo({ k, size, ring = C.primary, zoom = 1 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', margin: '0 auto', padding: Math.round(size * 0.025), background: '#fff', boxShadow: `0 0 0 ${Math.max(3, Math.round(size * 0.014))}px ${ring}` }}>
      <div style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden' }}>
        <img src={img(k)} alt="" style={{ width: '100%', height: '100%', transform: `scale(${zoom})`, display: 'block' }} />
      </div>
    </div>
  );
}

function Pill({ children, color = C.primary, bg = C.tint, size = 34 }) {
  return (
    <span style={{ display: 'inline-block', padding: `${size * 0.35}px ${size * 0.9}px`, borderRadius: 999, background: bg, color, font: `600 ${size}px var(--k-font)` }}>
      {children}
    </span>
  );
}

function Heading({ t, a, b, title, sub }) {
  const o = vis(t, a, b, 450, 450);
  if (o <= 0) return null;
  return (
    <div style={abs({ top: 190, opacity: o, transform: `translateY(${(1 - easeOut(prog(t, a, a + 500))) * 30}px)` })}>
      <div style={{ font: '700 76px var(--k-font)', color: C.heading, letterSpacing: '-0.5px' }}>{title}</div>
      {sub && <div style={{ font: '400 36px var(--k-font)', color: C.muted, marginTop: 14 }}>{sub}</div>}
    </div>
  );
}

/* ---------- segments ---------- */
function Intro({ t, a, b, end = false }) {
  const o = vis(t, a, b, end ? 500 : 1, 450);
  if (o <= 0) return null;
  const p = easeOut(prog(t, a, a + 900));
  const p2 = easeOut(prog(t, a + 700, a + 1400));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={abs({ top: 640, transform: `scale(${lerp(0.88, 1, p)})`, opacity: end ? 1 : Math.max(0.001, p) })}>
        <img src={logo} alt="" style={{ width: 800 }} />
      </div>
      <div style={abs({ top: 960, opacity: p2, transform: `translateY(${(1 - p2) * 30}px)` })}>
        <div style={{ font: '700 64px var(--k-font)', color: C.heading, lineHeight: 1.2 }}>
          {end ? 'Ready when you are' : 'Check your vital signs'}
          <br />
          {end ? 'Touch the screen to begin' : 'in just a few minutes'}
        </div>
        {!end && (
          <div style={{ font: '400 32px var(--k-font)', color: C.muted, marginTop: 34, lineHeight: 1.45 }}>
            A capstone project of
            <br />
            <b style={{ color: C.text }}>{DEPT}</b>
            <br />
            USTP
          </div>
        )}
      </div>
    </div>
  );
}

function Adviser({ t, a, b }) {
  const o = vis(t, a, b, 450, 400);
  if (o <= 0) return null;
  const p = easeOut(prog(t, a, a + 800));
  const p2 = easeOut(prog(t, a + 400, a + 1100));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={abs({ top: 440, transform: `scale(${lerp(0.85, 1, p)})` })}>
        <Photo k={ADVISER.img} size={500} zoom={lerp(1, 1.06, prog(t, a, b))} />
      </div>
      <div style={abs({ top: 1030, opacity: p2, transform: `translateY(${(1 - p2) * 24}px)` })}>
        <Pill size={36}>{ADVISER.role}</Pill>
        <div style={{ font: '700 56px var(--k-font)', color: C.heading, marginTop: 34 }}>{ADVISER.name}</div>
        <div style={{ font: '400 38px/1.45 var(--k-font)', color: C.text, marginTop: 40, padding: '0 110px' }}>{ADVISER.desc}</div>
      </div>
    </div>
  );
}

function Members({ t, a, b }) {
  if (t < a - 1 || t > b + 400) return null;
  let s = a, i = 0;
  while (i < MEMBERS.length - 1 && t >= s + MEMBERS[i].ms) { s += MEMBERS[i].ms; i += 1; }
  const each = MEMBERS[i].ms;
  const first = i === 0;
  const last = i === MEMBERS.length - 1;
  const pin = easeOut(prog(t, s, s + 450));
  const pout = easeIO(prog(t, s + each - 320, s + each));
  const x = (first ? 0 : (1 - pin) * 160) - (last ? 0 : pout * 160);
  const o = Math.min(first ? clamp((t - s - 200) / 450) : pin, last ? vis(t, a, b, 1, 350) : 1 - pout);
  const m = MEMBERS[i];
  const pt = easeOut(prog(t, s + 200, s + 650));
  const pd = easeOut(prog(t, s + 500, s + 1000));
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div style={{ position: 'absolute', inset: 0, opacity: o, transform: `translateX(${x}px)` }}>
        <div style={abs({ top: 440 })}>
          <Photo k={m.img} size={460} zoom={lerp(1, 1.05, prog(t, s, s + each))} />
        </div>
        <div style={abs({ top: 990, opacity: pt })}>
          <Pill size={36}>{m.role}</Pill>
          <div style={{ font: '700 60px var(--k-font)', color: C.heading, marginTop: 30 }}>{m.name}</div>
        </div>
        <div style={abs({ top: 1210, left: 110, right: 110, opacity: pd, font: '400 38px/1.45 var(--k-font)', color: C.text })}>{m.desc}</div>
      </div>
      <div style={abs({ top: 1520, display: 'flex', justifyContent: 'center', gap: 20, opacity: vis(t, a, b, 300, 350) })}>
        {MEMBERS.map((_, k) => (
          <span key={k} style={{ width: k === i ? 48 : 16, height: 16, borderRadius: 8, background: k === i ? C.primary : C.line }} />
        ))}
      </div>
    </div>
  );
}

function Group({ t, a, b }) {
  const o = vis(t, a, b, 350, 450);
  if (o <= 0) return null;
  const pop = (k) => easeOut(prog(t, a + 100 + k * 90, a + 550 + k * 90));
  const card = (p, k, size, nameSize) => (
    <div key={p.img} style={{ width: k === 0 ? 640 : 330, textAlign: 'center', opacity: pop(k), transform: `scale(${lerp(0.7, 1, pop(k))})` }}>
      <Photo k={p.img} size={size} />
      <div style={{ font: `600 ${nameSize}px var(--k-font)`, color: C.heading, marginTop: 20, lineHeight: 1.2 }}>{p.name}</div>
      <div style={{ font: `400 ${nameSize - 4}px var(--k-font)`, color: C.muted, marginTop: 6 }}>{p.role}</div>
    </div>
  );
  const pt = easeOut(prog(t, a + 800, a + 1300));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={{ position: 'absolute', top: 400, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>{card(ADVISER, 0, 240, 28)}</div>
      <div style={{ position: 'absolute', top: 750, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 40 }}>
        {MEMBERS.slice(0, 2).map((m, k) => card(m, k + 1, 210, 27))}
      </div>
      <div style={{ position: 'absolute', top: 1080, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 10 }}>
        {MEMBERS.slice(2).map((m, k) => card(m, k + 3, 200, 27))}
      </div>
      <div style={abs({ top: 1470, opacity: pt, font: '400 32px var(--k-font)', color: C.muted, lineHeight: 1.45 })}>
        <b style={{ color: C.text }}>{DEPT}</b>
        <br />
        {SCHOOL}
      </div>
    </div>
  );
}

const SENSORS = [
  {
    key: 'bmi', title: 'Height, weight and BMI', sensor: 'Load-cell scale and VL53L0X height sensor',
    scene: (p) => {
      if (p < 0.45) return <BmiScene mode="weigh" kg={62.4 * easeOut(p / 0.4)} />;
      if (p < 0.75) return <BmiScene mode="height" weight={62.4} heightCm={165 * easeOut((p - 0.45) / 0.25)} />;
      return <BmiScene mode="done" weight={62.4} heightCm={165} bmi={22.9} />;
    },
  },
  {
    key: 'breath', title: 'Oxygen level and breathing rate', sensor: 'MAX30102 pulse oximeter sensor',
    scene: (p) => (p < 0.68 ? <FingerScene mode="measure" secondsLeft={Math.max(1, Math.ceil(30 - (p / 0.68) * 29))} totalSeconds={30} /> : <FingerScene mode="done" spo2={98} rr={16} />),
  },
  {
    key: 'bp', title: 'Blood pressure and heart rate', sensor: 'Automatic upper-arm blood pressure monitor',
    scene: (p) => (p < 0.35 ? <BpScene mode="pumping" /> : p < 0.68 ? <BpScene mode="measuring" /> : <BpScene mode="done" systolic={118} diastolic={76} pulse={72} />),
  },
  {
    key: 'temp', title: 'Body temperature', sensor: 'MLX90614 infrared thermometer, no contact',
    scene: (p) => (p < 0.68 ? <TempScene mode="measure" liveC={lerp(36.1, 36.5, p / 0.68)} secondsLeft={Math.max(1, Math.ceil(5 - (p / 0.68) * 4))} totalSeconds={5} /> : <TempScene mode="done" value={36.5} />),
  },
];

function Sensors({ t, a, b }) {
  if (t < a || t > b) return null;
  const each = (b - a) / SENSORS.length;
  const i = Math.min(SENSORS.length - 1, Math.floor((t - a) / each));
  const s = a + i * each;
  const S = SENSORS[i];
  const [accent, tint, ink] = C[S.key];
  const first = i === 0;
  const last = i === SENSORS.length - 1;
  const pin = easeOut(prog(t, s, s + 450));
  const pout = easeIO(prog(t, s + each - 320, s + each));
  const x = (first ? 0 : (1 - pin) * 200) - (last ? 0 : pout * 200);
  const o = Math.min(first ? clamp((t - s) / 400) : pin, last ? vis(t, a, b, 1, 400) : 1 - pout);
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o, transform: `translateX(${x}px)` }}>
      <div style={{ position: 'absolute', top: 420, left: 70, right: 70, paddingBottom: 60, borderRadius: 48, background: tint, border: `5px solid ${accent}`, textAlign: 'center' }}>
        <div style={{ marginTop: 50 }}>
          <Pill color="#fff" bg={accent} size={32}>{`${i + 1} of 4`}</Pill>
        </div>
        <div style={{ font: '700 58px var(--k-font)', color: ink, marginTop: 28 }}>{S.title}</div>
        <div className="am-scene" style={{ width: 800, margin: '30px auto 0', background: '#fff', borderRadius: 32, padding: '24px 20px' }}>
          {S.scene(prog(t, s, s + each - 250))}
        </div>
        <div style={{ font: '500 34px var(--k-font)', color: ink, marginTop: 34 }}>
          <span style={{ display: 'inline-block', width: 18, height: 18, borderRadius: 4, background: accent, marginRight: 14, verticalAlign: 2 }} />
          {S.sensor}
        </div>
      </div>
    </div>
  );
}

function QrIcon({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="96" height="96">
      <rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke={c} strokeWidth="4" />
      <rect x="28" y="4" width="16" height="16" rx="2" fill="none" stroke={c} strokeWidth="4" />
      <rect x="4" y="28" width="16" height="16" rx="2" fill="none" stroke={c} strokeWidth="4" />
      <rect x="10" y="10" width="4" height="4" fill={c} /><rect x="34" y="10" width="4" height="4" fill={c} /><rect x="10" y="34" width="4" height="4" fill={c} />
      <rect x="28" y="28" width="6" height="6" fill={c} /><rect x="38" y="38" width="6" height="6" fill={c} /><rect x="38" y="28" width="6" height="6" fill={c} /><rect x="28" y="38" width="6" height="6" fill={c} />
    </svg>
  );
}
function FourIcon() {
  return (
    <svg viewBox="0 0 48 48" width="96" height="96">
      <rect x="4" y="4" width="18" height="18" rx="5" fill={C.bmi[0]} /><rect x="26" y="4" width="18" height="18" rx="5" fill={C.breath[0]} />
      <rect x="4" y="26" width="18" height="18" rx="5" fill={C.bp[0]} /><rect x="26" y="26" width="18" height="18" rx="5" fill={C.temp[0]} />
    </svg>
  );
}
function ResultIcon({ c }) {
  return (
    <svg viewBox="0 0 48 48" width="96" height="96" fill="none" stroke={c} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
      <rect x="8" y="4" width="32" height="40" rx="4" />
      <path d="M16 18 l4 4 l8 -8" /><path d="M16 32 h16" />
    </svg>
  );
}

const HOW = [
  { icon: <QrIcon c={C.primary} />, title: 'Scan your QR code', sub: 'Or continue as a guest' },
  { icon: <FourIcon />, title: 'Take 4 quick readings', sub: 'The screen shows you what to do' },
  { icon: <ResultIcon c={C.primary} />, title: 'See your results', sub: 'Shown right here on the screen' },
];

function How({ t, a, b }) {
  const o = vis(t, a, b, 1, 450);
  if (o <= 0) return null;
  const step = (b - a - 1600) / HOW.length;
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      {HOW.map((h, k) => {
        const s = a + 300 + k * step;
        const p = easeOut(prog(t, s, s + 500));
        const active = t >= s && (k === HOW.length - 1 || t < s + step);
        return (
          <div key={k} style={{ position: 'absolute', top: 470 + k * 380, left: 90, right: 90, height: 320, display: 'flex', alignItems: 'center', gap: 44, padding: '0 56px', borderRadius: 40, background: active ? '#fff' : 'transparent', boxShadow: active ? `0 0 0 4px ${C.primary}` : `0 0 0 3px ${C.line}`, opacity: Math.max(0.001, p), transform: `translateY(${(1 - p) * 40}px)` }}>
            <div style={{ width: 90, height: 90, flex: 'none', borderRadius: '50%', background: active ? C.primary : C.line, color: active ? '#fff' : C.muted, font: '700 48px var(--k-font)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{k + 1}</div>
            <div style={{ flex: 'none' }}>{h.icon}</div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ font: '700 50px var(--k-font)', color: C.heading }}>{h.title}</div>
              <div style={{ font: '400 34px var(--k-font)', color: C.muted, marginTop: 10 }}>{h.sub}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Privacy({ t, a, b }) {
  const o = vis(t, a, b, 400, 400);
  if (o <= 0) return null;
  const p = easeOut(prog(t, a, a + 600));
  return (
    <div style={{ position: 'absolute', inset: 0, opacity: o }}>
      <div style={abs({ top: 620, transform: `scale(${lerp(0.8, 1, p)})` })}>
        <svg viewBox="0 0 48 48" width="300" height="300" fill="none" stroke={C.primary} strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round">
          <path d="M24 4 L40 10 V22 C40 33 33 40 24 44 C15 40 8 33 8 22 V10 Z" fill={C.tint} />
          <path d="M17 24 l5 5 l10 -10" strokeWidth="3.4" />
        </svg>
      </div>
      <div style={abs({ top: 1000 })}>
        <div style={{ font: '700 66px var(--k-font)', color: C.heading }}>Your privacy matters</div>
        <div style={{ font: '400 40px var(--k-font)', color: C.muted, marginTop: 26, lineHeight: 1.4 }}>
          Guest readings are deleted
          <br />
          as soon as you finish.
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 130, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 70px', font: '600 32px var(--k-font)', color: C.muted, borderBottom: `2px solid ${C.line}` }}>
      <span>Sun, Nov 15, 2026</span>
      <span>2:51 PM</span>
    </div>
  );
}

function TouchHint({ t }) {
  const pulse = 1 + 0.035 * Math.sin((t / 1600) * Math.PI * 2);
  return (
    <div style={abs({ top: 1740 })}>
      <span style={{ display: 'inline-block', transform: `scale(${pulse})`, padding: '26px 64px', borderRadius: 999, background: C.primary, color: '#fff', font: '700 44px var(--k-font)' }}>
        Touch anywhere to start
      </span>
    </div>
  );
}

export default function Movie({ overlay }) {
  const [t, setT] = useState(0);
  window.__setT = setT;
  return (
    <div style={{ position: 'relative', width: 1080, height: 1920, overflow: 'hidden', background: C.page, fontFamily: 'var(--k-font)' }}>
      <style>{'.am-scene svg{width:100%!important;height:auto!important;max-height:none!important;max-width:none!important;display:block;margin:0 auto}'}</style>
      <div style={{ position: 'absolute', width: 1300, height: 1300, borderRadius: '50%', background: '#e3f0f2', left: -620, top: -420 }} />
      <div style={{ position: 'absolute', width: 1100, height: 1100, borderRadius: '50%', background: '#e8f2f4', right: -560, bottom: -380 }} />

      <Intro t={t} a={T.intro[0]} b={T.intro[1]} />
      <Heading t={t} a={T.members[0]} b={T.group[1]} title="Meet the team" sub="The people behind MediKiosk" />
      <Adviser t={t} a={T.adviser[0]} b={T.adviser[1]} />
      <Members t={t} a={T.members[0]} b={T.members[1]} />
      <Group t={t} a={T.group[0]} b={T.group[1]} />
      <Heading t={t} a={T.sensors[0]} b={T.sensors[1]} title="What MediKiosk measures" />
      <Sensors t={t} a={T.sensors[0]} b={T.sensors[1]} />
      <Heading t={t} a={T.how[0]} b={T.how[1]} title="How it works" />
      <How t={t} a={T.how[0]} b={T.how[1]} />
      <Privacy t={t} a={T.privacy[0]} b={T.privacy[1]} />
      <Intro t={t} a={T.outro[0]} b={T.outro[1] + 1000} end />

      {overlay && <TopBar />}
      {overlay && <TouchHint t={t} />}
    </div>
  );
}
