// Configurações salvas no perfil.

import { html, bindActions } from '../dom.js';

export class SettingsScreen {
  constructor(game) {
    this.game = game;
    this.confirmReset = false;
  }

  mount() {
    const s = this.game.save.data.settings;
    const el = html(`
      <div class="center-layout">
        <div class="card">
          <div class="card-header">
            <button class="btn btn-small" data-action="back" data-sound="back">← Voltar</button>
            <h2>Configurações</h2>
          </div>
          <label class="field range">
            <span>Volume geral <output data-out="masterVolume"></output></span>
            <input type="range" min="0" max="1" step="0.05" data-setting="masterVolume" value="${s.masterVolume}" />
          </label>
          <label class="field range">
            <span>Efeitos sonoros <output data-out="sfxVolume"></output></span>
            <input type="range" min="0" max="1" step="0.05" data-setting="sfxVolume" value="${s.sfxVolume}" />
          </label>
          <label class="field check">
            <input type="checkbox" data-setting="particles" ${s.particles ? 'checked' : ''} />
            <span>Partículas e clima (desligue em aparelhos lentos)</span>
          </label>
          <label class="field check">
            <input type="checkbox" data-setting="showFps" ${s.showFps ? 'checked' : ''} />
            <span>Mostrar FPS na batalha</span>
          </label>
          <hr />
          <button class="btn btn-danger" data-action="reset">Apagar progresso</button>
        </div>
      </div>
    `);
    this.el = el;
    const updateOutputs = () => {
      el.querySelectorAll('output[data-out]').forEach((o) => {
        o.textContent = `${Math.round(this.game.save.data.settings[o.dataset.out] * 100)}%`;
      });
    };
    updateOutputs();

    el.addEventListener('input', (e) => {
      const key = e.target.dataset.setting;
      if (!key) return;
      const settings = this.game.save.data.settings;
      settings[key] = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
      updateOutputs();
      this.game.audio.applySettings(settings);
      this.game.events.emit('settings:changed', settings);
      this._queueSave();
    });

    bindActions(el, {
      back: () => this.game.ui.show('mainMenu'),
      reset: async (btn) => {
        if (!this.confirmReset) {
          this.confirmReset = true;
          btn.textContent = 'Tem certeza? Clique de novo para apagar tudo';
          return;
        }
        await this.game.save.reset();
        this.game.events.emit('profile:changed', this.game.save.data.profile);
        this.game.events.emit('settings:changed', this.game.save.data.settings);
        this.game.audio.applySettings(this.game.save.data.settings);
        this.game.ui.toast('Progresso apagado.', 'success');
        this.game.ui.show('mainMenu');
      },
    });
    return el;
  }

  _queueSave() {
    clearTimeout(this._t);
    this._t = setTimeout(() => this.game.save.save(), 300);
  }

  unmount() {
    if (this._t) {
      clearTimeout(this._t);
      this.game.save.save();
    }
  }
}
