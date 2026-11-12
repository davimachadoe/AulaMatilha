// Elementos decorativos plantados na superfície das ilhas (árvores, pedras, cristais...).
// Desenhados antes do terreno, com a base "enterrada" alguns pixels no chão.
// Na Etapa 3, decorações sem chão embaixo (após explosões) serão removidas via `pruneUnsupported`.

import { createRng } from '../core/math.js';

const OUTLINE = '#2b1d22';

export function placeDecorations(terrain, islands, mapDef, seed) {
  const rng = createRng(seed ^ 0x2545f491);
  const list = [];
  for (const isl of islands) {
    let x = isl.x0 + rng.range(20, 60);
    while (x < isl.x1 - 20) {
      const y = terrain.surfaceY(Math.round(x));
      if (y > 0) {
        list.push({
          x: Math.round(x),
          y,
          type: rng.pick(mapDef.decor),
          scale: rng.range(0.75, 1.25),
          flip: rng.chance(0.5),
          seed: rng.int(0, 1e6),
        });
      }
      x += rng.range(mapDef.decorDensity[0], mapDef.decorDensity[1]);
    }
  }
  return list;
}

/** Remove decorações cujo ponto de apoio virou ar. */
export function pruneUnsupported(terrain, decorations) {
  return decorations.filter((d) => terrain.isSolid(d.x, d.y + 2) || terrain.isSolid(d.x, d.y + 6));
}

export function drawDecorations(ctx, decorations, time, view) {
  for (const d of decorations) {
    if (d.x < view.x0 - 150 || d.x > view.x1 + 150) continue;
    const fn = DRAWERS[d.type];
    if (!fn) continue;
    ctx.save();
    ctx.translate(d.x, d.y + 5);
    ctx.scale(d.flip ? -d.scale : d.scale, d.scale);
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = OUTLINE;
    fn(ctx, time, d.seed);
    ctx.restore();
  }
}

function shape(ctx, fill, build) {
  ctx.beginPath();
  build();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.stroke();
}

