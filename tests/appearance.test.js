import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  APPEARANCE_OPTIONS,
  APPEARANCE_FIELDS,
  defaultAppearance,
  validateAppearance,
  randomAppearance,
  cycleOption,
} from '../src/characters/appearance.js';
import { createRng } from '../src/core/math.js';

test('aparência padrão é válida e cobre todos os campos editáveis', () => {
  const def = defaultAppearance();
  assert.deepEqual(validateAppearance(def), def);
  for (const [field] of APPEARANCE_FIELDS) assert.ok(field in def);
});

test('validateAppearance corrige lixo', () => {
  assert.deepEqual(validateAppearance(null), defaultAppearance());
  const fixed = validateAppearance({ hairStyle: 'inexistente', skin: 'cocoa' });
  assert.equal(fixed.hairStyle, defaultAppearance().hairStyle);
  assert.equal(fixed.skin, 'cocoa');
});

test('randomAppearance sempre gera combinações válidas', () => {
  const rng = createRng(5);
  for (let i = 0; i < 200; i++) {
    const a = randomAppearance(rng);
    assert.deepEqual(validateAppearance(a), a);
  }
});

test('cycleOption dá a volta nas duas direções', () => {
  const opts = APPEARANCE_OPTIONS.hairStyle;
  let a = { ...defaultAppearance(), hairStyle: opts[0].id };
  a = cycleOption(a, 'hairStyle', -1);
  assert.equal(a.hairStyle, opts[opts.length - 1].id);
  a = cycleOption(a, 'hairStyle', 1);
  assert.equal(a.hairStyle, opts[0].id);
});
