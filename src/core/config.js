// Constantes globais do jogo. Valores de gameplay ficam aqui para facilitar balanceamento.

export const GAME_TITLE = 'Battle Islands';

export const WORLD = {
  width: 2400,
  height: 1200,
  // Altura do "mar" (ou lava, névoa...) no fundo do mapa. Cair abaixo disso = eliminado (Etapa 3).
  fluidLevel: 1120,
  // Altura mínima do topo do terreno, para sobrar céu para trajetórias altas.
  skyMargin: 160,
};

export const TURN = {
  duration: 25, // segundos por turno
  moveBudget: 80, // pixels de movimento por turno
};

// Parâmetros de física (usados a partir da Etapa 2).
export const PHYSICS = {
  gravity: 900, // px/s²
  fixedDt: 1 / 60,
  maxPower: 1000, // velocidade inicial máxima (px/s)
  windMax: 120, // aceleração horizontal máxima do vento (px/s²)
};

export const CAMERA = {
  // Quantos pixels do mundo devem caber na altura da tela com zoom 1.
  viewHeight: 820,
  minZoom: 0.35,
  maxZoom: 2.2,
};

export const SAVE = {
  key: 'battleislands.save',
  version: 1,
};
