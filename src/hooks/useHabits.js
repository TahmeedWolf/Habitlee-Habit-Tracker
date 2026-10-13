import { useState, useEffect, useCallback, useRef } from 'react';
import { isDateStr, todayStr } from '../utils/dates';
import { newId, normalizeHabit, normalizeHabits } from '../utils/habits';

const STORAGE_KEY = 'habitlee:habits:v1';
const BACKUP_KEY = 'habitlee:habits:v1:unreadable';

function loadInitial() {
  let raw = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return { habits: [], readable: false };
  }
  if (raw == null) return { habits: [], readable: true };

  try {
    const normalized = normalizeHabits(JSON.parse(raw));
    if (normalized) return { habits: normalized, readable: true };
  } catch {
    // fall through to the backup branch below
  }

  // The stored value exists but isn't usable. Keep a copy of the raw string
  // instead of silently overwriting it with an empty list.
  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // out of quota — nothing more we can do
  }
  return { habits: [], readable: false };
}

export function useHabits() {
  const initial = useRef(null);
  if (initial.current === null) initial.current = loadInitial();

  const [habits, setHabits] = useState(initial.current.habits);
  const [storageReadable] = useState(initial.current.readable);

  // Nothing is written until the user actually changes something, so simply
  // opening the app can never clobber existing data.
  const dirty = useRef(false);

  const mutate = useCallback((updater) => {
    dirty.current = true;
    setHabits(updater);
  }, []);

  useEffect(() => {
    if (!dirty.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
    } catch {
      // storage full or unavailable — data stays in memory for this session
    }
  }, [habits]);

  const addHabit = useCallback(({ name, emoji, color, frequency }) => {
    const habit = normalizeHabit({
      id: newId(),
      name,
      emoji,
      color,
      frequency,
      createdAt: todayStr(),
      completions: {},
    });
    if (!habit) return;
    mutate((prev) => [...prev, habit]);
  }, [mutate]);

  const updateHabit = useCallback((id, patch) => {
    mutate((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      return normalizeHabit({ ...h, ...patch, id: h.id, createdAt: h.createdAt }) || h;
    }));
  }, [mutate]);

  const deleteHabit = useCallback((id) => {
    mutate((prev) => prev.filter((h) => h.id !== id));
  }, [mutate]);

  // Puts a deleted habit back where it was, so Undo restores the list order
  // as well as the data.
  const restoreHabit = useCallback((habit, index) => {
    const restored = normalizeHabit(habit);
    if (!restored) return;
    mutate((prev) => {
      if (prev.some((h) => h.id === restored.id)) return prev;
      const next = [...prev];
      next.splice(Math.min(Math.max(index, 0), next.length), 0, restored);
      return next;
    });
  }, [mutate]);

  const toggleCompletion = useCallback((id, dateStr) => {
    if (!isDateStr(dateStr)) return;
    mutate((prev) => prev.map((h) => {
      if (h.id !== id) return h;
      const completions = { ...h.completions };
      if (completions[dateStr]) delete completions[dateStr];
      else completions[dateStr] = true;
      return { ...h, completions };
    }));
  }, [mutate]);

  // Returns true when the payload was a usable habit list.
  const replaceAll = useCallback((next) => {
    const normalized = normalizeHabits(next);
    if (!normalized) return false;
    mutate(() => normalized);
    return true;
  }, [mutate]);

  return {
    habits,
    storageReadable,
    addHabit,
    updateHabit,
    deleteHabit,
    restoreHabit,
    toggleCompletion,
    replaceAll,
  };
}
