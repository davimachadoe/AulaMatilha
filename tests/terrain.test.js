import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Terrain } from '../src/terrain/Terrain.js';
import { generateTerrain, findSpawnPoints } from '../src/terrain/TerrainGenerator.js';
import { MAPS } from '../src/maps/maps.js';
import { WORLD } from '../src/core/config.js';

test('carveCircle remove pixels dentro do raio e marca região suja', () => {
  const t = new Terrain(100, 100);
  for (let x = 0; x < 100; x++) t.fillColumn(x, 50, 99);
  t.consumeDirty();
  const region = t.carveCircle(50, 50, 10);
  assert.ok(region && region.removed > 0);
  assert.equal(t.isSolid(50, 55), false);
  assert.equal(t.isSolid(50, 65), true);
  assert.equal(t.consumeDirty().length, 1);
});

test('carveCircle no ar não altera nada', () => {
  const t = new Terrain(50, 50);
  assert.equal(t.carveCircle(25, 25, 5), null);
});

test('isSolid fora dos limites é falso e surfaceY encontra o chão', () => {
  const t = new Terrain(20, 20);
  t.fillColumn(5, 12, 19);
  assert.equal(t.isSolid(-1, 0), false);
  assert.equal(t.isSolid(5, 25), false);
  assert.equal(t.surfaceY(5), 12);
  assert.equal(t.surfaceY(6), -1);
});

for (const map of MAPS) {
  test(`gerador (${map.id}) é determinístico e cria ilhas válidas`, () => {
    const a = new Terrain(WORLD.width, WORLD.height);
    const b = new Terrain(WORLD.width, WORLD.height);
    const ra = generateTerrain(a, map, 1234);
    generateTerrain(b, map, 1234);
    assert.deepEqual(a.mask, b.mask);
    assert.ok(ra.islands.length >= map.terrain.islands[0]);
    assert.ok(ra.islands.length <= map.terrain.islands[1]);

    // Nada sólido acima da margem de céu, e existe terreno.
    let solid = 0;
    for (let x = 0; x < a.width; x += 7) {
      const s = a.surfaceY(x);
      if (s >= 0) {
        assert.ok(s >= WORLD.skyMargin, `topo em ${s} invade a margem de céu`);
        solid++;
      }
    }
    assert.ok(solid > 50);
  });

  test(`spawns (${map.id}) ficam em chão firme e separados`, () => {
    const t = new Terrain(WORLD.width, WORLD.height);
    const { islands } = generateTerrain(t, map, 99);
    const pts = findSpawnPoints(t, islands, 2, 99);
    assert.equal(pts.length, 2);
    for (const p of pts) {
      assert.ok(t.isSolid(p.x, p.y), 'spawn deve estar sobre terreno');
      assert.equal(t.isSolid(p.x, p.y - 1), false, 'acima do spawn deve ser ar');
    }
    assert.ok(Math.abs(pts[0].x - pts[1].x) > 400, 'jogadores devem nascer afastados');
  });
}

test('terrenos diferentes para sementes diferentes', () => {
  const a = new Terrain(WORLD.width, WORLD.height);
  const b = new Terrain(WORLD.width, WORLD.height);
  generateTerrain(a, MAPS[0], 1);
  generateTerrain(b, MAPS[0], 2);
  assert.notDeepEqual(a.mask, b.mask);
});
