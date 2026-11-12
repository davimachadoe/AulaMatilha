// Desenho de personagens por camadas (layer system).
// Origem = centro dos pés, olhando para a direita. Cada camada é uma função independente,
// registrada numa lista ordenada; itens futuros (asas, mascotes, armaduras) só adicionam camadas.

import { getOption } from './appearance.js';
import { degToRad } from '../core/math.js';

const OUTLINE = '#2b1d2e';
const HEAD_Y = -46;
const HEAD_R = 16;

const darken = (hex, k = 0.25) => {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * (1 - k));
  const g = Math.round(((n >> 8) & 255) * (1 - k));
  const b = Math.round((n & 255) * (1 - k));
  return `rgb(${r},${g},${b})`;
};

function fs(ctx, fill, build, lw = 2.2) {
  ctx.beginPath();
  build();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lw;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
}

/**
 * Camadas em ordem de desenho (de trás para frente).
 * Cada uma recebe (ctx, look, pose), onde `look` tem as cores já resolvidas.
 */
export const LAYERS = [
  { id: 'backAccessory', draw: drawBackAccessory },
  { id: 'hairBack', draw: drawHairBack },
  { id: 'backArm', draw: drawBackArm },
  { id: 'legs', draw: drawLegs },
  { id: 'torso', draw: drawTorso },
  { id: 'head', draw: drawHead },
  { id: 'face', draw: drawFace },
  { id: 'hairFront', draw: drawHairFront },
  { id: 'headwear', draw: drawHeadwear },
  { id: 'weaponArm', draw: drawWeaponArm },
];

/** Permite que sistemas futuros insiram camadas (ex.: asas, mascote, aura). */
export function registerLayer(layer, beforeId = null) {
  const idx = beforeId ? LAYERS.findIndex((l) => l.id === beforeId) : -1;
  if (idx >= 0) LAYERS.splice(idx, 0, layer);
  else LAYERS.push(layer);
}

