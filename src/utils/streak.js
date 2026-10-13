import { addDays, isDue, isCompleted, isDateStr, todayStr } from './dates.js';

const MAX_LOOKBACK = 3650; // ~10 years, safety cap so a bad date never loops forever

function startOf(habit) {
  return isDateStr(habit?.createdAt) ? habit.createdAt : null;
}

// Walks backward from today counting consecutive *due* days that were
// completed. If today is due but not yet completed, we don't break the
// streak for it — we just start counting from yesterday instead, so the
// streak number doesn't drop to zero the moment the day begins.
export function currentStreak(habit, today = todayStr()) {
  if (!habit || !isDateStr(today)) return 0;
  const created = startOf(habit);
  if (!created) return 0;

  let streak = 0;
  let cursor = today;

  if (isDue(habit, cursor) && !isCompleted(habit, cursor)) {
    cursor = addDays(cursor, -1);
  }

  for (let i = 0; i < MAX_LOOKBACK; i += 1) {
    if (!cursor || cursor < created) break;
    if (isDue(habit, cursor)) {
      if (isCompleted(habit, cursor)) streak += 1;
      else break;
    }
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(habit, today = todayStr()) {
  if (!habit || !isDateStr(today)) return 0;
  const created = startOf(habit);
  if (!created) return 0;

  let longest = 0;
  let run = 0;
  let cursor = created;

  for (let i = 0; i < MAX_LOOKBACK && cursor && cursor <= today; i += 1) {
    if (isDue(habit, cursor)) {
      if (isCompleted(habit, cursor)) {
        run += 1;
        if (run > longest) longest = run;
      } else if (cursor !== today) {
        // Today isn't a miss yet — the day isn't over.
        run = 0;
      }
    }
    cursor = addDays(cursor, 1);
  }
  return longest;
}

// Percentage of due days that were completed. Today is only counted once
// it's done — an unfinished today should not drag the number down all day.
export function completionRate(habit, today = todayStr()) {
  if (!habit || !isDateStr(today)) return 0;
  const created = startOf(habit);
  if (!created) return 0;

  let due = 0;
  let done = 0;
  let cursor = created;

  for (let i = 0; i < MAX_LOOKBACK && cursor && cursor <= today; i += 1) {
    if (isDue(habit, cursor)) {
      const complete = isCompleted(habit, cursor);
      if (cursor === today && !complete) {
        cursor = addDays(cursor, 1);
        continue;
      }
      due += 1;
      if (complete) done += 1;
    }
    cursor = addDays(cursor, 1);
  }
  return due === 0 ? 0 : Math.round((done / due) * 100);
}

export function todayCompletionSummary(habits, today = todayStr()) {
  const list = Array.isArray(habits) ? habits : [];
  const due = list.filter((h) => isDue(h, today));
  const done = due.filter((h) => isCompleted(h, today));
  return { due: due.length, done: done.length };
}
