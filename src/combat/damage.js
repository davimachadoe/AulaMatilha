// Fórmulas de dano. A Etapa 5 acrescenta ataque, defesa, resistências e bônus de classe
// nos parâmetros que já existem aqui (attack, defense, multiplier), sem mudar quem chama.

import { clamp } from '../core/math.js';

const BODY_CENTER_Y = 28; // altura do centro do corpo acima dos pés
const BODY_RADIUS = 14;

/** Distância da explosão até a borda do corpo do personagem (0 = encostado). */
export function distanceToBody(target, x, y) {
  const d = Math.hypot(target.x - x, target.y - BODY_CENTER_Y - y);
  return Math.max(0, d - BODY_RADIUS);
}

/**
 * Dano de explosão.
 * @param {object} o
 * @param {number} o.base       dano da arma no centro
 * @param {number} o.radius     raio de dano
 * @param {number} o.distance   distância até o corpo
 * @param {boolean} [o.direct]  acertou o corpo em cheio
 * @param {number} [o.directBonus]
 * @param {number} [o.attack]   atributo de ataque de quem atirou (Etapa 5)
 * @param {number} [o.defense]  atributo de defesa do alvo (Etapa 5)
 * @param {number} [o.multiplier] bônus/penalidades de habilidades
 */
export function explosionDamage({ base, radius, distance, direct = false, directBonus = 1, attack = 0, defense = 0, multiplier = 1 }) {
  if (distance >= radius) return 0;
  // Queda suave: cheio no centro, zero na borda do raio.
  const falloff = direct ? 1 : Math.pow(1 - distance / radius, 0.75);
  // Ataque e defesa como porcentagens com retorno decrescente (evita valores absurdos no PvP).
  const atk = 1 + attack / (attack + 200);
  const def = 1 - defense / (defense + 300);
  const value = base * falloff * (direct ? directBonus : 1) * atk * def * multiplier;
  return Math.max(0, Math.round(clamp(value, 0, base * 3)));
}
