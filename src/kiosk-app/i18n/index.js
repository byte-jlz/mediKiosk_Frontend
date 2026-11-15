// ============================================================
// Kiosk languages: English, Tagalog (Taglish) and Bisaya.
//
// The English text stays in the code, wrapped in t('...'). tl.js and ceb.js
// map that exact English text to the translation. If a sentence has no
// translation yet, the English is shown (and the dev console lists it).
//
//   t('Start measuring')                 -> 'Simulan ang pagsukat'
//   t('Hi, {name}!', { name: 'Ana' })     -> 'Hi, Ana!'
//
// The language resets to English whenever the kiosk is back on the start
// screen (or the intro video starts), so the next patient starts in English.
// ============================================================
import { useSyncExternalStore } from 'react';
import tl from './tl';
import ceb from './ceb';

export const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'tl', label: 'Tagalog' },
  { code: 'ceb', label: 'Bisaya' },
];

const DICTS = { tl, ceb };
// text that is already translated (t() may be called twice on the same text - that's fine)
const DONE = Object.fromEntries(Object.entries(DICTS).map(([k, d]) => [k, new Set(Object.values(d))]));
const KEY = 'mkKioskLang';
const listeners = new Set();

function load() {
  try {
    const saved = window.sessionStorage.getItem(KEY);
    return LANGUAGES.some((l) => l.code === saved) ? saved : 'en';
  } catch {
    return 'en';
  }
}

let current = load();

export function getLang() {
  return current;
}

export function setLang(code) {
  if (code === current || !LANGUAGES.some((l) => l.code === code)) return;
  current = code;
  try {
    window.sessionStorage.setItem(KEY, code);
  } catch {
    /* private mode - fine */
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Re-renders the screen when the language changes. Call it once in each top-level screen. */
export function useLang() {
  return useSyncExternalStore(subscribe, getLang);
}

const reported = new Set();

/** Translate an English sentence into the current language; {name} parts are filled from vars. */
export function t(text, vars) {
  if (text == null || text === '') return text;
  let out = text;
  if (current !== 'en') {
    const hit = DICTS[current]?.[text];
    if (hit) out = hit;
    else if (DONE[current]?.has(text)) out = text;
    else if (import.meta.env.DEV && !reported.has(current + text)) {
      reported.add(current + text);
      console.warn(`[i18n] no ${current} translation for:`, text);
    }
  }
  if (vars) out = out.replace(/\{(\w+)\}/g, (m, k) => (vars[k] != null ? vars[k] : m));
  return out;
}

/** Date / time in the current language (Tagalog uses Filipino formats; Bisaya too). */
export function localeTag() {
  return current === 'en' ? 'en-US' : 'fil-PH';
}
