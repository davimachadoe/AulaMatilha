// Camada de persistência.
// A API é assíncrona de propósito: hoje usa LocalStorage, mas pode trocar por um
// adaptador de servidor (REST/Socket.IO) na Etapa 8 sem mudar quem a usa.

import { SAVE } from './config.js';
import { defaultAppearance, validateAppearance } from '../characters/appearance.js';

export class LocalStorageAdapter {
  async get(key) {
    return window.localStorage.getItem(key);
  }
  async set(key, value) {
    window.localStorage.setItem(key, value);
  }
  async remove(key) {
    window.localStorage.removeItem(key);
  }
}

/** Adaptador em memória: usado em testes e quando o LocalStorage está bloqueado. */
export class MemoryAdapter {
  constructor() {
    this.data = new Map();
  }
  async get(key) {
    return this.data.has(key) ? this.data.get(key) : null;
  }
  async set(key, value) {
    this.data.set(key, value);
  }
  async remove(key) {
    this.data.delete(key);
  }
}

export function createDefaultSave() {
  return {
    version: SAVE.version,
    profile: {
      name: 'Aventureiro',
      appearance: defaultAppearance(),
      classId: null, // Etapa 5
      level: 1,
      xp: 0,
    },
    currency: { gold: 500, crystals: 0 },
    inventory: [], // Etapa 6
    equipment: {}, // Etapa 6
    progress: { battlesPlayed: 0, wins: 0 },
    settings: {
      masterVolume: 0.8,
      sfxVolume: 0.8,
      musicVolume: 0.5,
      showFps: false,
      particles: true,
      screenShake: true,
    },
  };
}

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Mescla `data` sobre `defaults`, mantendo só tipos compatíveis. */
function mergeDefaults(defaults, data) {
  // Padrão `null` = campo opcional de qualquer tipo (ex.: classId).
  if (defaults === null) return data === undefined ? null : data;
  if (!isPlainObject(defaults) || !isPlainObject(data)) {
    return data !== undefined && typeof data === typeof defaults && Array.isArray(data) === Array.isArray(defaults)
      ? data
      : defaults;
  }
  const out = {};
  for (const key of Object.keys(defaults)) {
    out[key] = key in data ? mergeDefaults(defaults[key], data[key]) : defaults[key];
  }
  // Mantém chaves extras (ex.: salvas por versões mais novas).
  for (const key of Object.keys(data)) if (!(key in out)) out[key] = data[key];
  return out;
}

// Migrações entre versões do save. Cada função recebe o save da versão N e devolve N+1.
const MIGRATIONS = {
  // 1: (save) => ({ ...save, version: 2, novoCampo: ... }),
};

export function migrateSave(raw) {
  let save = raw;
  let v = Number(save.version) || 1;
  while (v < SAVE.version) {
    const migrate = MIGRATIONS[v];
    if (!migrate) throw new Error(`Sem migração do save v${v}`);
    save = migrate(save);
    v = save.version;
  }
  return save;
}

export class SaveManager {
  constructor(adapter, key = SAVE.key) {
    this.adapter = adapter;
    this.key = key;
    this.data = createDefaultSave();
    this.lastError = null;
  }

  async load() {
    let raw;
    try {
      raw = await this.adapter.get(this.key);
    } catch (err) {
      this.lastError = err;
      console.warn('[Save] não foi possível ler o save, usando padrão', err);
      return this.data;
    }
    if (!raw) return this.data;
    try {
      const parsed = migrateSave(JSON.parse(raw));
      const merged = mergeDefaults(createDefaultSave(), parsed);
      merged.version = SAVE.version;
      merged.profile.appearance = validateAppearance(merged.profile.appearance);
      this.data = merged;
    } catch (err) {
      // Save corrompido: guarda uma cópia para recuperação manual e recomeça.
      this.lastError = err;
      console.error('[Save] save corrompido, backup criado em', `${this.key}.corrupt`, err);
      try {
        await this.adapter.set(`${this.key}.corrupt`, raw);
      } catch {
        /* sem espaço: ignora */
      }
      this.data = createDefaultSave();
    }
    return this.data;
  }

  async save() {
    try {
      await this.adapter.set(this.key, JSON.stringify(this.data));
      return true;
    } catch (err) {
      this.lastError = err;
      console.error('[Save] falha ao salvar', err);
      return false;
    }
  }

  async reset() {
    this.data = createDefaultSave();
    return this.save();
  }
}

/** Escolhe o melhor adaptador disponível no navegador. */
export function createBrowserSaveManager() {
  try {
    const probe = '__bi_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return new SaveManager(new LocalStorageAdapter());
  } catch {
    console.warn('[Save] LocalStorage indisponível; progresso não será mantido ao fechar.');
    return new SaveManager(new MemoryAdapter());
  }
}
