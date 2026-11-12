import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager, MemoryAdapter, createDefaultSave } from '../src/core/Storage.js';
import { SAVE } from '../src/core/config.js';

test('sem save existente, carrega o padrão', async () => {
  const sm = new SaveManager(new MemoryAdapter());
  const data = await sm.load();
  assert.deepEqual(data, createDefaultSave());
});

test('salvar e carregar mantém os dados', async () => {
  const adapter = new MemoryAdapter();
  const a = new SaveManager(adapter);
  await a.load();
  a.data.profile.name = 'Testador';
  a.data.currency.gold = 1234;
  assert.equal(await a.save(), true);

  const b = new SaveManager(adapter);
  const data = await b.load();
  assert.equal(data.profile.name, 'Testador');
  assert.equal(data.currency.gold, 1234);
});

test('save corrompido volta ao padrão e guarda backup', async () => {
  const adapter = new MemoryAdapter();
  await adapter.set(SAVE.key, '{isso não é json');
  const sm = new SaveManager(adapter);
  const data = await sm.load();
  assert.deepEqual(data, createDefaultSave());
  assert.ok(sm.lastError);
  assert.equal(await adapter.get(`${SAVE.key}.corrupt`), '{isso não é json');
});

test('save antigo/incompleto ganha campos novos e corrige valores inválidos', async () => {
  const adapter = new MemoryAdapter();
  await adapter.set(
    SAVE.key,
    JSON.stringify({
      version: 1,
      profile: { name: 'Velho', appearance: { skin: 'nao-existe', hairStyle: 'long' } },
      currency: { gold: 'muito' },
    }),
  );
  const data = await new SaveManager(adapter).load();
  assert.equal(data.profile.name, 'Velho');
  assert.equal(data.profile.appearance.hairStyle, 'long');
  assert.equal(data.profile.appearance.skin, createDefaultSave().profile.appearance.skin);
  assert.equal(data.currency.gold, createDefaultSave().currency.gold, 'tipo inválido volta ao padrão');
  assert.equal(data.settings.particles, true, 'configurações ausentes recebem padrão');
});

test('adaptador que falha não derruba o jogo', async () => {
  const broken = {
    get: async () => {
      throw new Error('bloqueado');
    },
    set: async () => {
      throw new Error('cheio');
    },
  };
  const sm = new SaveManager(broken);
  const data = await sm.load();
  assert.equal(data.profile.level, 1);
  assert.equal(await sm.save(), false);
});
