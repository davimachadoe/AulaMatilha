// HUD da batalha (Etapa 1): info do mapa, câmera e atalhos.
// Vida, energia, mira, potência, vento e cronômetro entram nas Etapas 2 e 3.

import { html, bindActions } from '../dom.js';

export class BattleHud {
  constructor(game, { scene }) {
    this.game = game;
    this.scene = scene;
  }

  mount() {
    const el = html(`
      <div class="hud">
        <div class="hud-top">
          <div class="hud-chip map-chip">
            <strong class="map-name"></strong>
            <span class="muted small seed"></span>
          </div>
          <div class="hud-actions">
            <button class="btn btn-small" data-action="focusPlayer" title="Focar no jogador (1)">🎯 Eu</button>
            <button class="btn btn-small" data-action="focusDummy" title="Focar no alvo (2)">🪆 Alvo</button>
            <button class="btn btn-small" data-action="overview" title="Ver mapa inteiro (F)">🗺️ Mapa</button>
            <button class="btn btn-small" data-action="regen" title="Gerar novo terreno (R)">🔄 Novo</button>
            <button class="btn btn-small" data-action="menu" data-sound="back" title="Voltar ao menu (Esc)">✖ Menu</button>
          </div>
        </div>
        <div class="hud-fps" hidden></div>
        <div class="hud-bottom">
          <div class="hud-chip help">
            <span><kbd>Arrastar</kbd> mover câmera</span>
            <span><kbd>Roda</kbd>/<kbd>Pinça</kbd> zoom</span>
            <span><kbd>R</kbd> novo terreno</span>
            <span><kbd>Esc</kbd> menu</span>
          </div>
          <div class="hud-chip pending-note">🚧 Mira, disparo e vento: Etapa 2 · Movimento e turnos: Etapa 3</div>
        </div>
      </div>
    `);
    this.el = el;
    this.fpsEl = el.querySelector('.hud-fps');
    this._refresh();
    this._off = this.game.events.on('battle:regenerated', () => this._refresh());
    bindActions(el, {
      focusPlayer: () => this.scene.focus(this.scene.player),
      focusDummy: () => this.scene.focus(this.scene.dummy),
      overview: () => this.scene.overview(),
      regen: () => this.scene.regenerate(),
      menu: () => this.game.changeScene('menu'),
    });
    return el;
  }

  _refresh() {
    this.el.querySelector('.map-name').textContent = this.scene.map.def.name;
    this.el.querySelector('.seed').textContent = `semente ${this.scene.seed}`;
  }

  render() {
    const show = this.game.save.data.settings.showFps;
    this.fpsEl.hidden = !show;
    if (show) this.fpsEl.textContent = `${this.game.fps} FPS`;
  }

  unmount() {
    this._off?.();
  }
}
