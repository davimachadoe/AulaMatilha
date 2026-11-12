// Gerencia as telas de interface (DOM sobre o canvas). Uma tela ativa por vez.
// Cada tela é uma classe com mount(root) / unmount() / render(dt) opcional.

export class UIManager {
  constructor(root, game) {
    this.root = root;
    this.game = game;
    this.screens = new Map();
    this.current = null;
    this.currentName = null;

    // Sons de interface para qualquer botão, sem cada tela precisar se preocupar.
    root.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn || btn.disabled) return;
      game.audio.play(btn.dataset.sound || 'click');
    });
    root.addEventListener('pointerover', (e) => {
      const btn = e.target.closest('button');
      if (btn && !btn.disabled && !btn.contains(e.relatedTarget)) game.audio.play('hover');
    });
  }

  register(name, ScreenClass) {
    this.screens.set(name, ScreenClass);
  }

  show(name, params = {}) {
    const ScreenClass = this.screens.get(name);
    if (!ScreenClass) throw new Error(`Tela desconhecida: ${name}`);
    this.current?.unmount?.();
    this.root.replaceChildren();
    this.current = new ScreenClass(this.game, params);
    this.currentName = name;
    const el = this.current.mount();
    el.classList.add('screen', `screen-${name}`);
    this.root.appendChild(el);
  }

  render(dt) {
    this.current?.render?.(dt);
  }

  /** Aviso rápido no canto da tela. */
  toast(message, kind = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${kind}`;
    el.textContent = message;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('show'));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 2200);
  }
}
