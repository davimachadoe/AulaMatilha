import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, ValueNoise1D, clamp, hashString, smoothstep } from '../src/core/math.js';

test('createRng é determinístico para a mesma semente', () => {
  const a = createRng(42);
  const b = createRng(42);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
});

test('createRng gera valores em [0, 1) e helpers respeitam limites', () => {
  const rng = createRng(7);
  for (let i = 0; i < 1000; i++) {
    const v = rng();
    assert.ok(v >= 0 && v < 1);
    const n = rng.int(3, 5);
    assert.ok(n >= 3 && n <= 5 && Number.isInteger(n));
  }
});

test('ValueNoise1D.fbm fica entre 0 e 1 e é contínuo', () => {
  const noise = new ValueNoise1D(createRng(1));
  let prev = noise.fbm(0);
  for (let x = 0; x < 50; x += 0.01) {
    const v = noise.fbm(x);
    assert.ok(v >= 0 && v <= 1);
    assert.ok(Math.abs(v - prev) < 0.1, 'ruído deve ser suave');
    prev = v;
  }
});

test('clamp, smoothstep e hashString', () => {
  assert.equal(clamp(5, 0, 3), 3);
  assert.equal(clamp(-1, 0, 3), 0);
  assert.equal(smoothstep(0, 1, 0.5), 0.5);
  assert.equal(hashString('abc'), hashString('abc'));
  assert.notEqual(hashString('abc'), hashString('abd'));
});
