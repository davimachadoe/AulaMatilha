// Vento por rodada: intensidade sorteada dentro da faixa do mapa, direção aleatória.

import { PHYSICS } from '../core/config.js';

/**
 * @param {() => number} rng
 * @param {[number, number]} range  intensidade mínima e máxima (0..10)
 * @returns {number} vento inteiro entre -10 e 10 (negativo = para a esquerda)
 */
export function rollWind(rng, range = [0, 10]) {
  const [min, max] = range;
  const strength = Math.round(min + rng() * (max - min));
  const dir = rng() < 0.5 ? -1 : 1;
  return Math.max(-PHYSICS.windScale, Math.min(PHYSICS.windScale, strength * dir)) || 0;
}
