// Gravidade de personagens: se o chão some (cratera), o personagem cai.
// Cair abaixo do nível do fluido elimina o personagem.
// A Etapa 3 acrescenta caminhada, subida de rampas e dano de queda usando estas mesmas funções.

import { PHYSICS, WORLD } from '../core/config.js';

const FOOT_HALF_WIDTH = 5;

/** Há chão sob os pés (linha y, entre x-5 e x+5)? */
export function hasGround(terrain, x, y) {
  for (let dx = -FOOT_HALF_WIDTH; dx <= FOOT_HALF_WIDTH; dx += 2) {
    if (terrain.isSolid(x + dx, y)) return true;
  }
  return false;
}

/**
 * Atualiza a queda de um personagem.
 * @returns {'idle'|'falling'|'landed'|'eliminated'}
 */
export function updateCharacterPhysics(c, terrain, dt) {
  if (!c.alive) return 'idle';
  if (hasGround(terrain, c.x, c.y)) {
    const wasFalling = c.vy > 0;
    c.vy = 0;
    return wasFalling ? 'landed' : 'idle';
  }
  c.vy = Math.min(c.vy + PHYSICS.characterGravity * dt, 1600);
  // Desce pixel a pixel para pousar exatamente na superfície.
  let remaining = c.vy * dt;
  while (remaining > 0) {
    const step = Math.min(1, remaining);
    c.y += step;
    remaining -= step;
    if (hasGround(terrain, c.x, Math.ceil(c.y))) {
      c.y = Math.ceil(c.y);
      c.vy = 0;
      return 'landed';
    }
  }
  if (c.y > WORLD.fluidLevel + 20) {
    c.alive = false;
    c.vy = 0;
    return 'eliminated';
  }
  return 'falling';
}

/** Procura chão perto de x (para reposicionar alguém), varrendo para os lados. */
export function findGroundNear(terrain, x, maxDist = 600) {
  for (let d = 0; d <= maxDist; d += 6) {
    for (const sx of [x + d, x - d]) {
      const y = terrain.surfaceY(Math.round(sx));
      if (y > 0 && y < WORLD.fluidLevel - 30 && hasGround(terrain, Math.round(sx), y)) {
        return { x: Math.round(sx), y };
      }
    }
  }
  return null;
}
