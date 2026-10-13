// Written as fully literal Tailwind class strings (not template-interpolated)
// so Tailwind's JIT scanner can detect and generate them at build time.
export const HABIT_COLORS = [
  {
    id: 'ember', label: 'Ember',
    grad: 'from-orange-400 to-amber-300', solid: 'bg-orange-400',
    text: 'text-orange-500 dark:text-orange-400', stroke: 'stroke-orange-400',
    ring: 'ring-orange-400/40', ringStrong: 'ring-orange-400',
  },
  {
    id: 'rose', label: 'Rose',
    grad: 'from-rose-400 to-pink-300', solid: 'bg-rose-400',
    text: 'text-rose-500 dark:text-rose-400', stroke: 'stroke-rose-400',
    ring: 'ring-rose-400/40', ringStrong: 'ring-rose-400',
  },
  {
    id: 'violet', label: 'Violet',
    grad: 'from-violet-400 to-fuchsia-300', solid: 'bg-violet-400',
    text: 'text-violet-500 dark:text-violet-400', stroke: 'stroke-violet-400',
    ring: 'ring-violet-400/40', ringStrong: 'ring-violet-400',
  },
  {
    id: 'sky', label: 'Sky',
    grad: 'from-sky-400 to-cyan-300', solid: 'bg-sky-400',
    text: 'text-sky-500 dark:text-sky-400', stroke: 'stroke-sky-400',
    ring: 'ring-sky-400/40', ringStrong: 'ring-sky-400',
  },
  {
    id: 'emerald', label: 'Emerald',
    grad: 'from-emerald-400 to-lime-300', solid: 'bg-emerald-400',
    text: 'text-emerald-500 dark:text-emerald-400', stroke: 'stroke-emerald-400',
    ring: 'ring-emerald-400/40', ringStrong: 'ring-emerald-400',
  },
  {
    id: 'gold', label: 'Gold',
    grad: 'from-amber-400 to-yellow-300', solid: 'bg-amber-400',
    text: 'text-amber-500 dark:text-amber-400', stroke: 'stroke-amber-400',
    ring: 'ring-amber-400/40', ringStrong: 'ring-amber-400',
  },
];

export function colorFor(id) {
  return HABIT_COLORS.find((c) => c.id === id) || HABIT_COLORS[0];
}

export const HABIT_EMOJIS = [
  '🏃', '💧', '📚', '🧘', '💪', '🍎', '😴', '✍️',
  '🎨', '🚭', '🧹', '🎯', '🧠', '🌱', '🎸', '💊',
];
