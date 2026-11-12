import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../src/terrain/Terrain.js';
import { launchState, makeEnv, stepProjectile, simulateTrajectory, windAcceleration } from '../src/physics/projectile.js';
import { updateCharacterPhysics, findGroundNear } from '../src/physics/characterPhysics.js';
import { WEAPONS } from '../src/weapons/weapons.js';
import { PHYSICS, WORLD } from '../src/core/config.js';
import { degToRad } from '../src/core/math.js';

const cannon = WEAPONS.cannon;
const W = 4000;
const H = 1200;
const GROUND = 1000;

function flatTerrain() {
  const t = new Terrain(W, H);
  for (let x = 0; x < W; x++) t.fillColumn(x, GROUND, H - 1);
  return t;
}

const env = (terrain, wind = 0, extra = {}) =>
  makeEnv({ terrain, weapon: cannon, wind, world: { width: W, height: H }, ...extra });

test('sem vento, alcance bate com a fórmula da parábola (v²·sin2θ/g)', () => {
  const t = flatTerrain();
  const power = 60;
  const angle = 45;
  const start = launchState({ x: 500, y: GROUND }, angle, 1, power, cannon);
  // Começa um pixel acima do chão para não colidir no primeiro passo.
  start.y -= 1;
  const { impact } = simulateTrajectory(start, env(t));
  const v = (power / 100) * PHYSICS.maxPower;
  const expected = (v * v * Math.sin(2 * degToRad(angle))) / PHYSICS.gravity;
  const got = impact.x - 500;
  assert.equal(impact.type, 'terrain');
  assert.ok(Math.abs(got - expected) / expected < 0.03, `alcance ${got.toFixed(0)} vs esperado ${expected.toFixed(0)}`);
});

test('a prévia é idêntica ao tiro real (mesmo passo de física)', () => {
  const t = flatTerrain();
  const start = launchState({ x: 800, y: 900 }, 50, -1, 70, cannon);
  const e = env(t, 6);
  const preview = simulateTrajectory(start, e);
  const live = { ...start };
  let impact = null;
  while (!impact) impact = stepProjectile(live, e, PHYSICS.fixedDt);
  assert.equal(impact.x, preview.impact.x);
  assert.equal(impact.y, preview.impact.y);
});

test('vento empurra o impacto na direção do vento', () => {
  const t = flatTerrain();
  const shoot = (wind) => {
    const s = launchState({ x: 2000, y: 900 }, 60, 1, 55, cannon);
    return simulateTrajectory(s, env(t, wind)).impact.x;
  };
  const calm = shoot(0);
  assert.ok(shoot(8) > calm + 50, 'vento a favor aumenta alcance');
  assert.ok(shoot(-8) < calm - 50, 'vento contra diminui alcance');
  assert.ok(windAcceleration(10, cannon) === PHYSICS.windMax);
});

test('arma mais pesada cai mais cedo', () => {
  const t = flatTerrain();
  const heavy = { ...cannon, weight: 1.5 };
  const s1 = launchState({ x: 500, y: 900 }, 45, 1, 60, cannon);
  const s2 = launchState({ x: 500, y: 900 }, 45, 1, 60, heavy);
  const a = simulateTrajectory(s1, env(t)).impact.x;
  const b = simulateTrajectory(s2, makeEnv({ terrain: t, weapon: heavy, wind: 0, world: { width: W, height: H } })).impact.x;
  assert.ok(b < a);
});

test('colisão contínua: projétil rápido não atravessa parede fina', () => {
  const t = new Terrain(W, H);
  for (let y = 0; y < H; y++) t.setSolid(1500, y, true); // parede de 1px
  const s = launchState({ x: 1000, y: 500 }, 0, 1, 100, { ...cannon, speed: 3 });
  const { impact } = simulateTrajectory(s, makeEnv({ terrain: t, weapon: cannon, wind: 0, world: { width: W, height: H } }));
  assert.equal(impact.type, 'terrain');
  assert.ok(Math.abs(impact.x - 1500) <= 1);
});

test('acerta personagem no caminho e ignora quem atirou na saída', () => {
  const t = flatTerrain();
  const shooter = { id: 1, x: 1000, y: GROUND, alive: true };
  const target = { id: 2, x: 1300, y: GROUND, alive: true };
  const e = env(t, 0, { targets: [shooter, target], ownerId: 1 });
  // Sai de dentro da hitbox de quem atirou, em linha reta.
  const s = launchState({ x: 1005, y: GROUND - 30 }, 5, 1, 80, cannon);
  const { impact } = simulateTrajectory(s, e);
  assert.equal(impact.type, 'target');
  assert.equal(impact.target, target);
});

test('saiu do mapa é detectado', () => {
  const t = new Terrain(W, H);
  const s = launchState({ x: 100, y: 500 }, 30, -1, 100, cannon);
  const { impact } = simulateTrajectory(s, env(t));
  assert.equal(impact.type, 'out');
});

test('personagem cai quando o chão some e pousa no chão de baixo', () => {
  const t = new Terrain(200, WORLD.height);
  for (let x = 0; x < 200; x++) t.fillColumn(x, 800, 900);
  const c = { x: 100, y: 500, vy: 0, alive: true };
  let status;
  for (let i = 0; i < 300 && status !== 'landed'; i++) status = updateCharacterPhysics(c, t, 1 / 60);
  assert.equal(status, 'landed');
  assert.equal(c.y, 800);
});

test('personagem sem chão cai no fluido e é eliminado', () => {
  const t = new Terrain(200, WORLD.height);
  const c = { x: 100, y: 900, vy: 0, alive: true };
  let status;
  for (let i = 0; i < 600 && status !== 'eliminated'; i++) status = updateCharacterPhysics(c, t, 1 / 60);
  assert.equal(status, 'eliminated');
  assert.equal(c.alive, false);
});

test('findGroundNear acha chão ao lado de um buraco', () => {
  const t = new Terrain(400, WORLD.height);
  for (let x = 250; x < 400; x++) t.fillColumn(x, 700, 800);
  const spot = findGroundNear(t, 100);
  assert.ok(spot && spot.x >= 250 && spot.y === 700);
});
