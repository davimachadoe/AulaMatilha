// Física de projéteis: trajetória parabólica com gravidade e vento, e colisão contínua
// (amostrada ao longo do caminho, para nada "atravessar" o terreno em alta velocidade).
// O mesmo passo é usado pela prévia pontilhada e pelo tiro real, então os dois sempre batem.
// Módulo puro: roda no navegador, nos testes e, no futuro, no servidor.

import { PHYSICS } from '../core/config.js';
import { degToRad } from '../core/math.js';

const SAMPLE_STEP = 3; // px entre verificações de colisão

/** Converte vento (-10..10) em aceleração horizontal para uma arma. */
export function windAcceleration(wind, weapon) {
  return (wind / PHYSICS.windScale) * PHYSICS.windMax * (weapon.windInfluence ?? 1);
}

/**
 * Estado inicial de um disparo.
 * @param {{x:number,y:number}} origin   boca do canhão
 * @param {number} angleDeg  ângulo acima da horizontal, relativo à direção
 * @param {number} facing    1 = direita, -1 = esquerda
 * @param {number} power     0..100
 */
export function launchState(origin, angleDeg, facing, power, weapon) {
  const speed = (power / 100) * PHYSICS.maxPower * (weapon.speed ?? 1);
  const a = degToRad(angleDeg);
  return {
    x: origin.x,
    y: origin.y,
    vx: Math.cos(a) * speed * facing,
    vy: -Math.sin(a) * speed,
    age: 0,
    armed: false,
  };
}

/** Ambiente físico de um disparo. */
export function makeEnv({ terrain, weapon, wind, targets = [], ownerId = null, world }) {
  return {
    terrain,
    targets,
    ownerId,
    gravity: PHYSICS.gravity * (weapon.weight ?? 1),
    windAx: windAcceleration(wind, weapon),
    bounds: world ?? { width: terrain.width, height: terrain.height },
  };
}

/** Hitbox simples de personagem (retângulo em volta do corpo). */
export function pointInTarget(t, x, y) {
  return x >= t.x - 11 && x <= t.x + 11 && y >= t.y - 62 && y <= t.y;
}

/**
 * Avança o projétil um passo e verifica colisões no caminho.
 * Muta `p`. Retorna null (segue voando) ou { type: 'terrain'|'target'|'out', x, y, target? }.
 */
export function stepProjectile(p, env, dt) {
  const x0 = p.x;
  const y0 = p.y;
  // Euler semi-implícito: estável e determinístico com passo fixo.
  p.vx += env.windAx * dt;
  p.vy += env.gravity * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.age += dt;

  const dist = Math.hypot(p.x - x0, p.y - y0);
  const n = Math.max(1, Math.ceil(dist / SAMPLE_STEP));
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const sx = x0 + (p.x - x0) * t;
    const sy = y0 + (p.y - y0) * t;

    // O projétil só pode acertar quem atirou depois de sair do corpo dele.
    if (!p.armed) {
      const owner = env.targets.find((c) => c.id === env.ownerId);
      if (!owner || !pointInTarget(owner, sx, sy)) p.armed = true;
    }
    for (const target of env.targets) {
      if (!target.alive) continue;
      if (target.id === env.ownerId && !p.armed) continue;
      if (pointInTarget(target, sx, sy)) return hit(p, 'target', sx, sy, target);
    }
    if (env.terrain.isSolid(sx, sy)) return hit(p, 'terrain', sx, sy);
  }

  const b = env.bounds;
  if (p.x < -300 || p.x > b.width + 300 || p.y > b.height + 100 || p.age > PHYSICS.maxFlightTime) {
    return { type: 'out', x: p.x, y: p.y };
  }
  return null;
}

function hit(p, type, x, y, target) {
  p.x = x;
  p.y = y;
  return { type, x, y, target };
}

/**
 * Simula a trajetória inteira (ou até `maxTime`) sem efeitos colaterais.
 * @returns {{ points: Array<{x,y}>, impact: object|null }}
 */
export function simulateTrajectory(start, env, { dt = PHYSICS.fixedDt, maxTime = PHYSICS.maxFlightTime } = {}) {
  const p = { ...start };
  const points = [{ x: p.x, y: p.y }];
  let impact = null;
  while (p.age < maxTime) {
    impact = stepProjectile(p, env, dt);
    points.push({ x: p.x, y: p.y });
    if (impact) break;
  }
  return { points, impact };
}
