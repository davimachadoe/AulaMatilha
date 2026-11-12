// Gerencia o canvas principal: tamanho, densidade de pixels (DPR) e limpeza por frame.

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.width = 1;
    this.height = 1;
    this.dpr = 1;
    this.onResize = null;
    this.resize();
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 100));
  }

  resize() {
    // Limita o DPR em 2 para não pesar em telas muito densas (celulares).
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = Math.max(1, window.innerWidth);
    this.height = Math.max(1, window.innerHeight);
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;
    this.onResize?.(this.width, this.height);
  }

  /** Reseta a transformação para coordenadas de tela (pixels CSS). */
  beginFrame(clearColor = '#000') {
    const { ctx } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = clearColor;
    ctx.fillRect(0, 0, this.width, this.height);
  }
}
