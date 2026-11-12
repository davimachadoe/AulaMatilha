// Terreno como máscara de bits (1 byte por pixel): 1 = sólido, 0 = ar.
// Estrutura pensada para destruição em tempo real: cada alteração marca uma região "suja"
// que o TerrainRenderer redesenha sem refazer o mapa inteiro.
// Módulo puro (sem DOM) para rodar também no servidor/testes.

export class Terrain {
  constructor(width, height) {
    this.width = width;
    this.height = height;
    this.mask = new Uint8Array(width * height);
    this.dirty = [];
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  isSolid(x, y) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return false;
    return this.mask[y * this.width + x] === 1;
  }

  setSolid(x, y, solid) {
    if (!this.inBounds(x, y)) return;
    this.mask[(y | 0) * this.width + (x | 0)] = solid ? 1 : 0;
  }

  /** Preenche a coluna x de y0 até y1 (inclusive). */
  fillColumn(x, y0, y1) {
    if (x < 0 || x >= this.width) return;
    const a = Math.max(0, Math.floor(y0));
    const b = Math.min(this.height - 1, Math.floor(y1));
    for (let y = a; y <= b; y++) this.mask[y * this.width + x] = 1;
  }

  /** Primeiro pixel sólido a partir de `fromY` descendo. Retorna -1 se não houver chão. */
  surfaceY(x, fromY = 0) {
    x |= 0;
    if (x < 0 || x >= this.width) return -1;
    for (let y = Math.max(0, fromY | 0); y < this.height; y++) {
      if (this.mask[y * this.width + x] === 1) return y;
    }
    return -1;
  }

  /**
   * Remove um círculo de terreno (cratera).
   * @returns {{x0,y0,x1,y1,removed}|null} região afetada, ou null se nada mudou.
   */
  carveCircle(cx, cy, r) {
    const x0 = Math.max(0, Math.floor(cx - r));
    const x1 = Math.min(this.width - 1, Math.ceil(cx + r));
    const y0 = Math.max(0, Math.floor(cy - r));
    const y1 = Math.min(this.height - 1, Math.ceil(cy + r));
    if (x0 > x1 || y0 > y1) return null;
    const r2 = r * r;
    let removed = 0;
    for (let y = y0; y <= y1; y++) {
      const dy = y + 0.5 - cy;
      const row = y * this.width;
      for (let x = x0; x <= x1; x++) {
        const dx = x + 0.5 - cx;
        if (dx * dx + dy * dy <= r2 && this.mask[row + x] === 1) {
          this.mask[row + x] = 0;
          removed++;
        }
      }
    }
    if (!removed) return null;
    const region = { x0, y0, x1, y1, removed };
    this.dirty.push(region);
    return region;
  }

  /** Marca o terreno inteiro como sujo (após geração). */
  markAllDirty() {
    this.dirty.length = 0;
    this.dirty.push({ x0: 0, y0: 0, x1: this.width - 1, y1: this.height - 1, removed: 0 });
  }

  consumeDirty() {
    const out = this.dirty;
    this.dirty = [];
    return out;
  }

  clear() {
    this.mask.fill(0);
    this.markAllDirty();
  }
}
