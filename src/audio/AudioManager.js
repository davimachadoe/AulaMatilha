// Áudio com Web Audio API. Os sons são sintetizados (sem arquivos), o que mantém o jogo leve.
// Na Etapa 9, `play(id)` pode carregar amostras de /assets/sounds sem mudar quem chama.

export class AudioManager {
  constructor(settings) {
    this.ctx = null;
    this.master = null;
    this.settings = settings;
    this._unlock = this._unlock.bind(this);
    window.addEventListener('pointerdown', this._unlock, { once: true });
    window.addEventListener('keydown', this._unlock, { once: true });
  }

  _unlock() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.applySettings(this.settings);
    } catch (err) {
      console.warn('[Audio] indisponível', err);
    }
  }

  applySettings(settings) {
    this.settings = settings;
    if (this.master) this.master.gain.value = settings.masterVolume * settings.sfxVolume;
  }

  _tone({ type = 'sine', from, to = from, dur = 0.1, vol = 0.3, delay = 0 }) {
    const c = this.ctx;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  play(id) {
    if (!this.ctx || !this.master) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    switch (id) {
      case 'hover':
        this._tone({ type: 'sine', from: 880, to: 990, dur: 0.05, vol: 0.06 });
        break;
      case 'click':
        this._tone({ type: 'triangle', from: 520, to: 780, dur: 0.08, vol: 0.18 });
        break;
      case 'back':
        this._tone({ type: 'triangle', from: 600, to: 380, dur: 0.1, vol: 0.16 });
        break;
      case 'confirm':
        this._tone({ type: 'triangle', from: 523, dur: 0.08, vol: 0.18 });
        this._tone({ type: 'triangle', from: 784, dur: 0.12, vol: 0.18, delay: 0.08 });
        break;
      case 'error':
        this._tone({ type: 'square', from: 220, to: 160, dur: 0.18, vol: 0.1 });
        break;
      default:
        break;
    }
  }
}
