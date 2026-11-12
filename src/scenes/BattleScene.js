// Campo de batalha. Etapa 1: mapa procedural, personagens posicionados e câmera.
// Mira, disparo e vento entram na Etapa 2; movimento, turnos e destruição na Etapa 3.

import { Scene } from '../core/Game.js';
import { Camera } from '../core/Camera.js';
import { MapInstance } from '../maps/MapInstance.js';
import { getMap } from '../maps/maps.js';
import { Character } from '../characters/Character.js';
import { randomAppearance } from '../characters/appearance.js';
import { createRng, randomSeed } from '../core/math.js';

export class BattleScene extends Scene {
  enter({ mapId = 'tropical', seed = randomSeed() } = {}) {
    this.mapId = mapId;
    this.followTarget = null;
    this._build(seed);
    this.game.ui.show('battleHud', { scene: this });
  }

  _build(seed) {
    const { save } = this.game;
    this.seed = seed;
    this.map = new MapInstance(getMap(this.mapId), seed, { particles: save.data.settings.particles });
    this.camera = new Camera(this.map.world);
    this.camera.setScreen(this.game.renderer.width, this.game.renderer.height);

    const spawns = this.map.spawnPoints(2);
    this.player = new Character({
      name: save.data.profile.name,
      appearance: save.data.profile.appearance,
      x: spawns[0].x,
      y: spawns[0].y,
      facing: 1,
      team: 0,
      isPlayer: true,
    });
    this.dummy = new Character({
      name: 'Boneco de Treino',
      appearance: randomAppearance(createRng(seed + 1)),
      x: spawns[1].x,
      y: spawns[1].y,
      facing: -1,
      team: 1,
    });
    this.characters = [this.player, this.dummy];

    // Começa mostrando o mapa todo e depois aproxima no jogador.
    this.camera.setZoom(this.camera.fitZoom, true);
    this.camera.lookAt(this.map.world.width / 2, this.map.world.height / 2, true);
    this.introTimer = 1.2;
    this.followTarget = this.player;
  }

  regenerate() {
    this._build(randomSeed());
    this.game.events.emit('battle:regenerated', { seed: this.seed });
  }

  focus(target) {
    this.followTarget = target;
    this.camera.setZoom(this.camera.baseZoom);
  }

  /** Afasta a câmera para mostrar o mapa inteiro. */
  overview() {
    this.followTarget = null;
    this.camera.setZoom(this.camera.fitZoom);
    this.camera.lookAt(this.map.world.width / 2, this.map.world.height / 2);
  }

  resize(w, h) {
    this.camera.setScreen(w, h);
    this.camera.setZoom(this.camera.targetZoom);
  }

  update(dt) {
    const { input } = this.game;

    if (input.wasPressed('Escape')) {
      this.game.changeScene('menu');
      return;
    }
    if (input.wasPressed('KeyR')) this.regenerate();
    if (input.wasPressed('Digit1')) this.focus(this.player);
    if (input.wasPressed('Digit2')) this.focus(this.dummy);
    if (input.wasPressed('KeyF')) this.overview();

    // Câmera: arrastar com mouse/dedo, roda ou pinça para zoom.
    if (input.pointer.dragX || input.pointer.dragY) {
      this.followTarget = null;
      this.camera.pan(input.pointer.dragX, input.pointer.dragY);
    }
    if (input.wheel) {
      this.camera.setZoom(this.camera.targetZoom * Math.exp(-input.wheel * 0.0015));
    }

    if (this.introTimer > 0) {
      this.introTimer -= dt;
      if (this.introTimer <= 0 && this.followTarget) this.camera.setZoom(this.camera.baseZoom);
    } else if (this.followTarget) {
      this.camera.lookAt(this.followTarget.x, this.followTarget.y - 60);
    }

    for (const c of this.characters) c.update(dt);
    this.map.update(dt, this.camera);
    this.camera.update(dt);
  }

  render(ctx) {
    const { width, height } = this.game.renderer;
    this.map.renderBackground(ctx, this.camera, width, height);
    ctx.save();
    this.camera.apply(ctx);
    this.map.renderWorld(ctx, this.camera);
    for (const c of this.characters) c.draw(ctx);
    this.map.renderForeground(ctx, this.camera);
    ctx.restore();
  }
}
