// Sistema de partículas genérico com pool (sem alocação por frame).
// Usado para efeitos ambientais agora e para explosões/fumaça/fogo nas próximas etapas.

export class ParticleSystem {
  constructor(max = 600) {
    this.max = max;
    this.pool = [];
    this.active = [];
  }

  /**
   * @param {object} p  { x, y, vx, vy, life, size, color, gravity, drag, shape, glow, sway, fade, grow }
   */
  spawn(p) {
    if (this.active.length >= this.max) return null;
    const part = this.pool.pop() || {};
    part.x = p.x;
    part.y = p.y;
    part.vx = p.vx ?? 0;
    part.vy = p.vy ?? 0;
    part.life = part.maxLife = p.life ?? 1;
    part.size = p.size ?? 3;
    part.color = p.color ?? '#fff';
    part.gravity = p.gravity ?? 0;
    part.drag = p.drag ?? 0;
    part.shape = p.shape ?? 'circle';
    part.glow = p.glow ?? false;
    part.sway = p.sway ?? 0;
    part.phase = Math.random() * Math.PI * 2;
    part.fade = p.fade ?? true;
    part.grow = p.grow ?? 0;
    part.rot = p.rot ?? Math.random() * Math.PI * 2;
    part.spin = p.spin ?? 0;
    this.active.push(part);
    return part;
  }

  update(dt, windX = 0) {
    const arr = this.active;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) {
        arr[i] = arr[arr.length - 1];
        arr.pop();
        this.pool.push(p);
        continue;
      }
      p.vy += p.gravity * dt;
      if (p.drag) {
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy *= d;
      }
      p.phase += dt * 2;
      p.x += (p.vx + windX + Math.sin(p.phase) * p.sway) * dt;
      p.y += p.vy * dt;
      p.size += p.grow * dt;
      p.rot += p.spin * dt;
    }
  }

  draw(ctx) {
    for (const p of this.active) {
      const t = p.life / p.maxLife;
      const alpha = p.fade ? Math.min(1, t * 2) * Math.min(1, (1 - t) * 6 + 0.2) : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.fillStyle = p.color;
      if (p.glow) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
      }
      const s = Math.max(0.1, p.size);
      if (p.shape === 'rect') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillRect(-s, -s * 0.5, s * 2, s);
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
        ctx.fill();
      }
      if (p.glow) ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.pool.push(...this.active);
    this.active.length = 0;
  }
}
