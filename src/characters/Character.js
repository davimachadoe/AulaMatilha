// Entidade de personagem no mundo. Guarda posição, aparência, vida e estado de animação.
// Atributos completos, classe e equipamentos entram nas Etapas 5 e 6.

import { resolveLook, drawCharacter } from './CharacterRenderer.js';
import { validateAppearance } from './appearance.js';

let nextId = 1;

export class Character {
  constructor({ name, appearance, x = 0, y = 0, facing = 1, team = 0, isPlayer = false, maxHp = 1000 }) {
    this.id = nextId++;
    this.name = name;
    this.team = team;
    this.isPlayer = isPlayer;
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.facing = facing;
    this.aim = 35; // graus acima da horizontal
    this.state = 'idle'; // idle | walk | victory | defeat
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.alive = true; // false = eliminado (caiu do mapa)
    this.hurtTime = 0;
    this.time = Math.random() * 10;
    this.blink = 0;
    this._blinkTimer = 1 + Math.random() * 3;
    this.setAppearance(appearance);
  }

  setAppearance(appearance) {
    this.appearance = validateAppearance(appearance);
    this.look = resolveLook(this.appearance);
  }

  get defeated() {
    return !this.alive || this.hp <= 0;
  }

  takeDamage(amount) {
    if (this.defeated) return 0;
    const dealt = Math.min(this.hp, Math.max(0, Math.round(amount)));
    this.hp -= dealt;
    this.hurtTime = 0.45;
    if (this.hp <= 0) this.state = 'defeat';
    return dealt;
  }

  revive(x, y) {
    this.x = x;
    this.y = y;
    this.vy = 0;
    this.hp = this.maxHp;
    this.alive = true;
    this.state = 'idle';
  }

  update(dt) {
    this.time += dt;
    this.hurtTime = Math.max(0, this.hurtTime - dt);
    this._blinkTimer -= dt;
    if (this._blinkTimer <= 0) {
      this.blink = 1;
      if (this._blinkTimer < -0.12) {
        this.blink = 0;
        this._blinkTimer = 2 + Math.random() * 3;
      }
    }
  }

  draw(ctx, { showName = true, showHp = false, scale = 1 } = {}) {
    if (!this.alive) return;
    // Tremida e piscada vermelha ao levar dano.
    const shake = this.hurtTime > 0 ? Math.sin(this.hurtTime * 60) * 3 * (this.hurtTime / 0.45) : 0;
    if (this.hurtTime > 0 && Math.floor(this.hurtTime * 20) % 2 === 0) ctx.globalAlpha = 0.55;
    drawCharacter(ctx, this.look, {
      x: this.x + shake,
      y: this.y,
      facing: this.facing,
      aim: this.aim,
      time: this.time,
      blink: this.blink,
      state: this.state,
      scale,
    });
    ctx.globalAlpha = 1;

    let ty = this.y - (this.look.tagHeight ?? 74) * scale;
    if (showHp) {
      const w = 46;
      const h = 7;
      const k = this.hp / this.maxHp;
      ctx.fillStyle = '#2b1d2e';
      ctx.beginPath();
      ctx.roundRect(this.x - w / 2 - 2, ty - h / 2 - 2, w + 4, h + 4, 4);
      ctx.fill();
      ctx.fillStyle = k > 0.5 ? '#5fd35f' : k > 0.25 ? '#ffc93c' : '#ff5a5f';
      ctx.beginPath();
      ctx.roundRect(this.x - w / 2, ty - h / 2, Math.max(0, w * k), h, 3);
      ctx.fill();
      ty -= 12;
    }
    if (showName) {
      ctx.font = 'bold 12px Fredoka, "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,10,30,0.85)';
      ctx.strokeText(this.name, this.x, ty);
      ctx.fillStyle = this.isPlayer ? '#ffe066' : '#ffffff';
      ctx.fillText(this.name, this.x, ty);
    }
  }
}
