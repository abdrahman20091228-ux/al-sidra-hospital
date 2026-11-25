import { SETTINGS } from '../core/config.js';
import { clamp, lerp } from '../utils/math.js';

/**
 * Lightweight, mobile-friendly procedural WebAudio soundscape engine.
 * Adapts continuously between outdoor pine forest ambiance and hollow hospital acoustics,
 * with distinct footstep synthesis for forest floor, wet mud, asphalt, tile, and concrete stairs.
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buses = {};
    this.noiseBuf = null;
    this.windGain = null;
    this.windFilter = null;
    this.humGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      this.ctx = new AC();
      this.initialized = true;

      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 6;
      comp.connect(this.ctx.destination);

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(comp);

      for (const name of ['amb', 'foot', 'sfx', 'ui']) {
        const g = this.ctx.createGain();
        g.connect(this.master);
        this.buses[name] = g;
      }

      // 3-second brown noise buffer reused across wind & footsteps
      const sr = this.ctx.sampleRate;
      const len = sr * 3;
      this.noiseBuf = this.ctx.createBuffer(1, len, sr);
      const data = this.noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.025 * w) / 1.025;
        data[i] = last * 3.0;
      }

      // Forest wind loop
      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = this.noiseBuf;
      windSrc.loop = true;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 440;
      this.windFilter.Q.value = 0.75;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.11;
      windSrc.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.buses.amb);
      windSrc.start();

      // Subtle slow wind swell LFO
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.09;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = 140;
      lfo.connect(lfoG);
      lfoG.connect(this.windFilter.frequency);
      lfo.start();

      // Indoor hospital electrical/ventilation drone
      this.humGain = this.ctx.createGain();
      this.humGain.gain.value = 0.0;
      this.humGain.connect(this.buses.amb);
      [58, 116.5].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = i === 0 ? 'sine' : 'triangle';
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.value = i === 0 ? 0.065 : 0.015;
        osc.connect(g);
        g.connect(this.humGain);
        osc.start();
      });

      this.applyVolumes();
    } catch {
      this.initialized = false;
    }
  }

  applyVolumes() {
    if (!this.ctx || !this.master) return;
    this.master.gain.value = SETTINGS.vol.master * 0.9;
    for (const k of ['amb', 'foot', 'sfx', 'ui']) {
      if (this.buses[k]) {
        const v = SETTINGS.vol[k] ?? 1;
        this.buses[k].gain.value = v * v;
      }
    }
  }

  suspend() {
    if (this.ctx && this.ctx.state === 'running') this.ctx.suspend().catch(() => {});
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  updateEnvironment(dt, indoorBlend) {
    if (!this.ctx || !this.windGain) return;
    const k = Math.min(1, dt * 2.5);
    const targetWind = lerp(0.13, 0.025, indoorBlend);
    const targetHum = lerp(0.0, 0.72, indoorBlend);
    this.windGain.gain.value += (targetWind - this.windGain.gain.value) * k;
    this.humGain.gain.value += (targetHum - this.humGain.gain.value) * k;
  }

  _noiseBurst({ dur = 0.1, freq = 600, freqEnd = null, type = 'bandpass', q = 1.0, peak = 0.2, rate = 1, bus = 'sfx' }) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = rate;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(freq, t);
    if (freqEnd) flt.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur);
    flt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.01, peak), t + Math.min(0.018, dur * 0.25));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    flt.connect(g);
    g.connect(this.buses[bus] || this.buses.sfx);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  _tone(f0, f1, dur, vol, type = 'sine', delay = 0, bus = 'ui') {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(25, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.008, vol), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.buses[bus] || this.buses.ui);
    osc.start(t);
    osc.stop(t + dur + 0.04);
  }

  footstep(surface, sprint) {
    const boost = sprint ? 1.35 : 1.0;
    if (surface === 'mud') {
      // Wet squelchy mud footstep
      this._noiseBurst({ dur: 0.14, freq: 520, freqEnd: 240, type: 'bandpass', q: 1.8, peak: 0.28 * boost, rate: 0.75 + Math.random() * 0.2, bus: 'foot' });
      this._noiseBurst({ dur: 0.08, freq: 1450, type: 'highpass', peak: 0.08 * boost, rate: 1.3, bus: 'foot' });
    } else if (surface === 'forest') {
      // Crisp pine needles & twigs
      this._noiseBurst({ dur: 0.11, freq: 1100 + Math.random() * 400, type: 'bandpass', q: 1.1, peak: 0.22 * boost, rate: 1.1 + Math.random() * 0.25, bus: 'foot' });
    } else if (surface === 'tile' || surface === 'stairs') {
      // Crisp hollow hospital tile tap
      this._noiseBurst({ dur: 0.075, freq: 340 + Math.random() * 90, type: 'lowpass', peak: 0.26 * boost, rate: 0.9, bus: 'foot' });
      this._tone(210 + Math.random() * 45, 95, 0.06, 0.065 * boost, 'triangle', 0, 'foot');
    } else {
      // Cracked asphalt
      this._noiseBurst({ dur: 0.085, freq: 620 + Math.random() * 140, type: 'bandpass', q: 0.9, peak: 0.22 * boost, rate: 0.95, bus: 'foot' });
    }
  }

  playAmbientEvent(isIndoor) {
    if (!this.ctx) return;
    if (isIndoor) {
      // Distant water drip or metallic pipe resonance (pure atmosphere, no cheap monster jumpscare!)
      if (Math.random() < 0.6) {
        this._tone(1320 + Math.random() * 300, 740, 0.08, 0.045, 'sine', 0, 'sfx');
      } else {
        this._tone(180 + Math.random() * 60, 120, 0.55, 0.04, 'triangle', 0, 'sfx');
      }
    } else {
      // Distant night owl hoot or pine branch rustle
      if (Math.random() < 0.5) {
        this._tone(420, 340, 0.35, 0.045, 'sine', 0, 'sfx');
        this._tone(360, 310, 0.45, 0.038, 'sine', 0.42, 'sfx');
      } else {
        this._noiseBurst({ dur: 0.4, freq: 720, freqEnd: 360, peak: 0.08, rate: 0.85, bus: 'sfx' });
      }
    }
  }

  flashlightClick(on) {
    this._tone(on ? 1280 : 760, on ? 960 : 520, 0.04, 0.075, 'square', 0, 'ui');
  }

  uiClick() {
    this._tone(580, 720, 0.045, 0.04, 'sine', 0, 'ui');
  }

  missionDone() {
    this._tone(587, 587, 0.11, 0.065, 'sine', 0, 'ui');
    this._tone(880, 880, 0.18, 0.07, 'sine', 0.12, 'ui');
  }

  clueFound() {
    this._tone(440, 660, 0.12, 0.06, 'triangle', 0, 'ui');
    this._tone(660, 880, 0.2, 0.06, 'triangle', 0.12, 'ui');
  }

  chatPing() {
    this._tone(1180, 880, 0.035, 0.022, 'sine', 0, 'ui');
  }
}
