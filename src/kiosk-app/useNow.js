import { useEffect, useState } from 'react';

export const dateFormat = new Intl.DateTimeFormat('en-US', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
export const timeFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });

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
