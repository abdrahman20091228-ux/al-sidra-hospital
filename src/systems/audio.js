import { SETTINGS } from '../core/config.js';
import { clamp, lerp } from '../utils/math.js';

/**
 * Silent Hill Atmospheric WebAudio Engine:
 * - Player breathing & exertion system: quiet tense breathing in dark + heavy panting & heartbeat when sprinting/tired!
 * - Rich outdoor/indoor ambient transitions: howling forest wind, distant thunder, hollow hospital wind resonance,
 *   rusted metal groans, echoing pipe drips, creaking wood/floorboards, and surface-aware footsteps!
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buses = {};
    this.noiseBuf = null;
    this.windGain = null;
    this.windFilter = null;
    this.droneGain = null;
    this.initialized = false;

    this.breathTimer = 1.6;
    this.heartTimer = 1.1;
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

      for (const name of ['amb', 'foot', 'breath', 'sfx', 'ui']) {
        const g = this.ctx.createGain();
        g.connect(this.master);
        this.buses[name] = g;
      }

      // Reusable 3-second brown noise buffer for wind, breathing, thunder, footsteps
      const sr = this.ctx.sampleRate;
      const len = sr * 3;
      this.noiseBuf = this.ctx.createBuffer(1, len, sr);
      const data = this.noiseBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.024 * w) / 1.024;
        data[i] = last * 3.1;
      }

      // Continuous howling night wind through pine needles & broken hospital windows
      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = this.noiseBuf;
      windSrc.loop = true;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 390;
      this.windFilter.Q.value = 1.15;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.13;
      windSrc.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.buses.amb);
      windSrc.start();

      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.085;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = 165;
      lfo.connect(lfoG);
      lfoG.connect(this.windFilter.frequency);
      lfo.start();

      // Desolate Silent Hill sub-bass indoor resonance drone (NO electrical buzz — pure eerie empty building resonance!)
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.0;
      this.droneGain.connect(this.buses.amb);
      [38.5, 40.1, 77.0].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = i === 2 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.value = i === 2 ? 0.012 : 0.055;
        osc.connect(g);
        g.connect(this.droneGain);
        osc.start();
      });

      this.applyVolumes();
    } catch {
      this.initialized = false;
    }
  }

  applyVolumes() {
    if (!this.ctx || !this.master) return;
    this.master.gain.value = SETTINGS.vol.master * 0.92;
    for (const k of ['amb', 'foot', 'breath', 'sfx', 'ui']) {
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

  updateEnvironment(dt, indoorBlend, exertion = 0, isDarkInside = false) {
    if (!this.ctx || !this.windGain) return;
    const k = Math.min(1, dt * 2.2);
    const targetWind = lerp(0.14, 0.048, indoorBlend);
    const targetWindFreq = lerp(420, 230, indoorBlend);
    const targetDrone = lerp(0.08, 0.72, indoorBlend);
    this.windGain.gain.value += (targetWind - this.windGain.gain.value) * k;
    this.windFilter.frequency.value += (targetWindFreq - this.windFilter.frequency.value) * k;
    this.droneGain.gain.value += (targetDrone - this.droneGain.gain.value) * k;

    // ===== PLAYER BREATHING & EXERTION / TIREDNESS AUDIO =====
    // Tension level combines stamina exhaustion + being deep inside the dark abandoned hospital
    const tension = clamp(exertion * 1.15 + (isDarkInside ? 0.28 : 0.06), 0, 1);
    this.breathTimer -= dt;
    if (this.breathTimer <= 0) {
      this.playBreath(tension);
      // Fast heavy panting when exhausted (~0.85s), slow quiet breaths at rest (~3.4s)
      this.breathTimer = lerp(3.4, 0.85, tension);
    }

    // Muffled rhythmic heartbeat pulse when tired or deep in darkness
    if (tension > 0.36) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.playHeartbeat(0.08 + tension * 0.24);
        this.heartTimer = lerp(1.18, 0.56, tension);
      }
    }
  }

  playBreath(intensity = 0.3) {
    if (!this.ctx || !this.noiseBuf) return;
    const durIn = lerp(0.55, 0.28, intensity);
    const durOut = lerp(0.85, 0.36, intensity);
    const vol = lerp(0.032, 0.16, intensity);
    // Inhale (slightly higher bandpass breath air)
    this._noiseBurst({
      dur: durIn,
      freq: lerp(620, 960, intensity),
      freqEnd: lerp(420, 680, intensity),
      type: 'bandpass',
      q: 1.9,
      peak: vol * 0.75,
      rate: 0.65 + intensity * 0.3,
      bus: 'breath',
    });
    // Exhale (warmer deeper sigh / pant after brief pause)
    this._noiseBurst({
      dur: durOut,
      delay: durIn + 0.06,
      freq: lerp(460, 740, intensity),
      freqEnd: 210,
      type: 'lowpass',
      q: 1.1,
      peak: vol,
      rate: 0.5 + intensity * 0.22,
      bus: 'breath',
    });
  }

  playHeartbeat(vol = 0.14) {
    if (!this.ctx) return;
    this._tone(68, 34, 0.13, vol, 'sine', 0, 'breath');
    this._tone(58, 30, 0.15, vol * 0.6, 'sine', 0.17, 'breath');
  }

  _noiseBurst({ dur = 0.1, delay = 0, freq = 600, freqEnd = null, type = 'bandpass', q = 1.0, peak = 0.2, rate = 1, pan = 0, bus = 'sfx' }) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
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
    g.gain.exponentialRampToValueAtTime(Math.max(0.008, peak), t + Math.min(0.04, dur * 0.3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(flt);
    let node = flt;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      node.connect(p);
      node = p;
    }
    node.connect(g);
    g.connect(this.buses[bus] || this.buses.sfx);
    src.start(t);
    src.stop(t + dur + 0.06);
  }

  _tone(f0, f1, dur, vol, type = 'sine', delay = 0, bus = 'ui', pan = 0) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(Math.max(22, f1), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.006, vol), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    let out = g;
    if (pan && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = clamp(pan, -1, 1);
      g.connect(p);
      out = p;
    }
    out.connect(this.buses[bus] || this.buses.ui);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  footstep(surface, sprint) {
    const boost = sprint ? 1.38 : 1.0;
    if (surface === 'mud') {
      // Heavy wet squelching mud footstep
      this._noiseBurst({ dur: 0.16, freq: 480, freqEnd: 210, type: 'bandpass', q: 2.1, peak: 0.3 * boost, rate: 0.72 + Math.random() * 0.2, bus: 'foot' });
      this._noiseBurst({ dur: 0.09, freq: 1550, type: 'highpass', peak: 0.09 * boost, rate: 1.35, bus: 'foot' });
    } else if (surface === 'forest') {
      // Crunching dry twigs & pine needles
      this._noiseBurst({ dur: 0.12, freq: 1180 + Math.random() * 420, type: 'bandpass', q: 1.1, peak: 0.24 * boost, rate: 1.12 + Math.random() * 0.25, bus: 'foot' });
    } else if (surface === 'tile' || surface === 'stairs') {
      // Hollow echoing abandoned tile step + subtle debris grit
      this._noiseBurst({ dur: 0.08, freq: 340 + Math.random() * 90, type: 'lowpass', peak: 0.26 * boost, rate: 0.9, bus: 'foot' });
      this._tone(195 + Math.random() * 45, 88, 0.07, 0.07 * boost, 'triangle', 0, 'foot');
    } else {
      this._noiseBurst({ dur: 0.09, freq: 620 + Math.random() * 140, type: 'bandpass', q: 0.9, peak: 0.23 * boost, rate: 0.95, bus: 'foot' });
    }
  }

  playAmbientEvent(isIndoor) {
    if (!this.ctx) return;
    const pan = (Math.random() - 0.5) * 1.4;
    if (isIndoor) {
      const r = Math.random();
      if (r < 0.35) {
        // Echoing water droplet inside wet dark corridor
        this._tone(1380 + Math.random() * 340, 760, 0.08, 0.055, 'sine', 0, 'sfx', pan);
        this._tone(1320, 720, 0.09, 0.022, 'sine', 0.22, 'sfx', pan * 0.6);
      } else if (r < 0.68) {
        // Slow eerie rusted metal door / pipe groan
        this._tone(210 + Math.random() * 60, 145, 0.85, 0.045, 'sawtooth', 0, 'sfx', pan);
      } else {
        // Distant heavy structural settle / building thud
        this._tone(78, 32, 0.48, 0.09, 'sine', 0, 'sfx', pan);
        this._noiseBurst({ dur: 0.35, freq: 240, freqEnd: 85, peak: 0.09, pan, bus: 'sfx' });
      }
    } else {
      const r = Math.random();
      if (r < 0.35) {
        // Distant rolling thunder across the dark pine valley
        this._noiseBurst({ dur: 2.2, freq: 145, freqEnd: 55, type: 'lowpass', peak: 0.22, rate: 0.45, pan, bus: 'sfx' });
      } else if (r < 0.7) {
        // Lone night owl echoing in deep woods
        this._tone(410, 335, 0.36, 0.05, 'sine', 0, 'sfx', pan);
        this._tone(355, 300, 0.48, 0.04, 'sine', 0.44, 'sfx', pan);
      } else {
        // Wind gust snapping pine branches
        this._noiseBurst({ dur: 0.65, freq: 760, freqEnd: 290, peak: 0.11, rate: 0.82, pan, bus: 'sfx' });
      }
    }
  }

  paperRustle() {
    this._noiseBurst({ dur: 0.22, freq: 1650, freqEnd: 780, type: 'bandpass', q: 1.3, peak: 0.14, rate: 1.25, bus: 'ui' });
  }

  flashlightClick(on) {
    this._tone(on ? 1280 : 760, on ? 960 : 520, 0.04, 0.075, 'square', 0, 'ui');
  }

  uiClick() {
    this._tone(540, 680, 0.045, 0.038, 'sine', 0, 'ui');
  }

  missionDone() {
    this._tone(440, 440, 0.12, 0.055, 'sine', 0, 'ui');
    this._tone(660, 660, 0.2, 0.06, 'sine', 0.14, 'ui');
  }

  clueFound() {
    this.paperRustle();
    this._tone(440, 587, 0.15, 0.05, 'triangle', 0.04, 'ui');
  }

  chatPing() {
    this._tone(1080, 820, 0.032, 0.018, 'sine', 0, 'ui');
  }
}