const DRAWERS = {
  palm(ctx, t, seed) {
    const sway = Math.sin(t * 1.2 + seed) * 3;
    shape(ctx, '#a8703f', () => {
      ctx.moveTo(-6, 0);
      ctx.quadraticCurveTo(-4, -50, 6 + sway, -95);
      ctx.lineTo(12 + sway, -93);
      ctx.quadraticCurveTo(6, -50, 6, 0);
      ctx.closePath();
    });
    ctx.strokeStyle = 'rgba(80,45,20,0.6)';
    for (let i = 1; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(-5 + i * 0.6, -i * 13);
      ctx.lineTo(6 + i * 0.6, -i * 13 - 2);
      ctx.stroke();
    }
    ctx.strokeStyle = OUTLINE;
    const cx = 9 + sway;
    const cy = -96;
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI + (i / 5) * Math.PI + Math.sin(t * 1.5 + i + seed) * 0.05;
      const len = 46;
      shape(ctx, i % 2 ? '#3fae4a' : '#5cc95a', () => {
        ctx.moveTo(cx, cy);
        ctx.quadraticCurveTo(
          cx + Math.cos(a - 0.3) * len * 0.6,
          cy + Math.sin(a - 0.3) * len * 0.6 - 12,
          cx + Math.cos(a) * len,
          cy + Math.sin(a) * len + 14,
        );
        ctx.quadraticCurveTo(cx + Math.cos(a + 0.25) * len * 0.5, cy + Math.sin(a + 0.25) * len * 0.5, cx, cy);
      });
    }
    shape(ctx, '#7a4b25', () => {
      ctx.arc(cx - 4, cy + 4, 5, 0, Math.PI * 2);
    });
    shape(ctx, '#7a4b25', () => {
      ctx.arc(cx + 5, cy + 5, 5, 0, Math.PI * 2);
    });
  },
  bush(ctx) {
    shape(ctx, '#46a83f', () => {
      ctx.arc(-12, -8, 11, 0, Math.PI * 2);
      ctx.arc(12, -8, 11, 0, Math.PI * 2);
      ctx.arc(0, -16, 14, 0, Math.PI * 2);
    });
    ctx.fillStyle = '#ff6b8a';
    for (const [x, y] of [[-8, -14], [6, -20], [12, -8]]) {
      ctx.beginPath();
      ctx.arc(x, y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  flower(ctx, t, seed) {
    const sway = Math.sin(t * 2 + seed) * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(2, -10, sway, -20);
    ctx.strokeStyle = '#3c8a35';
    ctx.lineWidth = 2.5;
    ctx.stroke();
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 1.5;
    const colors = ['#ff7eb6', '#ffd23f', '#ff8f4d', '#c58bff'];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      shape(ctx, colors[seed % colors.length], () => {
        ctx.arc(sway + Math.cos(a) * 5, -20 + Math.sin(a) * 5, 4, 0, Math.PI * 2);
      });
    }
    shape(ctx, '#ffe066', () => ctx.arc(sway, -20, 3, 0, Math.PI * 2));
  },
  rock(ctx) {
    shape(ctx, '#9c9387', () => {
      ctx.moveTo(-18, 2);
      ctx.lineTo(-14, -12);
      ctx.lineTo(-2, -20);
      ctx.lineTo(12, -15);
      ctx.lineTo(18, 2);
      ctx.closePath();
    });
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.moveTo(-12, -11);
    ctx.lineTo(-2, -17);
    ctx.lineTo(-4, -10);
    ctx.fill();
  },
  lavaRock(ctx, t, seed) {
    shape(ctx, '#3a2a2a', () => {
      ctx.moveTo(-20, 2);
      ctx.lineTo(-15, -18);
      ctx.lineTo(-4, -28);
      ctx.lineTo(8, -22);
      ctx.lineTo(20, 2);
      ctx.closePath();
    });
    const pulse = 0.6 + 0.4 * Math.sin(t * 3 + seed);
    ctx.strokeStyle = `rgba(255,${120 + pulse * 80},40,${pulse})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-6, -14);
    ctx.lineTo(-1, -20);
    ctx.moveTo(-6, -14);
    ctx.lineTo(4, -12);
    ctx.stroke();
  },
  deadTree(ctx) {
    ctx.lineCap = 'round';
    const branch = (x0, y0, x1, y1, w) => {
      ctx.lineWidth = w + 3;
      ctx.strokeStyle = OUTLINE;
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
      ctx.lineWidth = w;
      ctx.strokeStyle = '#4a3530';
      ctx.stroke();
    };
    branch(0, 4, 2, -60, 7);
    branch(1, -30, -18, -48, 4);
    branch(2, -45, 18, -62, 4);
    branch(-12, -42, -16, -58, 3);
  },
  vent(ctx, t, seed) {
    shape(ctx, '#2e2020', () => {
      ctx.moveTo(-14, 2);
      ctx.lineTo(-7, -12);
      ctx.lineTo(7, -12);
      ctx.lineTo(14, 2);
      ctx.closePath();
    });
    for (let i = 0; i < 4; i++) {
      const p = ((t * 0.5 + i / 4 + seed * 0.001) % 1);
      ctx.fillStyle = `rgba(90,80,80,${0.5 * (1 - p)})`;
      ctx.beginPath();
      ctx.arc(Math.sin(p * 6 + i) * 6, -14 - p * 60, 5 + p * 12, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  mysticTree(ctx, t, seed) {
    shape(ctx, '#4b3a6e', () => {
      ctx.moveTo(-8, 2);
      ctx.bezierCurveTo(-6, -30, -14, -50, -4, -70);
      ctx.lineTo(6, -70);
      ctx.bezierCurveTo(12, -50, 6, -30, 8, 2);
      ctx.closePath();
    });
    const glow = 0.5 + 0.5 * Math.sin(t * 1.3 + seed);
    shape(ctx, '#3fa88f', () => {
      ctx.arc(-20, -78, 20, 0, Math.PI * 2);
      ctx.arc(18, -80, 22, 0, Math.PI * 2);
      ctx.arc(0, -98, 26, 0, Math.PI * 2);
    });
    ctx.fillStyle = `rgba(160,255,240,${0.35 + glow * 0.4})`;
    for (const [x, y] of [[-14, -86], [10, -100], [20, -76], [-2, -112]]) {
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  mushroom(ctx, t, seed) {
    shape(ctx, '#efe6d8', () => {
      ctx.moveTo(-4, 2);
      ctx.lineTo(-3, -14);
      ctx.lineTo(3, -14);
      ctx.lineTo(4, 2);
      ctx.closePath();
    });
    const glow = 0.6 + 0.4 * Math.sin(t * 2 + seed);
    ctx.shadowColor = '#9ff7ff';
    ctx.shadowBlur = 10 * glow;
    shape(ctx, seed % 2 ? '#5fd3e8' : '#d77bff', () => {
      ctx.ellipse(0, -15, 13, 9, 0, Math.PI, 0);
      ctx.closePath();
    });
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath();
    ctx.arc(-5, -19, 2, 0, Math.PI * 2);
    ctx.arc(4, -21, 1.6, 0, Math.PI * 2);
    ctx.fill();
  },
  crystal(ctx, t, seed) {
    const glow = 0.5 + 0.5 * Math.sin(t * 2.2 + seed);
    ctx.shadowColor = '#9ff7ff';
    ctx.shadowBlur = 14 * glow;
    const shard = (x, h, w, c) =>
      shape(ctx, c, () => {
        ctx.moveTo(x - w, 2);
        ctx.lineTo(x - w * 0.8, -h * 0.7);
        ctx.lineTo(x, -h);
        ctx.lineTo(x + w * 0.8, -h * 0.7);
        ctx.lineTo(x + w, 2);
        ctx.closePath();
      });
    shard(-9, 22, 6, '#8fe9ff');
    shard(8, 18, 5, '#b9a2ff');
    shard(0, 34, 8, '#a8f3ff');
    ctx.shadowBlur = 0;
  },
  cactus(ctx) {
    const green = '#4fae5a';
    shape(ctx, green, () => {
      ctx.roundRect(-7, -58, 14, 60, 7);
    });
    shape(ctx, green, () => {
      ctx.roundRect(-22, -40, 9, 22, 4.5);
    });
    shape(ctx, green, () => {
      ctx.roundRect(-20, -24, 14, 8, 4);
    });
    shape(ctx, green, () => {
      ctx.roundRect(13, -48, 9, 24, 4.5);
    });
    shape(ctx, green, () => {
      ctx.roundRect(6, -30, 14, 8, 4);
    });
    ctx.strokeStyle = 'rgba(30,80,35,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(0, -2);
    ctx.stroke();
  },
  ruin(ctx) {
    shape(ctx, '#d9b98a', () => {
      ctx.rect(-14, -46, 12, 48);
    });
    shape(ctx, '#d9b98a', () => {
      ctx.moveTo(6, 2);
      ctx.lineTo(6, -26);
      ctx.lineTo(12, -30);
      ctx.lineTo(18, -24);
      ctx.lineTo(18, 2);
      ctx.closePath();
    });
    shape(ctx, '#c9a272', () => {
      ctx.rect(-18, -52, 20, 7);
    });
  },
  pine(ctx, t, seed) {
    shape(ctx, '#6b4a33', () => ctx.rect(-4, -14, 8, 16));
    const tiers = [
      [-14, 26, 26],
      [-34, 21, 22],
      [-52, 15, 18],
    ];
    for (const [y, w, h] of tiers) {
      shape(ctx, '#2f7a5a', () => {
        ctx.moveTo(-w, y);
        ctx.lineTo(0, y - h - 8);
        ctx.lineTo(w, y);
        ctx.closePath();
      });
      shape(ctx, '#f4fbff', () => {
        ctx.moveTo(-w * 0.5, y - h * 0.55);
        ctx.lineTo(0, y - h - 8);
        ctx.lineTo(w * 0.5, y - h * 0.55);
        ctx.quadraticCurveTo(0, y - h * 0.35, -w * 0.5, y - h * 0.55);
      });
    }
  },
  iceCrystal(ctx, t, seed) {
    DRAWERS.crystal(ctx, t, seed);
  },
  snowRock(ctx) {
    DRAWERS.rock(ctx);
    shape(ctx, '#ffffff', () => {
      ctx.moveTo(-14, -12);
      ctx.lineTo(-2, -20);
      ctx.lineTo(12, -15);
      ctx.quadraticCurveTo(0, -10, -14, -12);
    });
  },
};
