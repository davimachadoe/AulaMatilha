// HUD da batalha: vento, ângulo, potência, arma, vida (no mundo), avisos e controles de toque.
// Cronômetro de turno entra na Etapa 3; energia e habilidades na Etapa 5.

import { html, esc, bindActions } from '../dom.js';
import { WEAPON_SLOTS, getWeapon } from '../../weapons/weapons.js';

const isTouch = () => window.matchMedia?.('(pointer: coarse)').matches;

export class BattleHud {
  constructor(game, { scene }) {
    this.game = game;
    this.scene = scene;
    this._last = {};
  }

  mount() {
    const el = html(`
      <div class="hud">
        <div class="hud-top">
          <div class="hud-chip map-chip">
            <strong class="map-name"></strong>
            <span class="muted small round"></span>
          </div>
          <div class="wind-box hud-chip" title="Vento: empurra o projétil para o lado da seta">
            <span class="wind-label">VENTO</span>
            <span class="wind-arrow"><span class="wind-fill"></span></span>
            <strong class="wind-value"></strong>
          </div>
          <div class="hud-actions">
            <button class="btn btn-small" data-action="focusPlayer" title="Focar no jogador">🎯 Eu</button>
            <button class="btn btn-small" data-action="focusDummy" title="Focar no alvo">🪆 Alvo</button>
            <button class="btn btn-small" data-action="overview" title="Ver mapa inteiro (F)">🗺️ Mapa</button>
            <button class="btn btn-small" data-action="preview" title="Prévia completa ou curta (T)">👁️ Prévia</button>
            <button class="btn btn-small" data-action="regen" title="Gerar novo terreno (R)">🔄 Novo</button>
            <button class="btn btn-small" data-action="menu" data-sound="back" title="Voltar ao menu (Esc)">✖ Menu</button>
          </div>
        </div>

        <div class="hud-banner" hidden></div>
        <div class="hud-fps" hidden></div>

        <div class="hud-bottom">
          <div class="hud-chip help">
            <span><kbd>↑</kbd><kbd>↓</kbd> ângulo (<kbd>Shift</kbd> fino)</span>
            <span><kbd>←</kbd><kbd>→</kbd> virar</span>
            <span><kbd>Espaço</kbd> segure e solte para atirar</span>
            <span><kbd>T</kbd> prévia</span>
            <span><kbd>R</kbd> novo mapa</span>
          </div>

          <div class="shot-panel hud-chip">
            <div class="weapon-slots">
              ${WEAPON_SLOTS.map(
                (id, i) => `<div class="weapon-slot active" title="${esc(getWeapon(id).description)}"><kbd>${i + 1}</kbd> ${esc(getWeapon(id).name)}</div>`,
              ).join('')}
            </div>
            <div class="angle-box"><span class="muted small">ÂNGULO</span><strong class="angle-value"></strong></div>
            <div class="power-box">
              <span class="muted small">POTÊNCIA <strong class="power-value"></strong></span>
              <div class="power-bar"><div class="power-fill"></div><div class="power-last" hidden></div></div>
            </div>
          </div>

          <div class="hud-chip stats small">
            <span>Tiros <strong data-stat="shots">0</strong></span>
            <span>Acertos <strong data-stat="hits">0</strong></span>
            <span>Melhor dano <strong data-stat="best">0</strong></span>
          </div>
        </div>

        <div class="touch-controls" ${isTouch() ? '' : 'hidden'}>
          <div class="touch-pad">
            <button class="btn touch-btn" data-key="ArrowUp" aria-label="Levantar mira">▲</button>
            <div class="touch-row">
              <button class="btn touch-btn" data-key="ArrowLeft" aria-label="Virar para a esquerda">◀</button>
              <button class="btn touch-btn" data-key="ArrowRight" aria-label="Virar para a direita">▶</button>
            </div>
            <button class="btn touch-btn" data-key="ArrowDown" aria-label="Abaixar mira">▼</button>
          </div>
          <button class="btn btn-primary touch-fire" data-key="Space">🔥 Segure</button>
        </div>
        <div class="hud-chip pending-note small">🚧 Andar, cronômetro de 25s e turnos: Etapa 3 · Mais armas e habilidades: Etapa 5</div>
      </div>
    `);
    this.el = el;
    this.q = (s) => el.querySelector(s);
    this.fpsEl = this.q('.hud-fps');
    this.bannerEl = this.q('.hud-banner');

    // Botões de toque viram teclas virtuais (mesmas regras do teclado).
    el.querySelectorAll('[data-key]').forEach((btn) => {
      const key = btn.dataset.key;
      const down = (e) => {
        e.preventDefault();
        btn.setPointerCapture?.(e.pointerId);
        this.game.input.setVirtual(key, true);
      };
      const up = () => this.game.input.setVirtual(key, false);
      btn.addEventListener('pointerdown', down);
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('lostpointercapture', up);
    });

    this._refreshMap();
    this._off = this.game.events.on('battle:regenerated', () => this._refreshMap());
    bindActions(el, {
      focusPlayer: () => this.scene.focus(this.scene.player),
      focusDummy: () => this.scene.focus(this.scene.dummy),
      overview: () => this.scene.overview(),
      preview: () => this.scene.togglePreview(),
      regen: () => this.scene.regenerate(),
      menu: () => this.game.changeScene('menu'),
    });
    return el;
  }

