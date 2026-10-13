import { useState, useEffect } from 'react';
import { msUntilNextMidnight, todayStr } from '../utils/dates';

// The app is a long-lived WebView — people leave it open overnight and Android
// keeps the process around for days. Without this, `today` stayed frozen at
// whatever day the app was opened, and a tap would log the wrong date.
export function useToday() {
  const [today, setToday] = useState(todayStr);

  useEffect(() => {
    let timer = null;

    const sync = () => {
      const next = todayStr();
      setToday((prev) => (prev === next ? prev : next));
      schedule();
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      // Cap the wait at an hour: background timers get throttled, and this
      // also keeps the time-of-day greeting fresh.
      timer = setTimeout(sync, Math.min(msUntilNextMidnight(), 60 * 60 * 1000));
    };

    const onWake = () => {
      if (document.visibilityState === 'visible') sync();
    };

    schedule();
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('focus', onWake);
    window.addEventListener('resume', onWake);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('focus', onWake);
      window.removeEventListener('resume', onWake);
    };
  }, []);

  return today;
}
