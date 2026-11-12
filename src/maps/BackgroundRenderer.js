// Fundo em camadas com parallax: céu, sol/lua, montanhas/dunas/árvores e nuvens.
// Desenhado em coordenadas de tela; cada camada se move numa fração da câmera.

import { createRng, ValueNoise1D } from '../core/math.js';

export class BackgroundRenderer {
  constructor(mapDef, seed) {
    this.map = mapDef;
    const rng = createRng(seed ^ 0x51ed270b);
    this.noises = mapDef.layers.map(() => new ValueNoise1D(rng));
    this.stars = mapDef.sun.moon
      ? Array.from({ length: 70 }, () => ({ x: rng(), y: rng() * 0.6, r: rng() * 1.4 + 0.3, p: rng() * 6 }))
      : [];
    this.clouds = Array.from({ length: mapDef.clouds.count }, () => ({
      x: rng.range(-400, 3200),
      y: rng.range(0.05, 0.4),
      s: rng.range(0.6, 1.4),
      speed: rng.range(6, 18),
    }));
    this._skyCache = null;
  }

  update(dt) {
    for (const c of this.clouds) {
      c.x += c.speed * dt;
      if (c.x > 3400) c.x = -400;
    }
  }

  draw(ctx, camera, w, h, time) {
    const m = this.map;
    // Céu (gradiente em cache por tamanho de tela).
    if (!this._skyCache || this._skyCache.h !== h) {
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, m.sky[0]);
      g.addColorStop(0.55, m.sky[1]);
      g.addColorStop(1, m.sky[2]);
      this._skyCache = { g, h };
    }
    ctx.fillStyle = this._skyCache.g;
    ctx.fillRect(0, 0, w, h);

    // Estrelas (mapas noturnos).
    for (const s of this.stars) {
      ctx.globalAlpha = 0.5 + 0.5 * Math.sin(time * 1.5 + s.p);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x * w, s.y * h, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    // Sol ou lua com brilho.
    const sun = m.sun;
    const sx = sun.x * w - (camera.x - 1200) * 0.03;
    const sy = sun.y * h;
    const sr = sun.r * Math.max(0.7, h / 900);
    const glow = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3.2);
    glow.addColorStop(0, sun.glow);
    glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sx - sr * 3.2, sy - sr * 3.2, sr * 6.4, sr * 6.4);
    ctx.fillStyle = sun.color;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
    if (sun.moon) {
      ctx.fillStyle = 'rgba(160,170,220,0.35)';
      ctx.beginPath();
      ctx.arc(sx - sr * 0.3, sy - sr * 0.2, sr * 0.22, 0, Math.PI * 2);
      ctx.arc(sx + sr * 0.35, sy + sr * 0.3, sr * 0.15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nuvens distantes.
    this._drawClouds(ctx, camera, w, h, 0.08);

    // Camadas de relevo.
    const zoomL = Math.max(0.6, camera.zoom);
    const vy = (camera.y - 600) * 0.15;
    m.layers.forEach((layer, idx) => {
      const noise = this.noises[idx];
      const step = 8;
      const baseY = layer.base * h - vy * layer.factor * 2;
      const amp = layer.amp * (h / 900);
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.moveTo(0, h);
      const pts = [];
      for (let x = 0; x <= w + step; x += step) {
        const lx = ((x - w / 2) / zoomL + camera.x * layer.factor) * layer.freq;
        let n = noise.fbm(lx, 3);
        if (layer.peaks) n = 1 - Math.abs(n * 2 - 1); // picos pontudos
        const y = baseY - n * amp;
        pts.push([x, y]);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w + step, h);
      ctx.closePath();
      ctx.fill();

      if (layer.snowcap) {
        // Neve: recorta a silhueta da montanha e pinta tudo acima de uma linha ondulada.
        ctx.save();
        ctx.clip();
        ctx.fillStyle = 'rgba(255,255,255,0.88)';
        ctx.beginPath();
        const snowLine = baseY - amp * 0.62;
        ctx.moveTo(0, 0);
        for (let x = 0; x <= w + step; x += step) {
          const lx = ((x - w / 2) / zoomL + camera.x * layer.factor) * 0.05;
          ctx.lineTo(x, snowLine + Math.sin(lx) * 6 + Math.sin(lx * 2.7) * 4);
        }
        ctx.lineTo(w + step, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      if (layer.trees) {
        ctx.fillStyle = layer.color;
        for (let i = 0; i < pts.length; i += 3) {
          const [x, y] = pts[i];
          const th = 18 + ((i * 37) % 23);
          ctx.beginPath();
          ctx.moveTo(x - 9, y + 4);
          ctx.lineTo(x, y - th);
          ctx.lineTo(x + 9, y + 4);
          ctx.fill();
        }
      }
    });

    this._drawClouds(ctx, camera, w, h, 0.2, true);
  }

  _drawClouds(ctx, camera, w, h, factor, near = false) {
    ctx.fillStyle = this.map.clouds.color;
    this.clouds.forEach((c, i) => {
      if ((i % 2 === 0) !== near) return;
      const x = ((c.x - camera.x * factor) % (w + 600) + w + 600) % (w + 600) - 300;
      const y = c.y * h;
      const s = c.s * (near ? 1.2 : 0.8) * (h / 900);
      ctx.beginPath();
      ctx.ellipse(x, y, 60 * s, 18 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 35 * s, y + 4 * s, 34 * s, 14 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 30 * s, y - 8 * s, 38 * s, 20 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    });
  }
}

/** Fluido no fundo do mapa (mar, lava, névoa...), desenhado em coordenadas do mundo. */
export function drawFluid(ctx, fluid, level, world, time, view) {
  const x0 = Math.max(0, view.x0 - 20);
  const x1 = Math.min(world.width, view.x1 + 20);
  const g = ctx.createLinearGradient(0, level, 0, world.height);
  g.addColorStop(0, fluid.top);
  g.addColorStop(1, fluid.bottom);
  if (fluid.glow) {
    ctx.shadowColor = fluid.top;
    ctx.shadowBlur = 30;
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  // Vai bem além do fim do mundo para nunca sobrar fundo aparecendo embaixo.
  const bottom = Math.max(world.height, view.y1) + 200;
  ctx.moveTo(x0, bottom);
  for (let x = x0; x <= x1; x += 12) {
    ctx.lineTo(x, level + Math.sin(x * 0.02 + time * 1.6) * 5 + Math.sin(x * 0.007 - time) * 4);
  }
  ctx.lineTo(x1, bottom);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = fluid.foam;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = x0; x <= x1; x += 12) {
    const y = level + Math.sin(x * 0.02 + time * 1.6) * 5 + Math.sin(x * 0.007 - time) * 4;
    if (x === x0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
