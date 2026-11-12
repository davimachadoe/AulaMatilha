// Entrada de teclado, mouse e toque, consultada a cada frame pelas cenas.

const isTypingTarget = (el) =>
  el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.pointer = { x: 0, y: 0, down: false, dragX: 0, dragY: 0, clicked: false };
    this.wheel = 0;
    this._pointers = new Map();
    this._pinchDist = 0;
    this._bind();
  }

  _bind() {
    window.addEventListener('keydown', (e) => {
      if (isTypingTarget(e.target)) return;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) {
        e.preventDefault();
      }
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.down.delete(e.code);
      this.released.add(e.code);
    });
    window.addEventListener('blur', () => this.down.clear());

    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      c.setPointerCapture(e.pointerId);
      this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.pointer.down = true;
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
      this._downAt = { x: e.clientX, y: e.clientY };
    });
    c.addEventListener('pointermove', (e) => {
      const prev = this._pointers.get(e.pointerId);
      if (prev && this._pointers.size === 1) {
        this.pointer.dragX += e.clientX - prev.x;
        this.pointer.dragY += e.clientY - prev.y;
      }
      if (prev) this._pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (this._pointers.size === 2) {
        const [a, b] = [...this._pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (this._pinchDist) this.wheel -= (d - this._pinchDist) * 2;
        this._pinchDist = d;
      }
      this.pointer.x = e.clientX;
      this.pointer.y = e.clientY;
    });
    const up = (e) => {
      this._pointers.delete(e.pointerId);
      if (this._pointers.size < 2) this._pinchDist = 0;
      if (this._pointers.size === 0) {
        this.pointer.down = false;
        if (this._downAt && Math.hypot(e.clientX - this._downAt.x, e.clientY - this._downAt.y) < 6) {
          this.pointer.clicked = true;
        }
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.wheel += e.deltaY;
      },
      { passive: false },
    );
  }

  /** Teclas virtuais (botões de toque na tela) se comportam como teclas reais. */
  setVirtual(code, isDown) {
    if (isDown) {
      if (!this.down.has(code)) this.pressed.add(code);
      this.down.add(code);
    } else if (this.down.has(code)) {
      this.down.delete(code);
      this.released.add(code);
    }
  }

  isDown(...codes) {
    return codes.some((c) => this.down.has(c));
  }

  wasPressed(...codes) {
    return codes.some((c) => this.pressed.has(c));
  }

  wasReleased(...codes) {
    return codes.some((c) => this.released.has(c));
  }

  /** Chamado no fim de cada frame para limpar estados de "um frame só". */
  endFrame() {
    this.pressed.clear();
    this.released.clear();
    this.pointer.dragX = 0;
    this.pointer.dragY = 0;
    this.pointer.clicked = false;
    this.wheel = 0;
  }
}
