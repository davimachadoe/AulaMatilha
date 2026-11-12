// Definições de armas. A Etapa 5 completa o arsenal (duplo, triplo, perfurante, teleguiado...).
// Todos os campos já seguem o formato final para não precisar migrar depois.

export const WEAPONS = {
  cannon: {
    id: 'cannon',
    name: 'Canhão Básico',
    description: 'Projétil equilibrado e confiável. Bom para aprender a compensar o vento.',
    damage: 260, // dano no centro da explosão
    radius: 60, // raio de dano da explosão
    craterRadius: 38, // raio do buraco no terreno
    speed: 1.0, // multiplicador da velocidade inicial
    weight: 1.0, // multiplicador da gravidade
    windInfluence: 1.0, // quanto o vento empurra
    directHitBonus: 1.15, // multiplicador ao acertar o corpo em cheio
    effects: [],
    rarity: 'common',
    uses: Infinity,
    cooldown: 0,
    projectile: { radius: 6, color: '#3c434e', trail: 'rgba(255,255,255,0.55)' },
  },
};

export const WEAPON_SLOTS = ['cannon'];

export const getWeapon = (id) => WEAPONS[id] ?? WEAPONS.cannon;
