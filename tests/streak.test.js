import test from 'node:test';
import assert from 'node:assert/strict';
import { currentStreak, longestStreak, completionRate } from '../src/utils/streak.js';

const habit = (over) => ({
  id: 'h1', name: 'Test', emoji: '🏃', color: 'ember',
  frequency: 'daily', createdAt: '2026-09-01', completions: {}, ...over,
});

const TODAY = '2026-09-07';

test('an unfinished today does not break the streak', () => {
  const h = habit({
    completions: { '2026-09-04': true, '2026-09-05': true, '2026-09-06': true },
  });
  assert.equal(currentStreak(h, TODAY), 3);
});

test('finishing today extends the streak', () => {
  const h = habit({
    completions: { '2026-09-05': true, '2026-09-06': true, '2026-09-07': true },
  });
  assert.equal(currentStreak(h, TODAY), 3);
});

test('a missed past day ends the streak', () => {
  const h = habit({
    completions: { '2026-09-03': true, '2026-09-06': true, '2026-09-07': true },
  });
  assert.equal(currentStreak(h, TODAY), 2);
});

test('non-due weekdays are skipped rather than counted as misses', () => {
  // Mon/Wed/Fri only. Sep 2 (Wed), Sep 4 (Fri), Sep 7 (Mon) 2026.
  const h = habit({
    frequency: [1, 3, 5],
    completions: { '2026-09-02': true, '2026-09-04': true, '2026-09-07': true },
  });
  assert.equal(currentStreak(h, TODAY), 3);
});

test('streak functions never throw on malformed habits', () => {
  assert.equal(currentStreak(null, TODAY), 0);
  assert.equal(currentStreak(habit({ completions: undefined }), TODAY), 0);
  assert.equal(currentStreak(habit({ createdAt: undefined }), TODAY), 0);
  assert.equal(longestStreak(habit({ createdAt: 'nonsense' }), TODAY), 0);
  assert.equal(completionRate(habit({ createdAt: null }), TODAY), 0);
});

test('longestStreak finds the best historical run', () => {
  const h = habit({
    createdAt: '2026-09-01',
    completions: {
      '2026-09-01': true, '2026-09-02': true, '2026-09-03': true,
      '2026-09-06': true,
    },
  });
  assert.equal(longestStreak(h, TODAY), 3);
});

test('longestStreak does not reset on an unfinished today', () => {
  const h = habit({
    createdAt: '2026-09-05',
    completions: { '2026-09-05': true, '2026-09-06': true },
  });
  assert.equal(longestStreak(h, TODAY), 2);
});

test('completionRate ignores today until it is done', () => {
  const h = habit({
    createdAt: '2026-09-05',
    completions: { '2026-09-05': true, '2026-09-06': true },
  });
  // 2 of 2 finished days, today not counted yet
  assert.equal(completionRate(h, TODAY), 100);

  const withToday = habit({
    createdAt: '2026-09-05',
    completions: { '2026-09-05': true, '2026-09-06': true, '2026-09-07': true },
  });
  assert.equal(completionRate(withToday, TODAY), 100);

  const missed = habit({
    createdAt: '2026-09-05',
    completions: { '2026-09-05': true },
  });
  // Sep 5 done, Sep 6 missed, today pending -> 1/2
  assert.equal(completionRate(missed, TODAY), 50);
});

test('a brand new habit reports 0% rather than NaN', () => {
  const h = habit({ createdAt: TODAY, completions: {} });
  assert.equal(completionRate(h, TODAY), 0);
  assert.equal(currentStreak(h, TODAY), 0);
  assert.equal(longestStreak(h, TODAY), 0);
});
