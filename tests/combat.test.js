import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explosionDamage, distanceToBody } from '../src/combat/damage.js';
import { rollWind } from '../src/combat/wind.js';
import { ShotController } from '../src/combat/ShotController.js';
import { createRng } from '../src/core/math.js';
import { AIM } from '../src/core/config.js';

test('dano: cheio no centro, zero na borda, diminui com a distância', () => {
  const base = 260;
  const radius = 60;
  assert.equal(explosionDamage({ base, radius, distance: 0 }), base);
  assert.equal(explosionDamage({ base, radius, distance: radius }), 0);
  let prev = Infinity;
  for (let d = 0; d < radius; d += 5) {
    const v = explosionDamage({ base, radius, distance: d });
    assert.ok(v <= prev);
    prev = v;
  }
});

test('dano: acerto direto ganha bônus e defesa reduz', () => {
  const normal = explosionDamage({ base: 200, radius: 50, distance: 0 });
  const direct = explosionDamage({ base: 200, radius: 50, distance: 0, direct: true, directBonus: 1.15 });
  const armored = explosionDamage({ base: 200, radius: 50, distance: 0, defense: 300 });
  assert.ok(direct > normal);
  assert.ok(armored < normal);
  assert.ok(armored > 0, 'defesa nunca zera o dano');
});

test('dano: ataque altíssimo tem retorno decrescente (PvP justo)', () => {
  const a = explosionDamage({ base: 200, radius: 50, distance: 0, attack: 200 });
  const b = explosionDamage({ base: 200, radius: 50, distance: 0, attack: 2000 });
  assert.ok(b > a);
  assert.ok(b < 200 * 2, 'nem 10x mais ataque dobra o dano');
});

test('distanceToBody é zero quando a explosão encosta no corpo', () => {
  const t = { x: 100, y: 500 };
  assert.equal(distanceToBody(t, 100, 472), 0);
  assert.ok(distanceToBody(t, 200, 472) > 80);
});

test('vento fica dentro da faixa do mapa e é inteiro', () => {
  const rng = createRng(3);
  let left = 0;
  let right = 0;
  for (let i = 0; i < 500; i++) {
    const w = rollWind(rng, [2, 7]);
    assert.ok(Number.isInteger(w));
    assert.ok(Math.abs(w) >= 2 && Math.abs(w) <= 7);
    if (w < 0) left++;
    else right++;
  }
  assert.ok(left > 150 && right > 150, 'as duas direções aparecem');
});

test('ShotController: ângulo limitado, carga até 100% e ponto de saída', () => {
  const c = { x: 500, y: 800, facing: 1, aim: 30 };
  const shot = new ShotController(c);
  shot.adjustAngle(1, 100);
  assert.equal(c.aim, AIM.maxAngle);
  shot.adjustAngle(-1, 100);
  assert.equal(c.aim, AIM.minAngle);

  assert.equal(shot.release(), null, 'soltar sem carregar não atira');
  shot.startCharge();
  shot.updateCharge(AIM.chargeTime * 2);
  assert.equal(shot.power, 100);
  assert.equal(shot.release(), 100);
  assert.equal(shot.lastPower, 100);

  shot.setAngle(0);
  const m = shot.muzzle();
  assert.ok(m.x > c.x, 'olhando para a direita, sai à direita');
  shot.face(-1);
  assert.ok(shot.muzzle().x < c.x, 'virado para a esquerda, sai à esquerda');
});
