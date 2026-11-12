// Explosões: cratera no terreno, dano em área e efeitos visuais.

import { explosionDamage, distanceToBody } from './damage.js';

/**
 * Aplica a explosão no mundo.
 * @returns {Array<{target, damage, direct:boolean}>}
 */
export function applyExplosion({ map, characters, x, y, weapon, directTarget = null }) {
  map.carve(x, y, weapon.craterRadius);
  const hits = [];
  for (const c of characters) {
    if (!c.alive) continue;
    const direct = c === directTarget;
    const distance = direct ? 0 : distanceToBody(c, x, y);
    const damage = explosionDamage({
      base: weapon.damage,
      radius: weapon.radius,
      distance,
      direct,
      directBonus: weapon.directHitBonus,
    });
    if (damage > 0) hits.push({ target: c, damage, direct });
  }
  return hits;
}

/** Efeitos visuais: clarão, onda de choque, fogo, fumaça e pedaços do terreno. */
export function spawnExplosionFx(particles, x, y, weapon, palette) {
  const r = weapon.radius;
  particles.spawn({ x, y, life: 0.18, size: r * 0.9, color: 'rgba(255,250,220,0.95)', glow: true, fade: false, grow: -r * 2 });
  particles.spawn({ x, y, life: 0.45, size: r * 0.3, color: 'rgba(255,255,255,0.9)', shape: 'ring', grow: r * 3.2 });

  for (let i = 0; i < 26; i++) {
    const a = Math.random() * Math.PI * 2;
    const s = 80 + Math.random() * 260;
    particles.spawn({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 60,
      life: 0.35 + Math.random() * 0.35,
      size: 4 + Math.random() * 6,
      color: ['#fff3b0', '#ffd23f', '#ff9a2f', '#ff5a2a'][i % 4],
      drag: 4,
      glow: true,
      grow: -6,
    });
  }
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    particles.spawn({
      x: x + Math.cos(a) * r * 0.3,
      y: y + Math.sin(a) * r * 0.3,
      vx: Math.cos(a) * 40,
      vy: -30 - Math.random() * 50,
      life: 1.2 + Math.random() * 0.8,
      size: 8 + Math.random() * 8,
      color: 'rgba(90,85,95,0.55)',
      drag: 1.5,
      grow: 14,
    });
  }
  const debris = [palette.top, palette.soil, palette.soilDark, palette.outline];
  for (let i = 0; i < 20; i++) {
    const a = -Math.PI * Math.random();
    const s = 150 + Math.random() * 300;
    particles.spawn({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.9 + Math.random() * 0.6,
      size: 1.5 + Math.random() * 2.5,
      color: debris[i % debris.length],
      gravity: 900,
      shape: 'rect',
      spin: 10,
      fade: false,
    });
  }
}

/** Respingo ao cair no fluido do mapa. */
export function spawnSplashFx(particles, x, y, fluid) {
  for (let i = 0; i < 24; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.6;
    const s = 150 + Math.random() * 250;
    particles.spawn({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: 0.8 + Math.random() * 0.4,
      size: 2 + Math.random() * 3,
      color: i % 2 ? fluid.top : fluid.foam,
      gravity: 900,
      glow: Boolean(fluid.glow),
    });
  }
}
