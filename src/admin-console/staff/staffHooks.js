import { useEffect, useState } from 'react';
import { subscribeLiveEvents, subscribeQueue } from '../../services/triageService';

/** { data: {queue, counts, alerts} | null, error, live } - updates live. */
export function useStaffQueue() {
  const [state, setState] = useState({ data: null, error: '', live: 'connecting' });
  useEffect(() => subscribeQueue(setState), []);
  return state;
}

/** Calls onEvent for every live event (checkin / alert / queue). */
export function useLiveEvents(onEvent) {
  useEffect(() => subscribeLiveEvents(onEvent), [onEvent]);
}

/** Re-renders every `ms` so "waiting 12 min" stays current. */
export function useNow(ms = 30000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}
