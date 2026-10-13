import { Component } from 'react';
import { RotateCcw } from 'lucide-react';

// A render error anywhere below here used to leave the screen blank with no
// way back. Now it shows what happened and offers a reload — stored habits
// are untouched either way.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Visible in `adb logcat` / Chrome remote devtools when debugging a device.
    console.error('Habitlee crashed while rendering:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="px-6 py-16 flex flex-col items-center text-center">
        <p className="font-display text-xl font-semibold mb-1.5">Something broke</p>
        <p className="text-sm text-dusk dark:text-white/50 max-w-[30ch] mb-6">
          Your habits are still saved on this device. Reloading usually clears it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink dark:bg-paper text-paper dark:text-ink font-medium text-sm"
        >
          <RotateCcw size={15} />
          Reload
        </button>
        <p className="mt-6 text-[10px] font-mono text-dusk/60 dark:text-white/25 max-w-full break-words">
          {String(this.state.error?.message || this.state.error)}
        </p>
      </div>
    );
  }
}
