// Every habit that enters app state — from localStorage, from an imported
// backup, or from the add form — goes through here first. One malformed
// object used to be enough to crash the whole render tree.
import { HABIT_COLORS, HABIT_EMOJIS, colorFor } from './colors.js';
import { isDateStr, todayStr } from './dates.js';

export const MAX_NAME_LENGTH = 40;

export function newId() {
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      return globalThis.crypto.randomUUID();
    }
  } catch {
    // older Android WebViews don't expose crypto.randomUUID — fall through
  }
  return `h_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function normalizeFrequency(value) {
  if (!Array.isArray(value)) return 'daily';
  const days = [...new Set(value.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))]
    .sort((a, b) => a - b);
  if (days.length === 0 || days.length === 7) return 'daily';
  return days;
}

export function normalizeCompletions(value) {
  const out = {};
  if (!value || typeof value !== 'object') return out;
  for (const [key, done] of Object.entries(value)) {
    if (isDateStr(key) && done) out[key] = true;
  }
  return out;
}

export function normalizeHabit(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, MAX_NAME_LENGTH) : '';
  if (!name) return null;

  const completions = normalizeCompletions(raw.completions);
  const firstLogged = Object.keys(completions).sort()[0];

  let createdAt = isDateStr(raw.createdAt) ? raw.createdAt : (firstLogged || todayStr());
  if (firstLogged && firstLogged < createdAt) createdAt = firstLogged;

  const emoji = typeof raw.emoji === 'string' && raw.emoji.trim() && raw.emoji.length <= 8
    ? raw.emoji
    : HABIT_EMOJIS[0];

  const color = HABIT_COLORS.some((c) => c.id === raw.color) ? raw.color : colorFor().id;

  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : newId(),
    name,
    emoji,
    color,
    frequency: normalizeFrequency(raw.frequency),
    createdAt,
    completions,
  };
}

// Returns null (not []) when the input isn't a habit list at all, so callers
// can tell "empty backup" apart from "this file is not a backup".
export function normalizeHabits(raw) {
  if (!Array.isArray(raw)) return null;
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    const habit = normalizeHabit(item);
    if (!habit) continue;
    if (seen.has(habit.id)) habit.id = newId();
    seen.add(habit.id);
    out.push(habit);
  }
  return out;
}
