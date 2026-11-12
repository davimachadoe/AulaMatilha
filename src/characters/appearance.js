// Catálogo de opções de aparência e validação.
// Na Etapa 4 cada opção vira um item com raridade/desbloqueio; os ids continuam os mesmos.

export const APPEARANCE_OPTIONS = {
  body: [
    { id: 'male', label: 'Masculino' },
    { id: 'female', label: 'Feminino' },
  ],
  skin: [
    { id: 'porcelain', label: 'Porcelana', color: '#ffe3cc' },
    { id: 'peach', label: 'Pêssego', color: '#f8c9a2' },
    { id: 'honey', label: 'Mel', color: '#e2a678' },
    { id: 'caramel', label: 'Caramelo', color: '#c48456' },
    { id: 'cocoa', label: 'Cacau', color: '#96603c' },
    { id: 'ebony', label: 'Ébano', color: '#6a4029' },
  ],
  hairStyle: [
    { id: 'short', label: 'Curto' },
    { id: 'spiky', label: 'Espetado' },
    { id: 'long', label: 'Longo' },
    { id: 'bob', label: 'Chanel' },
    { id: 'quiff', label: 'Topete' },
    { id: 'buzz', label: 'Raspado' },
    { id: 'ponytail', label: 'Rabo de cavalo' },
    { id: 'pigtails', label: 'Maria-chiquinha' },
  ],
  hairColor: [
    { id: 'black', label: 'Preto', color: '#2a2230' },
    { id: 'brown', label: 'Castanho', color: '#6b3f26' },
    { id: 'blonde', label: 'Loiro', color: '#f2cf62' },
    { id: 'ginger', label: 'Ruivo', color: '#e0682f' },
    { id: 'snow', label: 'Branco', color: '#eef1f7' },
    { id: 'ocean', label: 'Azul', color: '#3f86e8' },
    { id: 'rose', label: 'Rosa', color: '#ff7eb6' },
    { id: 'mint', label: 'Menta', color: '#4fd6a8' },
  ],
  eyes: [
    { id: 'round', label: 'Redondos' },
    { id: 'happy', label: 'Felizes' },
    { id: 'sharp', label: 'Determinados' },
    { id: 'sleepy', label: 'Sonolentos' },
  ],
  eyeColor: [
    { id: 'brown', label: 'Castanhos', color: '#5a3622' },
    { id: 'blue', label: 'Azuis', color: '#2f7fe0' },
    { id: 'green', label: 'Verdes', color: '#2fa35a' },
    { id: 'violet', label: 'Violeta', color: '#8a4fe0' },
  ],
  mouth: [
    { id: 'smile', label: 'Sorriso' },
    { id: 'grin', label: 'Sorrisão' },
    { id: 'neutral', label: 'Sério' },
    { id: 'open', label: 'Surpreso' },
  ],
  top: [
    { id: 'tee-red', label: 'Camiseta Vermelha', color: '#e8484f', style: 'tee' },
    { id: 'tee-blue', label: 'Camiseta Azul', color: '#3f7fe8', style: 'tee' },
    { id: 'tee-yellow', label: 'Camiseta Amarela', color: '#f5c542', style: 'tee' },
    { id: 'jacket-green', label: 'Jaqueta Verde', color: '#3fae6a', style: 'jacket' },
    { id: 'jacket-purple', label: 'Jaqueta Roxa', color: '#8a5ad6', style: 'jacket' },
    { id: 'vest-orange', label: 'Colete Laranja', color: '#f08a2f', style: 'vest' },
  ],
  bottom: [
    { id: 'jeans', label: 'Calça Jeans', color: '#3d5a8f', style: 'pants' },
    { id: 'khaki', label: 'Calça Cáqui', color: '#b99a62', style: 'pants' },
    { id: 'black', label: 'Calça Preta', color: '#2e2b38', style: 'pants' },
    { id: 'red', label: 'Calça Vermelha', color: '#b83a3a', style: 'pants' },
    { id: 'skirt-pink', label: 'Saia Rosa', color: '#ff7eb6', style: 'skirt' },
    { id: 'skirt-blue', label: 'Saia Azul', color: '#3f7fe8', style: 'skirt' },
    { id: 'skirt-plaid', label: 'Saia Xadrez', color: '#c0392b', style: 'skirt', pattern: true },
  ],
  boots: [
    { id: 'brown', label: 'Marrons', color: '#6a4026' },
    { id: 'black', label: 'Pretas', color: '#25222c' },
    { id: 'white', label: 'Brancas', color: '#eceff4' },
  ],
  headwear: [
    { id: 'none', label: 'Nenhum' },
    { id: 'goggles', label: 'Óculos de aviador' },
    { id: 'cap', label: 'Boné' },
    { id: 'bandana', label: 'Bandana' },
    { id: 'helmet', label: 'Capacete' },
  ],
};

/** Ordem e rótulos dos campos editáveis (usado pela tela de personagem). */
export const APPEARANCE_FIELDS = [
  ['body', 'Corpo'],
  ['skin', 'Pele'],
  ['hairStyle', 'Cabelo'],
  ['hairColor', 'Cor do cabelo'],
  ['eyes', 'Olhos'],
  ['eyeColor', 'Cor dos olhos'],
  ['mouth', 'Boca'],
  ['top', 'Roupa'],
  ['bottom', 'Parte de baixo'],
  ['boots', 'Botas'],
  ['headwear', 'Cabeça'],
];

export function defaultAppearance() {
  return {
    body: 'male',
    skin: 'peach',
    hairStyle: 'spiky',
    hairColor: 'brown',
    eyes: 'round',
    eyeColor: 'brown',
    mouth: 'smile',
    top: 'tee-red',
    bottom: 'jeans',
    boots: 'brown',
    headwear: 'goggles',
  };
}

/** Garante que toda opção existe; valores inválidos voltam ao padrão. */
export function validateAppearance(a) {
  const def = defaultAppearance();
  const out = {};
  for (const key of Object.keys(def)) {
    const opts = APPEARANCE_OPTIONS[key];
    const val = a && typeof a === 'object' ? a[key] : undefined;
    out[key] = opts.some((o) => o.id === val) ? val : def[key];
  }
  return out;
}

export function randomAppearance(rng = Math.random) {
  const out = {};
  for (const key of Object.keys(APPEARANCE_OPTIONS)) {
    const opts = APPEARANCE_OPTIONS[key];
    out[key] = opts[Math.floor(rng() * opts.length)].id;
  }
  return out;
}

/** Avança/volta uma opção de um campo (com volta circular). */
export function cycleOption(appearance, field, dir) {
  const opts = APPEARANCE_OPTIONS[field];
  const idx = opts.findIndex((o) => o.id === appearance[field]);
  const next = (idx + dir + opts.length) % opts.length;
  return { ...appearance, [field]: opts[next].id };
}

export const getOption = (field, id) => APPEARANCE_OPTIONS[field].find((o) => o.id === id) ?? APPEARANCE_OPTIONS[field][0];
