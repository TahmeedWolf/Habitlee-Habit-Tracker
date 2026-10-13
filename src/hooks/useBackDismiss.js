import { useEffect, useRef } from 'react';

// Android's hardware/gesture back closes the top-most layer instead of
// quitting the app. Capacitor routes the system back press into WebView
// history, so pushing an entry per open overlay is all this needs — no
// native plugin, and it behaves the same in a desktop browser.
export function useBackDismiss(active, onDismiss) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!active) return undefined;

    let dismissedByBack = false;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    try {
      window.history.pushState({ habitleeOverlay: token }, '');
    } catch {
      return undefined;
    }

    const onPopState = () => {
      dismissedByBack = true;
      dismissRef.current?.();
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      // Closed from the UI instead of the back button: drop the entry we
      // pushed so the history stack stays balanced. Only pop when the entry
      // on top is still ours — popping someone else's would navigate the
      // WebView away and, with an empty stack, close the app.
      if (!dismissedByBack) {
        try {
          if (window.history.state?.habitleeOverlay === token) window.history.back();
        } catch { /* ignore */ }
      }
    };
  }, [active]);
}
