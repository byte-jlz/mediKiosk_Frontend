import { useState } from 'react';

// On-screen keyboard for the kiosk touchscreen (there is no physical keyboard).
// Letters with Shift, a ?123 page for numbers + symbols, space, delete, Done.
//   onKey(char)   a character was typed
//   onDelete()    delete the last character
//   onDone()      the Done key (green)

const LETTERS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];
const SYMBOLS = ['1234567890', '@#$_&-+()/', '*"\':;!?=%', '~`|\\<>{}[]^'];

export default function OnScreenKeyboard({ onKey, onDelete, onDone, doneLabel = 'Done' }) {
  const [shift, setShift] = useState(false);
  const [symbols, setSymbols] = useState(false);

  const type = (c) => {
    onKey(shift && !symbols ? c.toUpperCase() : c);
    if (shift) setShift(false); // one capital, like a phone keyboard
  };
  const key = (c, extra = '') => (
    <button key={c} type="button" className={`k-osk__key ${extra}`} onClick={() => type(c)}>
      {shift && !symbols ? c.toUpperCase() : c}
    </button>
  );

  const rows = symbols
    ? [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2], SYMBOLS[3]]
    : ['1234567890', ...LETTERS];

  return (
    <div className="k-osk" role="group" aria-label="On-screen keyboard">
      {rows.map((row, i) => {
        const last = i === rows.length - 1;
        return (
          <div key={row} className={`k-osk__row${!symbols && i === 2 ? ' k-osk__row--inset' : ''}`}>
            {last && !symbols && (
              <button
                type="button"
                className={`k-osk__key k-osk__key--wide k-osk__key--dark${shift ? ' is-on' : ''}`}
                aria-label="Shift"
                aria-pressed={shift}
                onClick={() => setShift((s) => !s)}
              >
                ⇧
              </button>
            )}
            {row.split('').map((c) => key(c))}
            {last && (
              <button type="button" className="k-osk__key k-osk__key--wide k-osk__key--dark" aria-label="Delete" onClick={onDelete}>
                ⌫
              </button>
            )}
          </div>
        );
      })}
      <div className="k-osk__row">
        <button
          type="button"
          className="k-osk__key k-osk__key--wide k-osk__key--dark k-osk__key--small"
          onClick={() => {
            setSymbols((s) => !s);
            setShift(false);
          }}
        >
          {symbols ? 'ABC' : '?123'}
        </button>
        <button type="button" className="k-osk__key k-osk__key--space k-osk__key--small" onClick={() => onKey(' ')}>
          space
        </button>
        <button type="button" className="k-osk__key k-osk__key--small" onClick={() => onKey('.')}>
          .
        </button>
        <button type="button" className="k-osk__key k-osk__key--wide k-osk__key--go k-osk__key--small" onClick={onDone}>
          {doneLabel}
        </button>
      </div>
    </div>
  );
}
