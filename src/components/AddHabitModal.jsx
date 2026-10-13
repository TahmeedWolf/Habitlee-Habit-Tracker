import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Trash2 } from 'lucide-react';
import { HABIT_COLORS, HABIT_EMOJIS } from '../utils/colors';
import { WEEKDAY_SHORT, WEEKDAY_FULL, frequencyLabel } from '../utils/dates';
import { MAX_NAME_LENGTH } from '../utils/habits';
import { useBackDismiss } from '../hooks/useBackDismiss';

const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const PRESETS = [
  { label: 'Every day', days: ALL_DAYS },
  { label: 'Weekdays', days: [1, 2, 3, 4, 5] },
  { label: 'Weekends', days: [0, 6] },
];

const sameDays = (a, b) => a.length === b.length && a.every((d) => b.includes(d));

export default function AddHabitModal({ habit, onClose, onSave, onDelete }) {
  const isEdit = !!habit;
  const [name, setName] = useState(habit?.name ?? '');
  const [emoji, setEmoji] = useState(habit?.emoji ?? HABIT_EMOJIS[0]);
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[0].id);
  const [days, setDays] = useState(() => (
    Array.isArray(habit?.frequency) ? [...habit.frequency] : [...ALL_DAYS]
  ));

  const allDays = days.length === 7;
  const canSave = name.trim().length > 0 && days.length > 0;

  useBackDismiss(true, onClose);

  function toggleDay(d) {
    setDays((prev) => (
      prev.includes(d)
        ? prev.filter((x) => x !== d)
        : [...prev, d].sort((a, b) => a - b)
    ));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSave) return;
    onSave({
      name: name.trim(),
      emoji,
      color,
      frequency: allDays ? 'daily' : days,
    });
  }

  return (
    <motion.div
      className="fixed inset-0 bg-ink/60 backdrop-blur-sm z-40 flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={isEdit ? 'Edit habit' : 'New habit'}
    >
      <motion.form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="w-full max-w-md bg-paper dark:bg-ink rounded-t-4xl px-5 pt-5 max-h-[88dvh] overflow-y-auto no-scrollbar"
        style={{ paddingBottom: 'calc(var(--safe-bottom) + 24px)' }}
      >
        <div className="flex items-center justify-between mb-5">
          <p className="font-display text-lg font-semibold">{isEdit ? 'Edit habit' : 'New habit'}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1.5 text-dusk dark:text-white/50">
            <X size={20} />
          </button>
        </div>

        <label htmlFor="habit-name" className="block text-xs font-medium text-dusk dark:text-white/50 mb-2">Name</label>
        <input
          id="habit-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Drink water"
          maxLength={MAX_NAME_LENGTH}
          className="w-full rounded-2xl bg-paper-card dark:bg-ink-card border border-paper-line dark:border-ink-line px-4 py-3 mb-5 outline-none focus:ring-2 focus:ring-ember/50"
        />

        <p className="text-xs font-medium text-dusk dark:text-white/50 mb-2">Icon</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {HABIT_EMOJIS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setEmoji(option)}
              aria-pressed={emoji === option}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border-2 transition-colors ${
                emoji === option ? 'border-ember bg-ember/10' : 'border-transparent bg-paper-card dark:bg-ink-card'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <p className="text-xs font-medium text-dusk dark:text-white/50 mb-2">Color</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {HABIT_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setColor(c.id)}
              aria-label={c.label}
              aria-pressed={color === c.id}
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${c.grad} ${
                color === c.id ? 'ring-2 ring-offset-2 ring-offset-paper dark:ring-offset-ink ring-ink dark:ring-paper' : ''
              }`}
            />
          ))}
        </div>

        <p className="text-xs font-medium text-dusk dark:text-white/50 mb-2">Repeats on</p>
        <div className="flex gap-1.5 mb-2">
          {WEEKDAY_SHORT.map((label, i) => (
            <button
              key={i}
              type="button"
              onClick={() => toggleDay(i)}
              aria-label={WEEKDAY_FULL[i]}
              aria-pressed={days.includes(i)}
              className={`flex-1 h-10 rounded-xl text-sm font-medium transition-colors ${
                days.includes(i)
                  ? 'bg-ink dark:bg-paper text-paper dark:text-ink'
                  : 'bg-paper-card dark:bg-ink-card text-dusk dark:text-white/50 border border-paper-line dark:border-ink-line'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Presets instead of a "Clear all" link — that link's only possible
            outcome was an unsaveable form with zero days picked. */}
        <div className="flex gap-2 mb-3">
          {PRESETS.map((preset) => {
            const selected = sameDays(days, preset.days);
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => setDays([...preset.days])}
                aria-pressed={selected}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  selected
                    ? 'bg-ember/15 text-ember'
                    : 'bg-paper-card dark:bg-ink-card text-dusk dark:text-white/50 border border-paper-line dark:border-ink-line'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-dusk dark:text-white/40 mb-6 h-4">
          {days.length === 0
            ? 'Pick at least one day.'
            : `Repeats: ${frequencyLabel(allDays ? 'daily' : days)}`}
        </p>

        <div className="flex gap-3">
          {isEdit && (
            <button
              type="button"
              onClick={() => onDelete(habit.id)}
              aria-label="Delete habit"
              className="px-4 py-3 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="submit"
            disabled={!canSave}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-br from-ember to-spark text-ink font-semibold disabled:opacity-40"
          >
            {isEdit ? 'Save changes' : 'Add habit'}
          </button>
        </div>
      </motion.form>
    </motion.div>
  );
}
