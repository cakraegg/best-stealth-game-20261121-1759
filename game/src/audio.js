// EMBERWICK sound: every noise is synthesised with WebAudio, no audio files.
// Footsteps tell the player where a guard is; the alarm stings when spotted.
// Audio is optional: if the browser refuses it, the game plays on silently.

export class SoundFX {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambientTimer = 0;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch {
      this.ctx = null;
    }
  }

  tone(freq, dur, type, gain, when = 0) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + when;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(gain, t0);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g).connect(this.ctx.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch {
      // Sound never blocks the game.
    }
  }

  noiseBurst(dur, gain, lowpass = 1200) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass;
      const g = this.ctx.createGain();
      g.gain.value = gain;
      src.connect(filter).connect(g).connect(this.ctx.destination);
      src.start(t0);
    } catch {
      // Sound never blocks the game.
    }
  }

  // A guard's footstep, quieter the further away it is.
  footstep(distance) {
    const gain = Math.max(0, 0.11 - distance / 5200);
    if (gain <= 0.005) return;
    this.noiseBurst(0.07, gain, 500);
  }

  pebble() {
    this.noiseBurst(0.09, 0.22, 2400);
    this.tone(1180, 0.08, 'sine', 0.06, 0.05);
  }

  pickup() {
    this.tone(880, 0.12, 'sine', 0.12);
    this.tone(1318, 0.18, 'sine', 0.1, 0.07);
  }

  pearl() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.1, i * 0.06));
  }

  alarm() {
    this.tone(220, 0.3, 'sawtooth', 0.12);
    this.tone(233, 0.3, 'sawtooth', 0.12, 0.16);
  }

  caught() {
    this.tone(196, 0.5, 'sawtooth', 0.14);
    this.tone(147, 0.7, 'sawtooth', 0.14, 0.2);
  }

  win() {
    [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.09, i * 0.09));
  }

  // Soft night crickets, called from the game loop on a timer.
  ambient(dt) {
    if (!this.ctx || this.muted) return;
    this.ambientTimer -= dt;
    if (this.ambientTimer > 0) return;
    this.ambientTimer = 2.4 + Math.random() * 2.2;
    this.tone(4200 + Math.random() * 600, 0.05, 'sine', 0.015);
    this.tone(4200 + Math.random() * 600, 0.05, 'sine', 0.012, 0.09);
  }
}
