import { useEffect, useState } from 'react';

import { localeTag } from './i18n';

/** "Sun, Nov 15, 2026" - in the kiosk's current language. */
export function formatDate(d) {
  return new Intl.DateTimeFormat(localeTag(), { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(d);
}

/** "2:51 PM" - in the kiosk's current language. */
export function formatTime(d) {
  return new Intl.DateTimeFormat(localeTag(), { hour: 'numeric', minute: '2-digit' }).format(d);
}

/** The current time, refreshed right when the minute changes. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer;
    const msToNextMinute = () => {
      const d = new Date();
      return 60000 - (d.getSeconds() * 1000 + d.getMilliseconds()) + 50;
    };
    const tick = () => {
      setNow(new Date());
      timer = setTimeout(tick, msToNextMinute());
    };
    timer = setTimeout(tick, msToNextMinute());
    return () => clearTimeout(timer);
  }, []);
  return now;
}
