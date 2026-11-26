import { useState } from 'react';
import Icon from './Icon';
import './PasswordInput.css';

/** A password box with an eye button that switches between dots and the real text. Takes the same props as <input>. */
export default function PasswordInput({ className = '', ...props }) {
  const [show, setShow] = useState(false);
  return (
    <span className="mk-pw">
      <input {...props} type={show ? 'text' : 'password'} className={`mk-pw__input ${className}`.trim()} />
      <button
        type="button"
        className="mk-pw__eye"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        title={show ? 'Hide password' : 'Show password'}
      >
        <Icon name={show ? 'eye-off' : 'eye'} size={18} />
      </button>
    </span>
  );
}
