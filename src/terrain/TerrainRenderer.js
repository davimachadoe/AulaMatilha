// Desenha a máscara do terreno num canvas fora da tela, com textura procedural:
// grama/neve no topo, camadas de solo, contorno cartoon e sombra embaixo.
// Atualiza só as regiões alteradas (crateras) a cada frame.

import { hash2, clamp } from '../core/math.js';

const hexToRgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

export class TerrainRenderer {
  constructor(terrain, palette, seed = 0) {
    this.terrain = terrain;
    this.seed = seed;
    this.canvas = document.createElement('canvas');
    this.canvas.width = terrain.width;
    this.canvas.height = terrain.height;
    this.ctx = this.canvas.getContext('2d');
    this.image = this.ctx.createImageData(terrain.width, terrain.height);
    this.setPalette(palette);
  }

  setPalette(p) {
    this.pal = {
      top: hexToRgb(p.top),
      topDark: hexToRgb(p.topDark),
      soil: hexToRgb(p.soil),
      soilDark: hexToRgb(p.soilDark),
      outline: hexToRgb(p.outline),
      speck: hexToRgb(p.speck),
      topDepth: p.topDepth ?? 10,
      glow: p.glow ? hexToRgb(p.glow) : null,
    };
  }

  /** Processa regiões sujas do terreno. Chamar uma vez por frame. */
  sync() {
    const regions = this.terrain.consumeDirty();
    for (const r of regions) this._paintRegion(r.x0 - 2, r.y0 - 2, r.x1 + 2, r.y1 + 2);
  }

  _paintRegion(x0, y0, x1, y1) {
    const T = this.terrain;
    x0 = clamp(x0 | 0, 0, T.width - 1);
    x1 = clamp(x1 | 0, 0, T.width - 1);
    y0 = clamp(y0 | 0, 0, T.height - 1);
    y1 = clamp(y1 | 0, 0, T.height - 1);
    const W = T.width;
    const mask = T.mask;
    const data = this.image.data;
    const pal = this.pal;
    const topDepth = pal.topDepth;
    const lookBack = 40; // pixels acima da região para calcular a profundidade

    for (let x = x0; x <= x1; x++) {
      // Profundidade = quantos pixels sólidos seguidos desde o último ar acima.
      let depth = 0;
      for (let y = Math.max(0, y0 - lookBack); y < y0; y++) {
        depth = mask[y * W + x] ? depth + 1 : 0;
      }
      for (let y = y0; y <= y1; y++) {
        const i = y * W + x;
        const o = i * 4;
        if (!mask[i]) {
          depth = 0;
          data[o + 3] = 0;
          continue;
        }
        depth++;
        const n = hash2(x, y, this.seed);
        const n2 = hash2(x >> 2, y >> 2, this.seed + 7);
        let c;

        const airL = x > 0 && !mask[i - 1];
        const airR = x < W - 1 && !mask[i + 1];
        const airD = y < T.height - 1 && !mask[i + W];
        const airU = depth === 1;

        if (airU || airL || airR || airD) {
          c = pal.outline;
        } else if (depth <= topDepth) {
          // Camada superior (grama, neve, areia...) com borda ondulada.
          const wave = topDepth * (0.6 + 0.4 * hash2(x >> 3, 0, this.seed + 3));
          if (depth <= wave) {
            c = depth <= 3 ? mix(pal.top, [255, 255, 255], 0.18) : pal.top;
          } else {
            c = pal.topDark;
          }
        } else {
          // Solo: escurece com a profundidade, tem camadas onduladas e pedrinhas.
          const k = clamp((depth - topDepth) / 220, 0, 1);
          const band = Math.sin((y + Math.sin(x * 0.02 + this.seed) * 10) * 0.07) > 0.55 ? 0.12 : 0;
          c = mix(pal.soil, pal.soilDark, Math.min(1, k * 0.85 + band + n2 * 0.05));
          const pebble = this._pebble(x, y);
          if (pebble) c = pebble === 2 ? mix(pal.speck, pal.outline, 0.35) : pal.speck;
          else if (pal.glow && this._pebble(x + 5000, y, 0.95)) c = pal.glow;
          // Sombra perto do fundo da ilha.
          let below = 0;
          for (let k2 = 1; k2 <= 6; k2++) {
            if (y + k2 < T.height && !mask[i + W * k2]) {
              below = 7 - k2;
              break;
            }
          }
          if (below) c = mix(c, pal.outline, below * 0.06);
        }
        const v = (n - 0.5) * 8;
        data[o] = clamp(c[0] + v, 0, 255);
        data[o + 1] = clamp(c[1] + v, 0, 255);
        data[o + 2] = clamp(c[2] + v, 0, 255);
        data[o + 3] = 255;
      }
    }
    this.ctx.putImageData(this.image, 0, 0, x0, y0, x1 - x0 + 1, y1 - y0 + 1);
  }

  /** Pedrinhas: células de 14px; algumas têm uma pedra oval. 0 = nada, 1 = pedra, 2 = sombra. */
  _pebble(x, y, threshold = 0.82) {
    const cell = 14;
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    const h = hash2(cx, cy, this.seed + 11);
    if (h < threshold) return 0;
    const px = cx * cell + 3 + hash2(cx, cy, this.seed + 12) * 8;
    const py = cy * cell + 3 + hash2(cx, cy, this.seed + 13) * 8;
    const r = 1.6 + hash2(cx, cy, this.seed + 14) * 2.2;
    const dx = (x - px) / (r * 1.4);
    const dy = (y - py) / r;
    const d = dx * dx + dy * dy;
    if (d > 1) return 0;
    return dy > 0.45 ? 2 : 1;
  }

  draw(ctx) {
    ctx.drawImage(this.canvas, 0, 0);
  }
}

function mix(a, b, t) {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
