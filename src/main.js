// Ponto de entrada: monta os serviços, registra cenas e telas e inicia o jogo.

import { Game } from './core/Game.js';
import { Renderer } from './core/Renderer.js';
import { Input } from './core/Input.js';
import { EventBus } from './core/EventBus.js';
import { createBrowserSaveManager } from './core/Storage.js';
import { AudioManager } from './audio/AudioManager.js';
import { UIManager } from './ui/UIManager.js';
import { MenuScene } from './scenes/MenuScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import { MainMenuScreen } from './ui/screens/MainMenuScreen.js';
import { MapSelectScreen } from './ui/screens/MapSelectScreen.js';
import { CharacterScreen } from './ui/screens/CharacterScreen.js';
import { SettingsScreen } from './ui/screens/SettingsScreen.js';
import { PendingScreen } from './ui/screens/PendingScreen.js';
import { BattleHud } from './ui/screens/BattleHud.js';

function showFatalError(err) {
  console.error(err);
  const box = document.getElementById('fatal');
  if (!box) return;
  box.hidden = false;
  box.querySelector('pre').textContent = String(err?.stack || err);
}

window.addEventListener('error', (e) => showFatalError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => showFatalError(e.reason));

async function boot() {
  const params = new URLSearchParams(location.search);
  if (params.has('test')) document.body.classList.add('no-anim');
  const canvas = document.getElementById('game');
  const save = createBrowserSaveManager();
  await save.load();
  if (save.lastError) console.warn('[Boot] save carregado com aviso:', save.lastError);

  const events = new EventBus();
  const game = new Game({
    renderer: new Renderer(canvas),
    input: new Input(canvas),
    audio: new AudioManager(save.data.settings),
    save,
    events,
  });
  game.ui = new UIManager(document.getElementById('ui'), game);
  events.on('error', showFatalError);

  game.registerScene('menu', MenuScene);
  game.registerScene('battle', BattleScene);

  game.ui.register('mainMenu', MainMenuScreen);
  game.ui.register('mapSelect', MapSelectScreen);
  game.ui.register('character', CharacterScreen);
  game.ui.register('settings', SettingsScreen);
  game.ui.register('pending', PendingScreen);
  game.ui.register('battleHud', BattleHud);

  // Atalhos de desenvolvimento: ?scene=battle&map=volcano&seed=42  ou  ?screen=character
  if (params.get('scene') === 'battle') {
    const seed = Number(params.get('seed'));
    game.changeScene('battle', { mapId: params.get('map') || 'tropical', ...(seed ? { seed } : {}) });
  } else {
    game.changeScene('menu');
    const screen = params.get('screen');
    if (screen && game.ui.screens.has(screen) && screen !== 'battleHud') game.ui.show(screen);
  }
  game.start();
  document.getElementById('loading')?.remove();

  // Acesso pelo console do navegador, útil para depurar.
  window.__game = game;
}

boot().catch(showFatalError);
