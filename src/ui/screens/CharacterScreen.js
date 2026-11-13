// Tela de personagem (versão Etapa 1): prévia em tempo real e personalização básica.
// A Etapa 4 transforma cada peça em item com raridade, atributos e desbloqueio.

import { html, esc, bindActions } from '../dom.js';
import { APPEARANCE_FIELDS, getOption, cycleOption, randomAppearance } from '../../characters/appearance.js';
import { Character } from '../../characters/Character.js';

const POSES = [
  ['idle', 'Parado'],
  ['victory', 'Vitória'],
  ['defeat', 'Derrota'],
];

export class CharacterScreen {
  constructor(game) {
    this.game = game;
    const { profile } = game.save.data;
    this.name = profile.name;
    this.appearance = { ...profile.appearance };
    this.dirty = false;
    this.confirmLeave = false;
    this.preview = new Character({ name: this.name, appearance: this.appearance, facing: 1 });
  }

  mount() {
    const el = html(`
      <div class="center-layout">
        <div class="card wide character-card">
          <div class="card-header">
            <button class="btn btn-small" data-action="back" data-sound="back">← Voltar</button>
            <h2>Personagem</h2>
          </div>
          <div class="character-layout">
            <div class="preview-col">
              <canvas class="preview-canvas" width="300" height="300"></canvas>
              <div class="pose-buttons">
                ${POSES.map(([id, label]) => `<button class="btn btn-small ${id === 'idle' ? 'active' : ''}" data-action="pose" data-pose="${id}">${label}</button>`).join('')}
              </div>
            </div>
            <div class="options-col">
              <label class="field">
                <span>Nome</span>
                <input type="text" class="name-input" maxlength="16" value="${esc(this.name)}" autocomplete="off" />
              </label>
              <div class="option-rows">
                ${APPEARANCE_FIELDS.map(
                  ([field, label]) => `
                  <div class="option-row">
                    <span class="option-label">${label}</span>
                    <button class="btn btn-arrow" data-action="cycle" data-field="${field}" data-dir="-1" aria-label="Anterior">◀</button>
                    <span class="option-value" data-value="${field}"></span>
                    <button class="btn btn-arrow" data-action="cycle" data-field="${field}" data-dir="1" aria-label="Próximo">▶</button>
                  </div>`,
                ).join('')}
              </div>
              <p class="muted small sprite-note" hidden>O modelo ilustrado tem visual fixo: as outras opções valem para o modelo Desenhado.</p>
              <p class="muted small">Itens com raridade, roupas especiais, asas e mascotes: Etapa 4.</p>
              <div class="actions">
                <button class="btn" data-action="random">🎲 Aleatório</button>
                <button class="btn btn-primary" data-action="save" data-sound="confirm">💾 Salvar</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `);
    this.el = el;
    this.canvas = el.querySelector('.preview-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.backBtn = el.querySelector('[data-action="back"]');
    const nameInput = el.querySelector('.name-input');
    nameInput.addEventListener('input', () => {
      this.name = nameInput.value;
      this.preview.name = this.name;
      this._markDirty();
    });

    bindActions(el, {
      back: () => this._back(),
      cycle: (btn) => {
        this.appearance = cycleOption(this.appearance, btn.dataset.field, Number(btn.dataset.dir));
        this._applyAppearance();
      },
      random: () => {
        this.appearance = { ...randomAppearance(), model: this.appearance.model };
        this._applyAppearance();
      },
      pose: (btn) => {
        this.preview.state = btn.dataset.pose;
        el.querySelectorAll('[data-action="pose"]').forEach((b) => b.classList.toggle('active', b === btn));
      },
      save: () => this._save(),
    });
    this._refreshLabels();
    return el;
  }

  _applyAppearance() {
    this.preview.setAppearance(this.appearance);
    this._refreshLabels();
    this._markDirty();
  }

  _markDirty() {
    this.dirty = true;
    this.confirmLeave = false;
    this.backBtn.textContent = '← Voltar';
  }

  _refreshLabels() {
    // Com modelo ilustrado, as peças do boneco desenhado ficam esmaecidas.
    const illustrated = this.appearance.model !== 'drawn';
    this.el.querySelector('.sprite-note').hidden = !illustrated;
    this.el.querySelectorAll('.option-row').forEach((row) => {
      const field = row.querySelector('[data-field]').dataset.field;
      row.classList.toggle('dimmed', illustrated && field !== 'model');
    });
    for (const [field] of APPEARANCE_FIELDS) {
      const opt = getOption(field, this.appearance[field]);
      const span = this.el.querySelector(`[data-value="${field}"]`);
      span.textContent = opt.label;
      span.style.setProperty('--swatch', opt.color ?? 'transparent');
      span.classList.toggle('has-swatch', Boolean(opt.color));
    }
  }

  async _save() {
    const name = this.name.trim();
    if (name.length < 2) {
      this.game.audio.play('error');
      this.game.ui.toast('O nome precisa ter pelo menos 2 letras.', 'error');
      return;
    }
    const { save, events, ui } = this.game;
    save.data.profile.name = name;
    save.data.profile.appearance = { ...this.appearance };
    const ok = await save.save();
    this.dirty = false;
    events.emit('profile:changed', save.data.profile);
    ui.toast(ok ? 'Personagem salvo!' : 'Não foi possível salvar (armazenamento indisponível).', ok ? 'success' : 'error');
  }

  _back() {
    if (this.dirty && !this.confirmLeave) {
      this.confirmLeave = true;
      this.backBtn.textContent = 'Sair sem salvar?';
      return;
    }
    this.game.ui.show('mainMenu');
  }

  render(dt) {
    const { ctx, canvas } = this;
    this.preview.update(dt);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const g = ctx.createRadialGradient(150, 170, 20, 150, 170, 150);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    this.preview.x = 150;
    this.preview.y = 255;
    this.preview.draw(ctx, { showName: false, scale: 3 });
  }
}
