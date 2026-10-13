import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeHabit, normalizeHabits, normalizeFrequency, newId,
} from '../src/utils/habits.js';

test('normalizeHabits rejects anything that is not an array', () => {
  assert.equal(normalizeHabits(null), null);
  assert.equal(normalizeHabits({ habits: [] }), null);
  assert.equal(normalizeHabits('[]'), null);
  assert.deepEqual(normalizeHabits([]), []);
});

test('malformed entries are dropped instead of crashing the app', () => {
  const result = normalizeHabits([
    null,
    42,
    { name: '   ' },
    { name: 'Real habit' },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0].name, 'Real habit');
});

test('missing fields get safe defaults', () => {
  const h = normalizeHabit({ name: 'Read' });
  assert.ok(h.id);
  assert.equal(h.frequency, 'daily');
  assert.deepEqual(h.completions, {});
  assert.ok(/^\d{4}-\d{2}-\d{2}$/.test(h.createdAt));
});

test('completion keys that are not dates are stripped', () => {
  const h = normalizeHabit({
    name: 'Water',
    completions: { '2026-09-01': true, 'yesterday': true, '2026-9-1': true, '2026-09-02': false },
  });
  assert.deepEqual(Object.keys(h.completions), ['2026-09-01']);
});

test('createdAt is pulled back to the earliest logged day', () => {
  const h = normalizeHabit({
    name: 'Run',
    createdAt: '2026-09-05',
    completions: { '2026-08-30': true },
  });
  assert.equal(h.createdAt, '2026-08-30');
});

test('frequency is de-duplicated, sorted and collapsed', () => {
  assert.deepEqual(normalizeFrequency([3, 1, 1, 5]), [1, 3, 5]);
  assert.equal(normalizeFrequency([0, 1, 2, 3, 4, 5, 6]), 'daily');
  assert.equal(normalizeFrequency([]), 'daily');
  assert.equal(normalizeFrequency('daily'), 'daily');
  assert.deepEqual(normalizeFrequency([9, -1, 2]), [2]);
});

test('unknown colors fall back instead of producing an undefined class', () => {
  const h = normalizeHabit({ name: 'X', color: 'chartreuse' });
  assert.equal(h.color, 'ember');
});

test('duplicate ids in an imported backup are re-issued', () => {
  const list = normalizeHabits([
    { id: 'same', name: 'A' },
    { id: 'same', name: 'B' },
  ]);
  assert.notEqual(list[0].id, list[1].id);
});

test('newId works without crypto.randomUUID', () => {
  const original = globalThis.crypto;
  try {
    Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
    const id = newId();
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 5);
  } finally {
    Object.defineProperty(globalThis, 'crypto', { value: original, configurable: true });
  }
});
