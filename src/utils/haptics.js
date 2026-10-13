// Tiny wrapper around the Vibration API. Android WebView supports it when the
// VIBRATE permission is declared; everywhere else this is a silent no-op.
function buzz(pattern) {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(pattern);
    }
  } catch {
    // never let feedback break an interaction
  }
}

export const tapFeedback = () => buzz(10);
export const successFeedback = () => buzz([0, 14, 45, 22]);
