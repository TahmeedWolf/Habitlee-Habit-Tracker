import { Sun, Moon } from 'lucide-react';
import { greeting, displayDate, todayStr } from '../utils/dates';

export default function Header({ theme, onToggleTheme, today = todayStr() }) {
  return (
    <header
      className="px-5 pb-3"
      style={{ paddingTop: 'calc(var(--safe-top) + 1.25rem)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-dusk dark:text-white/35">
            Habitlee
          </p>
          <h1 className="font-display text-[27px] leading-none font-semibold mt-2">
            {greeting()}
          </h1>
          <p className="text-sm text-dusk dark:text-white/45 mt-1.5">
            {displayDate(today)}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="shrink-0 mt-1 p-2.5 rounded-full bg-paper-card dark:bg-ink-card border border-paper-line dark:border-ink-line text-dusk dark:text-white/70 active:scale-95 transition-transform"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
      </div>
    </header>
  );
}
