import { motion } from 'framer-motion';
import { Check, Flame, Pencil, Trash2 } from 'lucide-react';
import { colorFor } from '../utils/colors';
import { currentStreak } from '../utils/streak';
import { isCompleted, todayStr, frequencyLabel } from '../utils/dates';
import { tapFeedback, successFeedback } from '../utils/haptics';
import SparkTrail from './SparkTrail';

export default function HabitCard({
  habit, onToggle, onEdit, onDelete, today = todayStr(), offSchedule = false,
}) {
  const color = colorFor(habit.color);
  const done = isCompleted(habit, today);
  const streak = currentStreak(habit, today);

  function handleToggle() {
    if (done) tapFeedback();
    else successFeedback();
    onToggle(habit.id, today);
  }

  const toggleLabel = done
    ? `Mark ${habit.name} not done today`
    : `Mark ${habit.name} done today`;

  // Off-schedule days are NOT tickable. They used to be: the tap wrote a
  // completion, the circle filled, and then every calculation ignored it —
  // isDue() is false, so streaks, longest, rate and the dot strip all skipped
  // it. The tick looked real and did nothing, which reads as the app losing
  // data. The card still shows so it can be edited or deleted; it just doesn't
  // pretend to be tickable.
  const tickable = !offSchedule;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-3xl bg-paper-card dark:bg-ink-card border p-4 ${
        offSchedule
          ? 'border-dashed border-paper-line dark:border-ink-line opacity-75'
          : 'border-paper-line dark:border-ink-line'
      }`}
    >
      {/* On a day the habit is due, tapping the row ticks it — that is what
          people reach for. Editing lives on the pencil below. On a day it
          isn't due there's nothing to tick, so the row is inert. */}
      <div className="flex items-center gap-3">
        <Row
          tickable={tickable}
          onClick={handleToggle}
          done={done}
          label={toggleLabel}
        >
          <span
            className={`shrink-0 w-11 h-11 rounded-2xl bg-gradient-to-br ${color.grad} flex items-center justify-center text-xl shadow-sm`}
            aria-hidden="true"
          >
            {habit.emoji}
          </span>
          <span className="flex-1 min-w-0">
            <span className={`block font-semibold truncate ${done ? 'line-through decoration-2 decoration-dusk/40 dark:decoration-white/30' : ''}`}>
              {habit.name}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-dusk dark:text-white/50 min-w-0">
              {/* At zero the flame and "Start today" said nothing the ring
                  above doesn't already say, and in a mono font they ate enough
                  width to truncate the schedule to "E…". The schedule is the
                  part that has to survive — the dots get misread without it. */}
              {streak > 0 && (
                <>
                  <Flame size={12} className={`shrink-0 ${color.text}`} />
                  <span className="font-mono shrink-0">
                    {`${streak} day${streak === 1 ? '' : 's'}`}
                  </span>
                  <span className="text-dusk/40 dark:text-white/20 shrink-0">·</span>
                </>
              )}
              <span className="truncate">{frequencyLabel(habit.frequency)}</span>
            </span>
          </span>
        </Row>

        {tickable ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.85 }}
            onClick={handleToggle}
            aria-hidden="true"
            tabIndex={-1}
            className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 transition-colors ${
              done
                ? `${color.solid} border-transparent text-ink shadow-glow`
                : 'border-dusk/30 dark:border-white/20 text-transparent'
            }`}
          >
            <Check size={20} strokeWidth={3} />
          </motion.button>
        ) : (
          // Says what's going on rather than showing a circle that can't be
          // filled. The card is still here to be edited or deleted.
          // One line, always: the old fixed w-14 (56px) was narrower than the
          // phrase, so it wrapped to "Not due / today". It now sizes to its
          // text, and the habit name beside it truncates if space runs out.
          <span className="shrink-0 whitespace-nowrap text-[11px] text-dusk/70 dark:text-white/30">
            Not due today
          </span>
        )}
      </div>

      {/* Schedule history on the left — tap any past day to fill it in —
          and the actions on the right, clear of the tick target. */}
      <div className="mt-3.5 flex items-center justify-between gap-3">
        <SparkTrail
          habit={habit}
          colorMeta={color}
          days={7}
          size="sm"
          showLabels
          today={today}
          onToggleDate={onToggle}
        />

        <div className="flex items-center gap-1 shrink-0">
          <CardAction onClick={() => onEdit(habit)} label={`Edit ${habit.name}`}>
            <Pencil size={15} />
          </CardAction>
          <CardAction onClick={() => onDelete(habit.id)} label={`Delete ${habit.name}`} danger>
            <Trash2 size={15} />
          </CardAction>
        </div>
      </div>
    </motion.div>
  );
}

// A button when the habit can be ticked, plain markup when it can't. Rendering
// a disabled button instead would keep the tap target and just swallow the tap,
// which is the confusing thing we're removing.
function Row({ tickable, onClick, done, label, children }) {
  const layout = 'flex items-center gap-3 flex-1 min-w-0 text-left';
  if (!tickable) return <div className={layout}>{children}</div>;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={done}
      aria-label={label}
      className={layout}
    >
      {children}
    </button>
  );
}

function CardAction({ onClick, label, danger, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors active:scale-95 ${
        danger
          ? 'text-rose-500/80 active:text-rose-500 active:bg-rose-500/15'
          : 'text-dusk/70 dark:text-white/35 active:bg-dusk/10 dark:active:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
