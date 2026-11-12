// Textos flutuantes no mundo (números de dano, avisos). Sobem e somem.

export class FloatingText {
  constructor() {
    this.items = [];
  }

  add(x, y, text, { color = '#fff', size = 22, life = 1.2 } = {}) {
    this.items.push({ x, y, text, color, size, life, maxLife: life, vy: -60 });
  }

  update(dt) {
    for (const t of this.items) {
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= Math.exp(-2 * dt);
    }
    this.items = this.items.filter((t) => t.life > 0);
  }

  draw(ctx) {
    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const t of this.items) {
      const k = t.life / t.maxLife;
      // "Pulo" de escala ao aparecer.
      const pop = k > 0.85 ? 1 + (k - 0.85) * 3 : 1;
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.font = `700 ${Math.round(t.size * pop)}px Fredoka, "Trebuchet MS", sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#2b1d2e';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}
