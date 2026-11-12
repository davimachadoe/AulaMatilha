// Escolha do mapa para a batalha.

import { html, esc, bindActions } from '../dom.js';
import { MAPS } from '../../maps/maps.js';

export class MapSelectScreen {
  constructor(game) {
    this.game = game;
  }

  mount() {
    const el = html(`
      <div class="center-layout">
        <div class="card wide">
          <div class="card-header">
            <button class="btn btn-small" data-action="back" data-sound="back">← Voltar</button>
            <h2>Escolha o mapa</h2>
          </div>
          <p class="muted">Modo disponível: <strong>Campo de treino</strong> (você + boneco de treino).
            Combate contra IA e outros modos chegam nas próximas etapas.</p>
          <div class="map-grid">
            ${MAPS.map(
              (m) => `
              <button class="map-card" data-action="pick" data-id="${m.id}" data-sound="confirm">
                <div class="map-thumb" style="background: linear-gradient(180deg, ${m.sky[0]}, ${m.sky[1]} 55%, ${m.palette.top} 56%, ${m.palette.soil} 75%, ${m.fluid.top} 76%, ${m.fluid.bottom})"></div>
                <div class="map-name">${esc(m.name)}</div>
                <div class="map-desc">${esc(m.description)}</div>
              </button>`,
            ).join('')}
          </div>
        </div>
      </div>
    `);
    bindActions(el, {
      back: () => this.game.ui.show('mainMenu'),
      pick: (btn) => this.game.changeScene('battle', { mapId: btn.dataset.id }),
    });
    return el;
  }
}
