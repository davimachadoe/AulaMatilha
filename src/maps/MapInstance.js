// Instância jogável de um mapa: junta terreno, renderização, fundo, decoração e clima.
// Usada pela batalha e pelo cenário do menu, para não duplicar lógica.

import { Terrain } from '../terrain/Terrain.js';
import { TerrainRenderer } from '../terrain/TerrainRenderer.js';
import { generateTerrain, findSpawnPoints } from '../terrain/TerrainGenerator.js';
import { BackgroundRenderer, drawFluid } from './BackgroundRenderer.js';
import { placeDecorations, drawDecorations, pruneUnsupported } from './Decorations.js';
import { AmbientEffects } from './AmbientEffects.js';
import { ParticleSystem } from '../core/ParticleSystem.js';
import { WORLD } from '../core/config.js';

export class MapInstance {
  constructor(mapDef, seed, { particles = true } = {}) {
    this.def = mapDef;
    this.seed = seed;
    this.world = { width: WORLD.width, height: WORLD.height };
    this.time = 0;

    this.terrain = new Terrain(WORLD.width, WORLD.height);
    const { islands } = generateTerrain(this.terrain, mapDef, seed);
    this.islands = islands;
    this.terrainRenderer = new TerrainRenderer(this.terrain, mapDef.palette, seed);
    this.terrainRenderer.sync();

    this.background = new BackgroundRenderer(mapDef, seed);
    this.decorations = placeDecorations(this.terrain, islands, mapDef, seed);
    this.particles = new ParticleSystem(500);
    this.ambient = new AmbientEffects(mapDef.ambient, this.particles);
    this.ambient.enabled = particles;
    this.wind = 0; // definido por rodada a partir da Etapa 2
  }

  spawnPoints(count) {
    return findSpawnPoints(this.terrain, this.islands, count, this.seed);
  }

  /** Remove uma cratera do terreno e atualiza o que depende dele. */
  carve(x, y, r) {
    const region = this.terrain.carveCircle(x, y, r);
    if (region) this.decorations = pruneUnsupported(this.terrain, this.decorations);
    return region;
  }

  update(dt, camera) {
    this.time += dt;
    this.background.update(dt);
    this.ambient.update(dt, camera.viewRect(40), this.wind * 6);
    this.particles.update(dt, this.wind * 6);
  }

  /** Desenha o fundo (tela) e prepara a câmera; entidades são desenhadas por quem chama. */
  renderBackground(ctx, camera, w, h) {
    this.background.draw(ctx, camera, w, h, this.time);
  }

  /** Desenha decoração e terreno (já com a transformação da câmera aplicada). */
  renderWorld(ctx, camera) {
    this.terrainRenderer.sync();
    const view = camera.viewRect(0);
    drawDecorations(ctx, this.decorations, this.time, view);
    this.terrainRenderer.draw(ctx);
  }

  /** Fluido e partículas, por cima dos personagens. */
  renderForeground(ctx, camera) {
    const view = camera.viewRect(0);
    drawFluid(ctx, this.def.fluid, WORLD.fluidLevel, this.world, this.time, view);
    this.particles.draw(ctx);
  }
}
