import {
  lastNDates, isDue, isCompleted, todayStr, WEEKDAY_SHORT, dayOfWeek, isDateStr,
} from '../utils/dates';
import { tapFeedback, successFeedback } from '../utils/haptics';

// One column per day: dot on top, two-letter weekday under it.
//
// The strip answers two questions at once — "which days does this repeat on?"
// and "how have I done?" — so scheduled days always render at full size in the
// habit's colour and only the FILL carries history. Unscheduled days shrink to
// a small grey pip, which reads as "nothing expected here" rather than a miss.
//
// When onToggleDate is passed, past scheduled days become tappable so a missed
// day can be filled in. Days before the habit existed stay read-only.
export default function SparkTrail({
  habit,
  colorMeta,
  days = 7,
  size = 'sm',
  showLabels = false,
  today = todayStr(),
  onToggleDate,
}) {
  const dates = lastNDates(days, today);
  const full = size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3';
  const pip = 'w-1.5 h-1.5';
  const col = size === 'sm' ? 'w-5' : 'w-6';
  const createdAt = isDateStr(habit?.createdAt) ? habit.createdAt : null;

  return (
    <div className={`flex gap-1 ${size === 'lg' ? 'flex-wrap gap-y-2' : ''}`}>
      {dates.map((d) => {
        const scheduled = isDue(habit, d);
        const done = isCompleted(habit, d);
        const isToday = d === today;
        const beforeStart = createdAt ? d < createdAt : false;

        // "Today" is only worth highlighting when the habit is actually due.
        // On an unscheduled day the enlarged dot and the bold coloured label
        // read as "something is happening here" on a card that says Not due
        // today — the dot and the card were telling opposite stories. Today
        // still gets its dim label styling below, just no emphasis.
        const highlightToday = isToday && scheduled;

        let dot = `${pip} bg-dusk/20 dark:bg-white/12`;
        if (scheduled && done) dot = `${full} ${colorMeta.solid}`;
        else if (scheduled && isToday) dot = `${full} bg-transparent ring-2 ${colorMeta.ringStrong}`;
        else if (scheduled && beforeStart) dot = `${full} bg-transparent ring-2 ${colorMeta.ring}`;
        else if (scheduled) dot = `${full} bg-dusk/25 dark:bg-white/20`;

        const canToggle = !!onToggleDate && scheduled && !beforeStart;

        const inner = (
          <>
            <span className={`${full} flex items-center justify-center`}>
              <span
                className={`${dot} rounded-full ${highlightToday ? 'scale-125' : ''} transition-transform`}
              />
            </span>
            {showLabels && (
              <span
                className={`text-[9px] leading-none font-mono ${
                  highlightToday
                    ? `${colorMeta.text} font-semibold`
                    : scheduled
                      ? 'text-dusk/80 dark:text-white/40'
                      : 'text-dusk/40 dark:text-white/15'
                }`}
              >
                {WEEKDAY_SHORT[dayOfWeek(d) ?? 0]}
              </span>
            )}
          </>
        );

        const layout = `${col} flex flex-col items-center gap-1.5 shrink-0`;

        if (!canToggle) {
          return (
            <div key={d} className={layout} title={d}>{inner}</div>
          );
        }

        return (
          <button
            key={d}
            type="button"
            title={d}
            aria-pressed={done}
            aria-label={`${done ? 'Unmark' : 'Mark'} ${habit.name} for ${d}`}
            onClick={() => {
              if (done) tapFeedback();
              else successFeedback();
              onToggleDate(habit.id, d);
            }}
            className={`${layout} py-1.5 -my-1.5 rounded-lg active:bg-dusk/10 dark:active:bg-white/10 transition-colors`}
          >
            {inner}
          </button>
        );
      })}
    </div>
  );
}
