// Mira e potência de um atirador. Não lê teclado: quem controla (jogador, IA, rede) chama os métodos.
// Assim a IA da Etapa 7 e o multiplayer da Etapa 8 usam exatamente as mesmas regras do jogador.

import { AIM } from '../core/config.js';
import { clamp, degToRad } from '../core/math.js';
import { getWeapon } from '../weapons/weapons.js';

const BARREL_LENGTH = 31;
const SHOULDER = { x: 3, y: -25 };

export class ShotController {
  constructor(character, weaponId = 'cannon') {
    this.character = character;
    this.weaponId = weaponId;
    this.power = 0;
    this.lastPower = null;
    this.charging = false;
  }

  get weapon() {
    return getWeapon(this.weaponId);
  }

  get angle() {
    return this.character.aim;
  }

  /** @param {number} dir  -1 abaixa, +1 levanta */
  adjustAngle(dir, dt, fine = false) {
    const speed = fine ? AIM.fineAngleSpeed : AIM.angleSpeed;
    this.character.aim = clamp(this.character.aim + dir * speed * dt, AIM.minAngle, AIM.maxAngle);
  }

  setAngle(deg) {
    this.character.aim = clamp(deg, AIM.minAngle, AIM.maxAngle);
  }

  face(dir) {
    if (dir) this.character.facing = dir > 0 ? 1 : -1;
  }

  startCharge() {
    this.charging = true;
    this.power = 0;
  }

  updateCharge(dt) {
    if (!this.charging) return;
    this.power = Math.min(100, this.power + (100 / AIM.chargeTime) * dt);
  }

  /** Solta o disparo. Retorna a potência usada (0..100) ou null se não estava carregando. */
  release() {
    if (!this.charging) return null;
    this.charging = false;
    const used = Math.max(1, this.power);
    this.lastPower = used;
    return used;
  }

  cancel() {
    this.charging = false;
    this.power = 0;
  }

  /** Ponto de saída do projétil (boca do canhão) em coordenadas do mundo. */
  muzzle() {
    const c = this.character;
    const a = degToRad(c.aim);
    return {
      x: c.x + c.facing * (SHOULDER.x + Math.cos(a) * BARREL_LENGTH),
      y: c.y + SHOULDER.y - Math.sin(a) * BARREL_LENGTH,
    };
  }
}
