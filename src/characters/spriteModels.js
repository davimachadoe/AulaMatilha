// Modelos ilustrados (imagens PNG) usados como personagem.
// A imagem é carregada uma vez, o fundo branco é removido automaticamente e o resultado é
// recortado e reduzido para desenhar rápido. A animação (respirar, pular, tremer) é feita por código.

export const SPRITE_MODELS = {
  'goggles-boy': {
    label: 'Ilustrado: Herói dos Óculos',
    src: 'assets/characters/goggles-boy.png',
    height: 72, // altura no mundo (px)
    hand: '#f8d2b8', // cor da mão que segura a arma
    sleeve: '#d83a3a',
  },
};

const cache = new Map(); // id -> { canvas, status }

const canUseDom = () => typeof document !== 'undefined' && typeof Image !== 'undefined';

/** Retorna o canvas pronto do modelo, ou null se ainda está carregando. */
export function getSpriteImage(id) {
  const entry = cache.get(id);
  if (entry) return entry.canvas;
  loadSprite(id);
  return null;
}

export function loadSprite(id) {
  if (!canUseDom() || cache.has(id)) return;
  const model = SPRITE_MODELS[id];
  if (!model) return;
  const entry = { canvas: null };
  cache.set(id, entry);
  const img = new Image();
  img.onload = () => {
    try {
      entry.canvas = prepare(img, 320);
    } catch (err) {
      console.error(`[Sprite] falha ao preparar ${id}`, err);
    }
  };
  img.onerror = () => console.error(`[Sprite] imagem não encontrada: ${model.src}`);
  img.src = model.src;
}

/** Remove fundo claro ligado às bordas, recorta e reduz para `targetH` de altura. */
function prepare(img, targetH) {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;

  // Fundo = pixel quase branco e sem cor, conectado à borda (flood fill).
  const isBg = (i) => {
    const r = px[i];
    const g = px[i + 1];
    const b = px[i + 2];
    return Math.min(r, g, b) > 222 && Math.max(r, g, b) - Math.min(r, g, b) < 24;
  };
  const seen = new Uint8Array(w * h);
  const stack = [];
  for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);
  while (stack.length) {
    const p = stack.pop();
    if (seen[p]) continue;
    if (!isBg(p * 4)) continue;
    seen[p] = 1;
    px[p * 4 + 3] = 0;
    const x = p % w;
    const y = (p / w) | 0;
    if (x > 0) stack.push(p - 1);
    if (x < w - 1) stack.push(p + 1);
    if (y > 0) stack.push(p - w);
    if (y < h - 1) stack.push(p + w);
  }

  // Suaviza a borda: pixels claros encostados no fundo ficam semitransparentes.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const p = y * w + x;
      if (seen[p]) continue;
      if (!(seen[p - 1] || seen[p + 1] || seen[p - w] || seen[p + w])) continue;
      const i = p * 4;
      const light = Math.min(px[i], px[i + 1], px[i + 2]);
      if (light > 170) px[i + 3] = Math.round(255 * (1 - (light - 170) / 85));
    }
  }

  // Caixa do personagem (pixels visíveis).
  let x0 = w;
  let y0 = h;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (px[(y * w + x) * 4 + 3] > 20) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  ctx.putImageData(data, 0, 0);

  const cw = x1 - x0 + 1;
  const ch = y1 - y0 + 1;
  const scale = Math.min(1, targetH / ch);
  const out = document.createElement('canvas');
  out.width = Math.round(cw * scale);
  out.height = Math.round(ch * scale);
  const octx = out.getContext('2d');
  octx.imageSmoothingQuality = 'high';
  octx.drawImage(c, x0, y0, cw, ch, 0, 0, out.width, out.height);
  return out;
}
