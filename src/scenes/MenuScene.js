// Cenário animado atrás do menu principal: ilha tropical com o personagem do jogador.

import { Scene } from '../core/Game.js';
import { Camera } from '../core/Camera.js';
import { MapInstance } from '../maps/MapInstance.js';
import { getMap } from '../maps/maps.js';
import { Character } from '../characters/Character.js';

const MENU_SEED = 20261112;

export class MenuScene extends Scene {
  enter() {
    const { save, events } = this.game;
    this.map = new MapInstance(getMap('tropical'), MENU_SEED, { particles: save.data.settings.particles });
    this.camera = new Camera(this.map.world);
    const [spot] = this.map.spawnPoints(1);
    this.spot = spot;
    this.hero = new Character({
      name: save.data.profile.name,
      appearance: save.data.profile.appearance,
      x: spot.x,
      y: spot.y,
      facing: -1,
      isPlayer: true,
    });
    this.hero.aim = 20;
    this._off = events.on('profile:changed', (profile) => {
      this.hero.name = profile.name;
      this.hero.setAppearance(profile.appearance);
    });
    this._offSettings = events.on('settings:changed', (s) => {
      this.map.ambient.enabled = s.particles;
      if (!s.particles) this.map.particles.clear();
    });
    this.game.ui.show('mainMenu');
  }

  exit() {
    this._off?.();
    this._offSettings?.();
  }

  resize(w, h) {
    this.camera.setScreen(w, h);
    this._frame(true);
  }

  _frame(immediate) {
    // Em telas largas o herói fica à direita (o menu ocupa a esquerda); no celular, centralizado.
    const wide = this.camera.screenW > 820;
    const zoom = this.camera.baseZoom * (wide ? 1.7 : 1.4);
    this.camera.setZoom(zoom, immediate);
    const offsetX = wide ? -(this.camera.screenW * 0.22) / zoom : 0;
    // No celular o menu ocupa a parte de baixo: a câmera desce para o herói aparecer no alto.
    const offsetY = wide ? -20 : (this.camera.screenH * 0.2) / zoom;
    this.camera.lookAt(this.spot.x + offsetX, this.spot.y - 40 + offsetY, immediate);
  }

  update(dt) {
    this.hero.update(dt);
    this.map.update(dt, this.camera);
    this.camera.update(dt);
  }

  render(ctx) {
    const { width, height } = this.game.renderer;
    this.map.renderBackground(ctx, this.camera, width, height);
    ctx.save();
    this.camera.apply(ctx);
    this.map.renderWorld(ctx, this.camera);
    this.hero.draw(ctx, { showName: false, scale: 1 });
    this.map.renderForeground(ctx, this.camera);
    ctx.restore();
  }
}
