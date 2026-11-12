// Efeitos ambientais por mapa: pétalas, brasas, vagalumes, poeira e neve.

const SPAWN_RATE = { petals: 6, embers: 18, fireflies: 5, dust: 14, snow: 40 };

export class AmbientEffects {
  constructor(kind, particles) {
    this.kind = kind;
    this.particles = particles;
    this.acc = 0;
    this.enabled = true;
  }

  update(dt, view, windX = 0) {
    if (!this.enabled) return;
    const area = ((view.x1 - view.x0) * (view.y1 - view.y0)) / 1e6;
    this.acc += dt * (SPAWN_RATE[this.kind] ?? 0) * Math.max(0.5, area);
    while (this.acc >= 1) {
      this.acc -= 1;
      this._spawn(view, windX);
    }
  }

  _spawn(v, windX) {
    const P = this.particles;
    const rx = v.x0 + Math.random() * (v.x1 - v.x0);
    const ry = v.y0 + Math.random() * (v.y1 - v.y0);
    switch (this.kind) {
      case 'petals':
        P.spawn({
          x: rx, y: v.y0 - 10, vx: 20 + windX, vy: 40 + Math.random() * 30, life: 9,
          size: 3, color: Math.random() < 0.5 ? '#ff9ec7' : '#fff1a8', shape: 'rect', sway: 30, spin: 2,
        });
        break;
      case 'embers':
        P.spawn({
          x: rx, y: v.y1 + 10, vx: windX * 0.5, vy: -60 - Math.random() * 60, life: 6,
          size: 1.5 + Math.random() * 2, color: Math.random() < 0.6 ? '#ffb347' : '#ff5a2a', glow: true, sway: 20,
        });
        break;
      case 'fireflies':
        P.spawn({
          x: rx, y: ry, vx: (Math.random() - 0.5) * 20, vy: (Math.random() - 0.5) * 20, life: 5,
          size: 2, color: Math.random() < 0.5 ? '#c9ff8a' : '#9ff7ff', glow: true, sway: 25,
        });
        break;
      case 'dust':
        P.spawn({
          x: v.x0 - 10, y: ry, vx: 120 + Math.random() * 80 + windX, vy: (Math.random() - 0.5) * 10, life: 10,
          size: 1.2 + Math.random() * 1.5, color: 'rgba(255,235,190,0.8)', sway: 10,
        });
        break;
      case 'snow':
        P.spawn({
          x: rx, y: v.y0 - 10, vx: 15 + windX, vy: 50 + Math.random() * 40, life: 12,
          size: 1.5 + Math.random() * 2.2, color: '#ffffff', sway: 18,
        });
        break;
      default:
        break;
    }
  }
}
