// Gera ilhas flutuantes procedurais (com curvas naturais) a partir de uma semente.
// Mesma semente + mesmo mapa = mesmo terreno (importante para multiplayer na Etapa 8).

import { createRng, ValueNoise1D, smoothstep, clamp } from '../core/math.js';
import { WORLD } from '../core/config.js';

/**
 * @param {import('./Terrain.js').Terrain} terrain
 * @param {object} mapDef  definição do mapa (src/maps/maps.js)
 * @param {number} seed
 * @returns {{ islands: Array<{x0:number,x1:number,baseTop:number}>, seed:number }}
 */
export function generateTerrain(terrain, mapDef, seed) {
  const rng = createRng(seed);
  const noise = new ValueNoise1D(rng);
  const detail = new ValueNoise1D(rng);
  const cfg = mapDef.terrain;
  const W = terrain.width;
  const H = terrain.height;

  terrain.mask.fill(0);

  // Divide a largura em ilhas separadas por vãos (abismos).
  const count = rng.int(cfg.islands[0], cfg.islands[1]);
  const margin = cfg.margin;
  const gaps = [];
  for (let i = 0; i < count - 1; i++) gaps.push(rng.range(cfg.gap[0], cfg.gap[1]));
  const usable = W - margin * 2 - gaps.reduce((a, b) => a + b, 0);
  const weights = Array.from({ length: count }, () => rng.range(0.7, 1.3));
  const wSum = weights.reduce((a, b) => a + b, 0);

  const islands = [];
  let cursor = margin;
  for (let i = 0; i < count; i++) {
    const width = (usable * weights[i]) / wSum;
    const x0 = Math.round(cursor);
    const x1 = Math.round(cursor + width);
    const baseTop = H * cfg.baseLevel + rng.range(-cfg.heightJitter, cfg.heightJitter);
    const thickness = rng.range(cfg.thickness[0], cfg.thickness[1]);
    islands.push({ x0, x1, baseTop, thickness });
    cursor += width + (gaps[i] ?? 0);
  }

  const minTop = WORLD.skyMargin;
  for (const isl of islands) {
    const span = isl.x1 - isl.x0;
    for (let x = isl.x0; x <= isl.x1; x++) {
      const t = (x - isl.x0) / span;
      const edge = Math.min(t, 1 - t);
      // Bordas arredondadas: o topo desce perto das pontas da ilha.
      const edgeShape = smoothstep(0, cfg.edgeSoftness, edge);
      let top =
        isl.baseTop +
        (noise.fbm(x * cfg.frequency, 4) - 0.5) * 2 * cfg.amplitude +
        (detail.fbm(x * cfg.frequency * 6, 2) - 0.5) * cfg.amplitude * 0.15 +
        (1 - edgeShape) * cfg.edgeDrop;
      top = clamp(top, minTop, WORLD.fluidLevel - 60);

      // Parte de baixo em formato de "cenoura" (ilha flutuante), com irregularidade.
      const belly = Math.pow(Math.sin(Math.PI * t), 0.55);
      const rough = 0.75 + detail.fbm(x * 0.02 + 100, 3) * 0.5;
      let bottom = top + 8 + isl.thickness * belly * rough;
      bottom = Math.min(bottom, WORLD.fluidLevel + 40);
      if (bottom - top < 6) continue;
      terrain.fillColumn(x, top, bottom);
    }
  }

  terrain.markAllDirty();
  return { islands, seed };
}

/**
 * Encontra pontos de nascimento em chão firme, espalhados pelo mapa.
 * @returns {Array<{x:number,y:number}>}
 */
export function findSpawnPoints(terrain, islands, count, seed) {
  const rng = createRng(seed ^ 0x9e3779b9);
  const points = [];
  // Distribui jogadores da esquerda para a direita em faixas iguais do mapa.
  for (let i = 0; i < count; i++) {
    const bandStart = (terrain.width * i) / count;
    const bandEnd = (terrain.width * (i + 1)) / count;
    const candidates = islands.filter((isl) => isl.x1 > bandStart && isl.x0 < bandEnd);
    let placed = null;
    for (let attempt = 0; attempt < 40 && !placed; attempt++) {
      const isl = candidates.length ? rng.pick(candidates) : rng.pick(islands);
      const lo = Math.max(isl.x0 + (isl.x1 - isl.x0) * 0.2, bandStart + 40);
      const hi = Math.min(isl.x1 - (isl.x1 - isl.x0) * 0.2, bandEnd - 40);
      if (hi <= lo) continue;
      const x = Math.round(rng.range(lo, hi));
      const y = terrain.surfaceY(x);
      if (y > 0 && y < WORLD.fluidLevel - 40) placed = { x, y };
    }
    if (!placed) {
      // Fallback: centro da maior ilha.
      const big = islands.reduce((a, b) => (b.x1 - b.x0 > a.x1 - a.x0 ? b : a));
      const x = Math.round((big.x0 + big.x1) / 2 + (i - count / 2) * 30);
      placed = { x, y: terrain.surfaceY(x) };
    }
    points.push(placed);
  }
  return points;
}
