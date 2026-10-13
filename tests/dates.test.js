import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toDateStr, addDays, isDue, lastNDates, isDateStr, dayOfWeek, msUntilNextMidnight,
} from '../src/utils/dates.js';

test('toDateStr uses local calendar days, not UTC', () => {
  // 11:30pm local on the 5th must stay the 5th even when UTC has rolled over.
  const late = new Date(2026, 0, 5, 23, 30, 0);
  assert.equal(toDateStr(late), '2026-01-05');
  const early = new Date(2026, 0, 5, 0, 15, 0);
  assert.equal(toDateStr(early), '2026-01-05');
});

test('toDateStr returns null instead of throwing on garbage', () => {
  assert.equal(toDateStr('not-a-date'), null);
  assert.equal(toDateStr(undefined), null);
  assert.equal(toDateStr(new Date('nope')), null);
});

test('addDays crosses month, year and DST boundaries', () => {
  assert.equal(addDays('2026-01-31', 1), '2026-02-01');
  assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
  assert.equal(addDays('2028-02-28', 1), '2028-02-29'); // leap year
  assert.equal(addDays('bad', 1), null);
});

test('isDateStr and dayOfWeek', () => {
  assert.ok(isDateStr('2026-09-07'));
  assert.ok(!isDateStr('2026-9-7'));
  assert.ok(!isDateStr(20260907));
  assert.equal(dayOfWeek('2026-09-07'), 1); // a Monday
});

test('isDue handles both frequency shapes and bad input', () => {
  assert.ok(isDue({ frequency: 'daily' }, '2026-09-07'));
  assert.ok(isDue({ frequency: [1, 3, 5] }, '2026-09-07')); // Monday
  assert.ok(!isDue({ frequency: [0, 6] }, '2026-09-07'));
  assert.ok(!isDue({ frequency: null }, '2026-09-07'));
  assert.ok(!isDue(null, '2026-09-07'));
  assert.ok(!isDue({ frequency: 'daily' }, 'garbage'));
});

test('lastNDates is ordered oldest to newest and ends on the given day', () => {
  const dates = lastNDates(4, '2026-09-07');
  assert.deepEqual(dates, ['2026-09-04', '2026-09-05', '2026-09-06', '2026-09-07']);
  assert.deepEqual(lastNDates(3, 'garbage'), []);
});

test('msUntilNextMidnight is always positive and under ~24h', () => {
  const ms = msUntilNextMidnight(new Date(2026, 8, 7, 23, 59, 0));
  assert.ok(ms > 0 && ms <= 24 * 60 * 60 * 1000);
});

test('frequencyLabel says what the schedule actually is', async () => {
  const { frequencyLabel } = await import('../src/utils/dates.js');
  assert.equal(frequencyLabel('daily'), 'Every day');
  assert.equal(frequencyLabel([0, 1, 2, 3, 4, 5, 6]), 'Every day');
  assert.equal(frequencyLabel([1, 2, 3, 4, 5]), 'Weekdays');
  assert.equal(frequencyLabel([0, 6]), 'Weekends');
  assert.equal(frequencyLabel([1, 3, 5]), 'Mo We Fr');
  assert.equal(frequencyLabel([5, 1, 3]), 'Mo We Fr'); // order-independent
  assert.equal(frequencyLabel([]), 'No days set');
  assert.equal(frequencyLabel(undefined), 'Every day');
});

test('WEEKDAY_SHORT has no ambiguous duplicates', async () => {
  const { WEEKDAY_SHORT } = await import('../src/utils/dates.js');
  assert.equal(new Set(WEEKDAY_SHORT).size, 7);
  assert.deepEqual(WEEKDAY_SHORT, ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']);
});
