// Tela honesta para sistemas que ainda não foram construídos.

import { html, esc, bindActions } from '../dom.js';

const DETAILS = {
  6: 'Inventário, equipamentos, loja, missões e progressão de nível.',
  7: 'Mapas extras, IA com dificuldades, modos de jogo e chefes.',
  8: 'Multiplayer online, contas e ranking no servidor.',
};

export class PendingScreen {
  constructor(game, { title, icon = '🚧', stage }) {
    this.game = game;
    this.title = title;
    this.icon = icon;
    this.stage = stage;
  }

  mount() {
    const el = html(`
      <div class="center-layout">
        <div class="card pending-card">
          <div class="pending-icon">${this.icon}</div>
          <h2>${esc(this.title)}</h2>
          <p class="pending-badge">Pendente · Etapa ${this.stage}</p>
          <p>Este sistema ainda não foi implementado.</p>
          <p class="muted">${esc(DETAILS[this.stage] ?? '')}</p>
          <button class="btn" data-action="back" data-sound="back">← Voltar</button>
        </div>
      </div>
    `);
    bindActions(el, { back: () => this.game.ui.show('mainMenu') });
    return el;
  }
}