/** Resolve ids de aparência em cores/estilos prontos para desenhar. */
export function resolveLook(appearance) {
  const top = getOption('top', appearance.top);
  return {
    skin: getOption('skin', appearance.skin).color,
    hair: getOption('hairColor', appearance.hairColor).color,
    hairStyle: appearance.hairStyle,
    eyes: appearance.eyes,
    eyeColor: getOption('eyeColor', appearance.eyeColor).color,
    mouth: appearance.mouth,
    top: top.color,
    topStyle: top.style,
    bottom: getOption('bottom', appearance.bottom).color,
    boots: getOption('boots', appearance.boots).color,
    headwear: appearance.headwear,
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} look   resultado de resolveLook()
 * @param {object} pose   { x, y, facing (1|-1), aim (graus), time, blink (0..1), state, scale }
 */
export function drawCharacter(ctx, look, pose) {
  ctx.save();
  ctx.translate(pose.x, pose.y);
  const s = pose.scale ?? 1;
  ctx.scale(s * (pose.facing < 0 ? -1 : 1), s);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Sombra no chão.
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(0, 1, 16, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const t = pose.time ?? 0;
  const p = {
    ...pose,
    bob: Math.sin(t * 2.6) * 1.2, // respiração
    aimRad: degToRad(pose.aim ?? 30),
  };
  if (pose.state === 'victory') p.bob = -Math.abs(Math.sin(t * 6)) * 8;
  if (pose.state === 'defeat') p.bob = 4;

  for (const layer of LAYERS) layer.draw(ctx, look, p);
  ctx.restore();
}

// ----------------------------------------------------------------- camadas

function drawBackAccessory() {
  // Reservado: asas e mochilas (Etapa 4).
}

function drawHairBack(ctx, look, p) {
  if (look.hairStyle !== 'long' && look.hairStyle !== 'bob') return;
  const y = HEAD_Y + p.bob;
  const len = look.hairStyle === 'long' ? 30 : 14;
  fs(ctx, darken(look.hair, 0.12), () => {
    ctx.moveTo(-HEAD_R + 1, y - 2);
    ctx.quadraticCurveTo(-HEAD_R - 4, y + len * 0.6, -HEAD_R + 2, y + len);
    ctx.lineTo(HEAD_R - 6, y + len - 2);
    ctx.quadraticCurveTo(HEAD_R - 2, y + 4, HEAD_R - 4, y - 4);
    ctx.closePath();
  });
}

function drawBackArm(ctx, look, p) {
  const y = -26 + p.bob;
  fs(ctx, darken(look.top, 0.15), () => ctx.roundRect(-11, y - 2, 7, 13, 3.5));
  fs(ctx, darken(look.skin, 0.1), () => ctx.arc(-7.5, y + 13, 3.6, 0, Math.PI * 2));
}

function drawLegs(ctx, look, p) {
  const walk = p.state === 'walk' ? Math.sin((p.time ?? 0) * 12) * 3 : 0;
  for (const [x, off] of [[-5, walk], [4, -walk]]) {
    fs(ctx, look.bottom, () => ctx.roundRect(x - 3.5 + off * 0.3, -15, 7.5, 12, 3));
    fs(ctx, look.boots, () => ctx.roundRect(x - 4 + off * 0.3, -6, 10.5, 6.5, [3, 4, 2, 2]));
  }
}

function drawTorso(ctx, look, p) {
  const y = -31 + p.bob;
  fs(ctx, look.top, () => ctx.roundRect(-10, y, 20, 19, 6));
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = OUTLINE;
  if (look.topStyle === 'jacket') {
    ctx.beginPath();
    ctx.moveTo(2, y + 1);
    ctx.lineTo(2, y + 18);
    ctx.stroke();
    ctx.fillStyle = '#f4f1ea';
    ctx.beginPath();
    ctx.moveTo(-1, y + 1);
    ctx.lineTo(5, y + 1);
    ctx.lineTo(2, y + 7);
    ctx.fill();
  } else if (look.topStyle === 'vest') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(-9, y + 9, 18, 3);
  } else {
    // Estampa simples na camiseta.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(2, y + 9, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cinto.
  fs(ctx, '#3a2a22', () => ctx.rect(-10, y + 15, 20, 4), 1.4);
  ctx.fillStyle = '#f5c542';
  ctx.fillRect(1, y + 15.5, 4, 3);
}

function drawHead(ctx, look, p) {
  const y = HEAD_Y + p.bob;
  // Orelha.
  fs(ctx, look.skin, () => ctx.ellipse(-8, y + 2, 4, 5, 0, 0, Math.PI * 2));
  fs(ctx, look.skin, () => ctx.arc(0, y, HEAD_R, 0, Math.PI * 2));
  // Bochecha rosada.
  ctx.fillStyle = 'rgba(255,110,120,0.3)';
  ctx.beginPath();
  ctx.ellipse(9, y + 7, 3.5, 2.2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawFace(ctx, look, p) {
  const y = HEAD_Y + p.bob;
  const blink = p.blink ?? 0;
  // Olhos acompanham a mira levemente.
  const lookX = Math.cos(p.aimRad) * 1.2;
  const lookY = -Math.sin(p.aimRad) * 1.4;
  const eyes = [
    [2.5, y + 1],
    [10.5, y + 1],
  ];
  const sad = p.state === 'defeat';

  for (const [ex, ey] of eyes) {
    if (blink > 0.5 || look.eyes === 'happy' || p.state === 'victory') {
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (look.eyes === 'happy' || p.state === 'victory') ctx.arc(ex, ey + 1, 2.8, Math.PI * 1.1, Math.PI * 1.9);
      else {
        ctx.moveTo(ex - 2.5, ey);
        ctx.lineTo(ex + 2.5, ey);
      }
      ctx.stroke();
      continue;
    }
    const h = look.eyes === 'sleepy' ? 2.4 : look.eyes === 'sharp' ? 3.4 : 4.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 3, h, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = OUTLINE;
    ctx.stroke();
    ctx.fillStyle = look.eyeColor;
    ctx.beginPath();
    ctx.ellipse(ex + lookX, ey + lookY * 0.5, 2, Math.min(h, 2.8), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(ex + lookX, ey + lookY * 0.5, 1.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(ex + lookX - 1.4, ey + lookY * 0.5 - 1.8, 1.2, 1.2);
    if (look.eyes === 'sleepy') {
      ctx.fillStyle = look.skin;
      ctx.fillRect(ex - 3.5, ey - h - 1, 7, h * 0.9);
      ctx.strokeStyle = OUTLINE;
      ctx.beginPath();
      ctx.moveTo(ex - 3, ey - h * 0.1);
      ctx.lineTo(ex + 3, ey - h * 0.1);
      ctx.stroke();
    }
  }

  // Sobrancelhas.
  ctx.strokeStyle = darken(look.hair, 0.35);
  ctx.lineWidth = 1.8;
  for (const [ex, ey] of eyes) {
    ctx.beginPath();
    const tilt = look.eyes === 'sharp' ? 1.5 : sad ? -1.5 : 0;
    ctx.moveTo(ex - 2.8, ey - 6 - (ex > 6 ? -tilt : tilt) * 0.5);
    ctx.lineTo(ex + 2.8, ey - 6 + (ex > 6 ? -tilt : tilt) * 0.5);
    ctx.stroke();
  }

  // Boca.
  const mx = 7;
  const my = y + 9;
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const mouth = sad ? 'sad' : p.state === 'victory' ? 'grin' : look.mouth;
  switch (mouth) {
    case 'grin':
      ctx.fillStyle = '#7a2230';
      ctx.moveTo(mx - 4, my - 1);
      ctx.quadraticCurveTo(mx, my + 5, mx + 4, my - 1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'open':
      ctx.fillStyle = '#7a2230';
      ctx.ellipse(mx, my + 1, 2, 2.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'neutral':
      ctx.moveTo(mx - 3, my + 1);
      ctx.lineTo(mx + 3, my + 1);
      ctx.stroke();
      break;
    case 'sad':
      ctx.arc(mx, my + 4, 3.2, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
      break;
    default:
      ctx.arc(mx, my - 1, 3.4, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
  }
}

function drawHairFront(ctx, look, p) {
  const y = HEAD_Y + p.bob;
  const c = look.hair;
  const r = HEAD_R;
  switch (look.hairStyle) {
    case 'spiky':
      fs(ctx, c, () => {
        ctx.moveTo(-r - 1, y + 2);
        const spikes = [
          [-r - 6, y - 8],
          [-r + 2, y - 10],
          [-10, y - r - 10],
          [-4, y - r - 3],
          [2, y - r - 12],
          [7, y - r - 3],
          [14, y - r - 8],
          [r - 1, y - 7],
          [r + 6, y - 4],
          [r - 2, y - 2],
          [6, y - 6],
          [2, y - 3],
          [-3, y - 7],
          [-7, y - 2],
        ];
        for (const [sx, sy] of spikes) ctx.lineTo(sx, sy);
        ctx.lineTo(-r + 4, y + 4);
        ctx.closePath();
      });
      break;
    case 'long':
    case 'bob':
      fs(ctx, c, () => {
        ctx.moveTo(-r - 1, y + (look.hairStyle === 'long' ? 16 : 8));
        ctx.quadraticCurveTo(-r - 3, y - r - 4, 2, y - r - 3);
        ctx.quadraticCurveTo(r + 3, y - r, r + 1, y - 3);
        ctx.quadraticCurveTo(8, y - 9, 4, y - 4);
        ctx.quadraticCurveTo(-2, y - 8, -6, y - 3);
        ctx.quadraticCurveTo(-9, y + 2, -10, y + 6);
        ctx.closePath();
      });
      break;
    case 'quiff':
      fs(ctx, c, () => {
        ctx.moveTo(-r, y + 1);
        ctx.quadraticCurveTo(-r - 2, y - r, -2, y - r - 2);
        ctx.quadraticCurveTo(10, y - r - 14, r + 8, y - r - 6);
        ctx.quadraticCurveTo(r + 2, y - 8, r - 2, y - 5);
        ctx.quadraticCurveTo(4, y - 6, -4, y - 4);
        ctx.quadraticCurveTo(-9, y - 2, -10, y + 3);
        ctx.closePath();
      });
      break;
    case 'buzz':
      fs(
        ctx,
        c,
        () => {
          ctx.arc(0, y, r + 0.5, Math.PI * 1.05, Math.PI * 1.95);
          ctx.quadraticCurveTo(4, y - 9, -r + 1, y - 3);
          ctx.closePath();
        },
        1.6,
      );
      break;
    default: // short
      fs(ctx, c, () => {
        ctx.moveTo(-r - 1, y + 3);
        ctx.quadraticCurveTo(-r - 2, y - r - 3, 2, y - r - 2);
        ctx.quadraticCurveTo(r + 2, y - r, r, y - 5);
        ctx.lineTo(10, y - 7);
        ctx.lineTo(7, y - 4);
        ctx.lineTo(3, y - 8);
        ctx.lineTo(-1, y - 4);
        ctx.lineTo(-5, y - 7);
        ctx.quadraticCurveTo(-9, y - 1, -10, y + 4);
        ctx.closePath();
      });
  }
}

function drawHeadwear(ctx, look, p) {
  const y = HEAD_Y + p.bob;
  const r = HEAD_R;
  switch (look.headwear) {
    case 'goggles':
      fs(ctx, '#5a3a28', () => ctx.rect(-r, y - 10, r * 2, 5), 1.6);
      for (const gx of [1, 11]) {
        fs(ctx, '#c8a24a', () => ctx.arc(gx, y - 8, 5, 0, Math.PI * 2), 1.8);
        ctx.fillStyle = '#7fd3ff';
        ctx.beginPath();
        ctx.arc(gx, y - 8, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(gx - 2, y - 10, 1.5, 1.5);
      }
      break;
    case 'cap':
      fs(ctx, '#e8484f', () => {
        ctx.arc(0, y - 4, r + 1, Math.PI, 0);
        ctx.closePath();
      });
      fs(ctx, '#c23a40', () => ctx.roundRect(4, y - 7, 20, 5, 2.5));
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-2, y - 12, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'bandana':
      fs(ctx, '#3f7fe8', () => ctx.roundRect(-r - 1, y - 11, r * 2 + 2, 7, 3));
      fs(ctx, '#3f7fe8', () => {
        ctx.moveTo(-r, y - 8);
        ctx.lineTo(-r - 10, y - 2 + Math.sin((p.time ?? 0) * 5) * 2);
        ctx.lineTo(-r - 7, y + 3 + Math.sin((p.time ?? 0) * 5 + 1) * 2);
        ctx.closePath();
      });
      ctx.fillStyle = '#fff';
      for (const dx of [-6, 2, 10]) ctx.fillRect(dx, y - 9, 2, 2);
      break;
    case 'helmet':
      fs(ctx, '#9aa7b8', () => {
        ctx.arc(0, y - 2, r + 2.5, Math.PI * 1.02, Math.PI * 1.98);
        ctx.closePath();
      });
      fs(ctx, '#7c899b', () => ctx.rect(-r - 3, y - 4, r * 2 + 6, 4), 1.6);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(-5, y - 12, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    default:
      break;
  }
}

function drawWeaponArm(ctx, look, p) {
  // Braço da frente segurando a arma, girado pelo ângulo de mira.
  const sx = 3;
  const sy = -25 + p.bob;
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(-p.aimRad);
  // Canhão básico (a Etapa 5 troca o desenho conforme a arma equipada).
  fs(ctx, '#56606e', () => ctx.roundRect(2, -5, 26, 10, 4));
  fs(ctx, '#3c434e', () => ctx.roundRect(24, -6.5, 7, 13, 2.5));
  fs(ctx, '#f5c542', () => ctx.rect(10, -5, 4, 10), 1.4);
  fs(ctx, look.top, () => ctx.roundRect(-3, -4, 11, 8, 4));
  fs(ctx, look.skin, () => ctx.arc(10, 4, 3.8, 0, Math.PI * 2));
  ctx.restore();
}
