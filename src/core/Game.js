// Núcleo do jogo: loop com passo fixo, gerenciador de cenas e acesso aos serviços.

import { PHYSICS } from './config.js';

/** Classe base de cena. Cenas desenham no canvas; telas de menu ficam na UI (DOM). */
export class Scene {
  constructor(game) {
    this.game = game;
  }
  enter(_params) {}
  exit() {}
  /** Lógica em passo fixo (física determinística). */
  update(_dt) {}
  /** Desenho; `alpha` = fração entre passos fixos, para interpolação. */
  render(_ctx, _alpha) {}
  resize(_w, _h) {}
}

export class Game {
  /**
   * @param {object} services  { renderer, input, audio, save, events, ui }
   */
  constructor(services) {
    Object.assign(this, services);
    this.scenes = new Map();
    this.scene = null;
    this.sceneName = null;
    this.running = false;
    this.time = 0;
    this.fps = 0;
    this._acc = 0;
    this._last = 0;
    this._fpsFrames = 0;
    this._fpsTime = 0;
    this._loop = this._loop.bind(this);

    this.renderer.onResize = (w, h) => this.scene?.resize(w, h);
  }

  registerScene(name, SceneClass) {
    this.scenes.set(name, SceneClass);
  }

  changeScene(name, params = {}) {
    const SceneClass = this.scenes.get(name);
    if (!SceneClass) throw new Error(`Cena desconhecida: ${name}`);
    this.scene?.exit();
    this.scene = new SceneClass(this);
    this.sceneName = name;
    this.scene.enter(params);
    this.scene.resize(this.renderer.width, this.renderer.height);
    this.events.emit('scene:changed', { name, params });
  }

  start() {
    this.running = true;
    this._last = performance.now();
    requestAnimationFrame(this._loop);
  }

  _loop(now) {
    if (!this.running) return;
    // Limita o delta para evitar "espiral da morte" ao voltar de outra aba.
    const frameDt = Math.min((now - this._last) / 1000, 0.25);
    this._last = now;
    this._acc += frameDt;

    const step = PHYSICS.fixedDt;
    try {
      while (this._acc >= step) {
        this.scene?.update(step);
        this.time += step;
        this._acc -= step;
      }
      const ctx = this.renderer.ctx;
      this.renderer.beginFrame();
      this.scene?.render(ctx, this._acc / step);
      this.ui?.render(frameDt);
    } catch (err) {
      this.running = false;
      this.events.emit('error', err);
      throw err;
    } finally {
      this.input.endFrame();
    }

    this._fpsFrames++;
    this._fpsTime += frameDt;
    if (this._fpsTime >= 0.5) {
      this.fps = Math.round(this._fpsFrames / this._fpsTime);
      this._fpsFrames = 0;
      this._fpsTime = 0;
    }
    requestAnimationFrame(this._loop);
  }
}
