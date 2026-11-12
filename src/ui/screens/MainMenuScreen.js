// Tela inicial / lobby: logo, cartão do jogador e menu principal.

import { html, esc, bindActions, formatNumber } from '../dom.js';

// Telas ainda não implementadas apontam para a etapa em que serão construídas.
const MENU = [
  { id: 'play', label: 'Jogar', icon: '⚔️', primary: true },
  { id: 'character', label: 'Personagem', icon: '🧑' },
  { id: 'inventory', label: 'Inventário', icon: '🎒', pending: 6 },
  { id: 'equipment', label: 'Equipamentos', icon: '🛡️', pending: 6 },
  { id: 'shop', label: 'Loja', icon: '🛒', pending: 6 },
  { id: 'missions', label: 'Missões', icon: '📜', pending: 6 },
  { id: 'ranking', label: 'Ranking', icon: '🏆', pending: 8 },
  { id: 'settings', label: 'Configurações', icon: '⚙️' },
];

export class MainMenuScreen {
  constructor(game) {
    this.game = game;
  }

  mount() {
    const { profile, currency } = this.game.save.data;
    const xpNeeded = 100; // Etapa 6: curva de XP real
    const el = html(`
      <div class="menu-layout">
        <div class="menu-panel">
          <h1 class="logo"><span>Battle</span><span>Islands</span></h1>
          <div class="player-card">
            <div class="player-name">${esc(profile.name)}</div>
            <div class="player-level">Nv. ${profile.level}</div>
            <div class="xp-bar" title="Experiência"><div style="width:${Math.min(100, (profile.xp / xpNeeded) * 100)}%"></div></div>
            <div class="currency">
              <span class="gold" title="Ouro">🪙 ${formatNumber(currency.gold)}</span>
              <span class="crystal" title="Cristais">💎 ${formatNumber(currency.crystals)}</span>
            </div>
          </div>
          <nav class="menu-buttons">
            ${MENU.map(
              (m) => `
              <button class="btn ${m.primary ? 'btn-primary btn-big' : ''}" data-action="go" data-id="${m.id}">
                <span class="btn-icon">${m.icon}</span>${m.label}
                ${m.pending ? `<span class="tag-pending">Etapa ${m.pending}</span>` : ''}
              </button>`,
            ).join('')}
          </nav>
          <div class="version">Etapa 1 · protótipo jogável</div>
        </div>
      </div>
    `);

    bindActions(el, {
      go: (btn) => {
        const item = MENU.find((m) => m.id === btn.dataset.id);
        if (item.pending) {
          this.game.ui.show('pending', { title: item.label, icon: item.icon, stage: item.pending });
          return;
        }
        if (item.id === 'play') this.game.ui.show('mapSelect');
        if (item.id === 'character') this.game.ui.show('character');
        if (item.id === 'settings') this.game.ui.show('settings');
      },
    });
    return el;
  }
}
