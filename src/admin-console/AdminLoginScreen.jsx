import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { staffLogin, homeFor } from '../services/authService';
import logoFull from '../assets/logo-full.png';
import './AdminLoginScreen.css';

// Decorative strip of half-circles and quarter-circles in the logo's teal tones.
const COLORS = ['#1f8c99', '#1a5660', '#bfe0e5', '#e3f1f3', '#3aa6b3'];
const SHAPES = ['half-up', 'half-down', 'half-left', 'half-right', 'quarter', 'dot'];
const CELL = 64;
function ArtStrip() {
  const cells = [];
  let seed = 7;
  const rnd = (n) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * n); };
  for (let row = 0; row < 11; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      if (rnd(6) === 0) continue;
      cells.push({ row, col, shape: SHAPES[rnd(SHAPES.length)], color: COLORS[rnd(COLORS.length)] });
    }
  }
  const r = CELL / 2 - 4;
  const draw = ({ row, col, shape, color }) => {
    const cx = col * CELL + CELL / 2;
    const cy = row * CELL + CELL / 2;
    const k = `${row}-${col}`;
    const half = {
      'half-up': `M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`,
      'half-down': `M${cx - r} ${cy} A${r} ${r} 0 0 0 ${cx + r} ${cy} Z`,
      'half-left': `M${cx} ${cy - r} A${r} ${r} 0 0 0 ${cx} ${cy + r} Z`,
      'half-right': `M${cx} ${cy - r} A${r} ${r} 0 0 1 ${cx} ${cy + r} Z`,
      quarter: `M${cx - r} ${cy + r} L${cx - r} ${cy - r} A${r * 2} ${r * 2} 0 0 1 ${cx + r} ${cy + r} Z`,
    }[shape];
    return shape === 'dot' ? <circle key={k} cx={cx} cy={cy} r={r * 0.6} fill={color} /> : <path key={k} d={half} fill={color} />;
  };
  return (
    <svg className="mk-login__art" viewBox={`0 0 ${CELL * 3} ${CELL * 11}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {cells.map(draw)}
    </svg>
  );
}

export default function AdminLoginScreen() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Please enter both your email and password.');
      return;
    }
    setLoading(true);
    try {
      const staff = await staffLogin(email, password);
      navigate(staff.mustChangePassword ? '/change-password' : homeFor(staff));
    } catch (err) {
      setError(err.message || 'Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mk-login">
      <div className="mk-login__card">
        <ArtStrip />
        <form className="mk-login__form" onSubmit={handleSubmit}>
          <div className="mk-login__brand">
            <h1 className="mk-login__logo"><img src={logoFull} alt="MediKiosk" /></h1>
            <p className="mk-login__tagline">Welcome to MediKiosk</p>
          </div>

          <label className="mk-login__field">
            <span>Email</span>
            <input type="email" value={email} autoComplete="username" onChange={(e) => setEmail(e.target.value)} />
          </label>

          <label className="mk-login__field">
            <span>Password</span>
            <input type="password" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} />
          </label>

          {error && <p className="mk-login__error" role="alert">{error}</p>}

          <Button type="submit" disabled={loading}>{loading ? 'SIGNING IN…' : 'SIGN IN'}</Button>
        </form>
      </div>
    </div>
  );
}