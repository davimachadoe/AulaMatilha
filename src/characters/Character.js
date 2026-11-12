// Entidade de personagem no mundo. Guarda posição, aparência e estado de animação.
// Atributos de combate, classe e equipamentos entram nas Etapas 5 e 6.

import { resolveLook, drawCharacter } from './CharacterRenderer.js';
import { validateAppearance } from './appearance.js';

let nextId = 1;

export class Character {
  constructor({ name, appearance, x = 0, y = 0, facing = 1, team = 0, isPlayer = false }) {
    this.id = nextId++;
    this.name = name;
    this.team = team;
    this.isPlayer = isPlayer;
    this.x = x;
    this.y = y;
    this.facing = facing;
    this.aim = 35; // graus acima da horizontal
    this.state = 'idle'; // idle | walk | victory | defeat
    this.time = Math.random() * 10;
    this.blink = 0;
    this._blinkTimer = 1 + Math.random() * 3;
    this.setAppearance(appearance);
  }

  setAppearance(appearance) {
    this.appearance = validateAppearance(appearance);
    this.look = resolveLook(this.appearance);
  }

  update(dt) {
    this.time += dt;
    this._blinkTimer -= dt;
    if (this._blinkTimer <= 0) {
      this.blink = 1;
      if (this._blinkTimer < -0.12) {
        this.blink = 0;
        this._blinkTimer = 2 + Math.random() * 3;
      }
    }
  }

  draw(ctx, { showName = true, scale = 1 } = {}) {
    drawCharacter(ctx, this.look, {
      x: this.x,
      y: this.y,
      facing: this.facing,
      aim: this.aim,
      time: this.time,
      blink: this.blink,
      state: this.state,
      scale,
    });
    if (showName) {
      ctx.font = 'bold 12px Fredoka, "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(20,10,30,0.85)';
      const ty = this.y - 72 * scale;
      ctx.strokeText(this.name, this.x, ty);
      ctx.fillStyle = this.isPlayer ? '#ffe066' : '#ffffff';
      ctx.fillText(this.name, this.x, ty);
    }
  }
}