  _refreshMap() {
    this.q('.map-name').textContent = this.scene.map.def.name;
    this._last = {};
  }

  /** Atualiza o DOM só quando o valor muda (evita trabalho a cada frame). */
  _set(key, value, apply) {
    if (this._last[key] === value) return;
    this._last[key] = value;
    apply(value);
  }

  render() {
    const s = this.scene;
    const shot = s.shot;

    this._set('round', s.round, (v) => (this.q('.round').textContent = `Campo de treino · rodada ${v}`));

    this._set('wind', s.wind, (w) => {
      const abs = Math.abs(w);
      this.q('.wind-value').textContent = abs === 0 ? '0' : `${abs}`;
      const arrow = this.q('.wind-arrow');
      arrow.classList.toggle('left', w < 0);
      arrow.classList.toggle('calm', w === 0);
      // A barra cresce a partir do centro: vento 10 = metade da largura.
      this.q('.wind-fill').style.width = `${(abs / 10) * 50}%`;
    });

    this._set('angle', Math.round(shot.angle), (a) => (this.q('.angle-value').textContent = `${a}°`));

    const power = shot.charging ? shot.power : shot.lastPower ?? 0;
    this._set('power', Math.round(power), (p) => {
      this.q('.power-fill').style.width = `${p}%`;
      this.q('.power-value').textContent = `${p}%`;
    });
    this._set('charging', shot.charging, (c) => this.q('.power-bar').classList.toggle('charging', c));
    this._set('lastPower', shot.lastPower, (lp) => {
      const m = this.q('.power-last');
      m.hidden = lp == null;
      if (lp != null) m.style.left = `${lp}%`;
    });

    for (const key of ['shots', 'hits', 'best']) {
      this._set(`stat-${key}`, s.stats[key], (v) => (this.q(`[data-stat="${key}"]`).textContent = v));
    }

    const canShoot = s.phase === 'aim' && !s.player.defeated;
    this._set('canShoot', canShoot, (v) => this.el.classList.toggle('busy', !v));

    const bannerId = s.banner ? s.banner.id : -1;
    this._set('banner', bannerId, () => {
      const b = this.bannerEl;
      if (!s.banner) {
        b.hidden = true;
        return;
      }
      b.hidden = false;
      b.textContent = s.banner.text;
      b.className = `hud-banner banner-${s.banner.kind}`;
      // Reinicia a animação.
      void b.offsetWidth;
      b.classList.add('pop');
    });

    const show = this.game.save.data.settings.showFps;
    this.fpsEl.hidden = !show;
    if (show) this.fpsEl.textContent = `${this.game.fps} FPS`;
  }

  unmount() {
    this._off?.();
    for (const key of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']) this.game.input.setVirtual(key, false);
  }
}
