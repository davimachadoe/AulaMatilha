// Câmera 2D com zoom, seguimento suave, limites do mundo e tremor (screen shake).

import { clamp, lerp } from './math.js';
import { CAMERA } from './config.js';

export class Camera {
  constructor(world) {
    this.world = world;
    this.x = world.width / 2;
    this.y = world.height / 2;
    this.zoom = 1;
    this.targetX = this.x;
    this.targetY = this.y;
    this.targetZoom = 1;
    this.screenW = 1;
    this.screenH = 1;
    this.shakeTime = 0;
    this.shakeDuration = 0;
    this.shakeAmount = 0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.followSpeed = 6;
  }

  setScreen(w, h) {
    this.screenW = w;
    this.screenH = h;
  }

  /** Zoom base que faz CAMERA.viewHeight pixels do mundo caberem na altura da tela. */
  get baseZoom() {
    return this.screenH / CAMERA.viewHeight;
  }

  /** Zoom mínimo que ainda cobre o mundo inteiro (não mostra fora do mapa). */
  get fitZoom() {
    return Math.max(this.screenW / this.world.width, this.screenH / this.world.height);
  }

  lookAt(x, y, immediate = false) {
    this.targetX = x;
    this.targetY = y;
    if (immediate) {
      this.x = x;
      this.y = y;
    }
  }

  setZoom(z, immediate = false) {
    this.targetZoom = clamp(z, Math.max(CAMERA.minZoom, this.fitZoom), CAMERA.maxZoom);
    if (immediate) this.zoom = this.targetZoom;
  }

  shake(amount, duration = 0.35) {
    this.shakeAmount = Math.max(this.shakeAmount, amount);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTime = this.shakeDuration;
  }

  /** Move a câmera em pixels de tela (arrastar). */
  pan(dxScreen, dyScreen) {
    this.targetX -= dxScreen / this.zoom;
    this.targetY -= dyScreen / this.zoom;
    this.x = this.targetX;
    this.y = this.targetY;
  }

  update(dt) {
    const k = 1 - Math.exp(-this.followSpeed * dt);
    this.zoom = lerp(this.zoom, this.targetZoom, k);
    this.x = lerp(this.x, this.targetX, k);
    this.y = lerp(this.y, this.targetY, k);
    this._clamp();

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const p = Math.max(0, this.shakeTime / this.shakeDuration);
      const a = this.shakeAmount * p * p;
      this.offsetX = (Math.random() * 2 - 1) * a;
      this.offsetY = (Math.random() * 2 - 1) * a;
      if (this.shakeTime <= 0) this.shakeAmount = 0;
    } else {
      this.offsetX = this.offsetY = 0;
    }
  }

  _clamp() {
    const halfW = this.screenW / 2 / this.zoom;
    const halfH = this.screenH / 2 / this.zoom;
    const clampAxis = (v, half, size) => (half * 2 >= size ? size / 2 : clamp(v, half, size - half));
    this.x = clampAxis(this.x, halfW, this.world.width);
    this.y = clampAxis(this.y, halfH, this.world.height);
    this.targetX = clampAxis(this.targetX, halfW, this.world.width);
    this.targetY = clampAxis(this.targetY, halfH, this.world.height);
  }

  /** Aplica a transformação mundo -> tela no contexto. */
  apply(ctx) {
    ctx.translate(this.screenW / 2 + this.offsetX, this.screenH / 2 + this.offsetY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  screenToWorld(sx, sy) {
    return {
      x: (sx - this.screenW / 2) / this.zoom + this.x,
      y: (sy - this.screenH / 2) / this.zoom + this.y,
    };
  }

  worldToScreen(wx, wy) {
    return {
      x: (wx - this.x) * this.zoom + this.screenW / 2,
      y: (wy - this.y) * this.zoom + this.screenH / 2,
    };
  }

  /** Retângulo do mundo visível (com margem), útil para culling e partículas. */
  viewRect(margin = 0) {
    const halfW = this.screenW / 2 / this.zoom;
    const halfH = this.screenH / 2 / this.zoom;
    return {
      x0: this.x - halfW - margin,
      y0: this.y - halfH - margin,
      x1: this.x + halfW + margin,
      y1: this.y + halfH + margin,
    };
  }
}
