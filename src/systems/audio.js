import { SETTINGS } from '../core/config.js';
import { clamp, lerp } from '../utils/math.js';

/**
 * V3 STUDIO-GRADE SILENT HILL PROCEDURAL AUDIO ENGINE
 * - Real stereo synthetic Concrete Corridor Reverb (ConvolverNode impulse response!)
 * - Seamless outdoor pine forest (stereo wind + subtle night crickets + distant owl/thunder)
 *   -> desolate echoing indoor hospital resonance (sub-bass concrete hall + muffled window drafts)
 * - Dual-formant natural human breathing, fatigue panting, & organic lub-dub heartbeat
 * - Tactile surface-aware footsteps (wet mud squelch, forest pine crunch, courtyard grit, echoing tile heels)
 */
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.buses = {};
    this.reverbSend = null;
    this.reverbReturn = null;
    this.noiseBuf = null;
    this.whiteBuf = null;
    this.windGain = null;
    this.windFilter = null;
    this.cricketGain = null;
    this.droneGain = null;
    this.initialized = false;
    this.indoorBlend = 0;

    this.breathTimer = 2.0;
    this.heartTimer = 1.1;
  }

  _buildReverbIR(ctx) {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 2.1);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / len;
        // Fast early reflections + dark decaying concrete corridor tail
        const env = Math.pow(1 - t, 2.8) * (i < sr * 0.04 ? 0.9 : 0.48);
        const w = (Math.random() * 2 - 1) * env;
        lp = lp * 0.52 + w * 0.48; // dark concrete damping
        d[i] = lp;
      }
    }
    return ir;
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
      comp.threshold.value = -14;
      comp.knee.value = 18;
      comp.ratio.value = 5;
      comp.connect(this.ctx.destination);

      this.master = this.ctx.createGain();
      this.master.gain.value = 0.88;
      this.master.connect(comp);

      // Real stereo dark corridor convolution reverb bus
      const conv = this.ctx.createConvolver();
      conv.buffer = this._buildReverbIR(this.ctx);
      this.reverbSend = this.ctx.createGain();
      this.reverbSend.gain.value = 0.35;
      this.reverbReturn = this.ctx.createGain();
      this.reverbReturn.gain.value = 0.15;
      this.reverbSend.connect(conv);
      conv.connect(this.reverbReturn);
      this.reverbReturn.connect(this.master);

      for (const name of ['amb', 'foot', 'breath', 'sfx', 'ui']) {
        const g = this.ctx.createGain();
        g.connect(this.master);
        this.buses[name] = g;
      }
      // Route footsteps & world sfx into dynamic indoor reverb send
      this.buses.foot.connect(this.reverbSend);
      this.buses.sfx.connect(this.reverbSend);

      const sr = this.ctx.sampleRate;
      const len = sr * 3;
      this.noiseBuf = this.ctx.createBuffer(1, len, sr);
      this.whiteBuf = this.ctx.createBuffer(1, sr * 2, sr);
      const bData = this.noiseBuf.getChannelData(0);
      const wData = this.whiteBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const w = Math.random() * 2 - 1;
        last = (last + 0.022 * w) / 1.022;
        bData[i] = last * 3.2;
        if (i < wData.length) wData[i] = w;
      }

      // 1. Stereo Pine Forest Wind & Muffled Broken-Window Draft
      const windSrc = this.ctx.createBufferSource();
      windSrc.buffer = this.noiseBuf;
      windSrc.loop = true;
      this.windFilter = this.ctx.createBiquadFilter();
      this.windFilter.type = 'bandpass';
      this.windFilter.frequency.value = 360;
      this.windFilter.Q.value = 1.3;
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.14;
      windSrc.connect(this.windFilter);
      this.windFilter.connect(this.windGain);
      this.windGain.connect(this.buses.amb);
      windSrc.start();

      const windLfo = this.ctx.createOscillator();
      windLfo.frequency.value = 0.09;
      const windLfoG = this.ctx.createGain();
      windLfoG.gain.value = 150;
      windLfo.connect(windLfoG);
      windLfoG.connect(this.windFilter.frequency);
      windLfo.start();

      // 2. Subtle Distant Night Forest Cricket Chorus (fades out cleanly indoors!)
      const crOsc = this.ctx.createOscillator();
      crOsc.type = 'sine';
      crOsc.frequency.value = 4150;
      const crPulse = this.ctx.createOscillator();
      crPulse.frequency.value = 14.5;
      const crMod = this.ctx.createGain();
      crMod.gain.value = 0.008;
      crPulse.connect(crMod.gain);
      this.cricketGain = this.ctx.createGain();
      this.cricketGain.gain.value = 0.014;
      crOsc.connect(crMod);
      crMod.connect(this.cricketGain);
      this.cricketGain.connect(this.buses.amb);
      crOsc.start();
      crPulse.start();

      // 3. Oppressive Silent Hill Empty Concrete Building Sub-Resonance (fades in indoors!)
      this.droneGain = this.ctx.createGain();
      this.droneGain.gain.value = 0.0;
      this.droneGain.connect(this.buses.amb);
      const droneFlt = this.ctx.createBiquadFilter();
      droneFlt.type = 'lowpass';
      droneFlt.frequency.value = 140;
      droneFlt.connect(this.droneGain);
      [36.5, 37.9, 55.0, 73.2].forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        osc.type = i === 3 ? 'triangle' : 'sine';
        osc.frequency.value = freq;
        const g = this.ctx.createGain();
        g.gain.value = i < 2 ? 0.055 : 0.018;
        osc.connect(g);
        g.connect(droneFlt);
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
    this.indoorBlend = indoorBlend;
    const k = Math.min(1, dt * 2.4);

    // Crossfade outdoor night forest <-> echoing hollow abandoned hospital
    const targetWind = lerp(0.15, 0.042, indoorBlend);
    const targetWindFreq = lerp(390, 210, indoorBlend);
    const targetCricket = lerp(0.014, 0.0, indoorBlend);
    const targetDrone = lerp(0.05, 0.68, indoorBlend);
    const targetReverb = lerp(0.08, 0.58, indoorBlend);

    this.windGain.gain.value += (targetWind - this.windGain.gain.value) * k;
    this.windFilter.frequency.value += (targetWindFreq - this.windFilter.frequency.value) * k;
    this.cricketGain.gain.value += (targetCricket - this.cricketGain.gain.value) * k;
    this.droneGain.gain.value += (targetDrone - this.droneGain.gain.value) * k;
    this.reverbReturn.gain.value += (targetReverb - this.reverbReturn.gain.value) * k;

    // ===== NATURAL DUAL-FORMANT HUMAN BREATHING & EXERTION =====
    const tension = clamp(exertion * 1.18 + (isDarkInside ? 0.24 : 0.05), 0, 1);
    this.breathTimer -= dt;
    if (this.breathTimer <= 0) {
      this.playBreath(tension);
      this.breathTimer = lerp(3.6, 0.88, tension);
    }

    // Organic lub-dub heartbeat when fatigued or deep inside dark hospital
    if (tension > 0.34) {
      this.heartTimer -= dt;
      if (this.heartTimer <= 0) {
        this.playHeartbeat(0.09 + tension * 0.24);
        this.heartTimer = lerp(1.15, 0.54, tension);
      }
    }
  }

  playBreath(intensity = 0.25) {
    if (!this.ctx || !this.whiteBuf) return;
    const durIn = lerp(0.62, 0.28, intensity);
    const durOut = lerp(0.92, 0.38, intensity);
    const vol = lerp(0.022, 0.135, intensity);
    // Soft dual-formant throat/chest inhale
    this._noiseBurst({
      buf: this.whiteBuf,
      dur: durIn,
      freq: lerp(720, 1080, intensity),
      freqEnd: lerp(520, 820, intensity),
      type: 'bandpass',
      q: 2.6,
      peak: vol * 0.72,
      bus: 'breath',
    });
    // Warm soft chest exhale
    this._noiseBurst({
      buf: this.whiteBuf,
      dur: durOut,
      delay: durIn + 0.07,
      freq: lerp(540, 820, intensity),
      freqEnd: 240,
      type: 'bandpass',
      q: 1.6,
      peak: vol,
      bus: 'breath',
    });
  }

  playHeartbeat(vol = 0.14) {
    if (!this.ctx) return;
    // Authentic low-passed lub-dub double pulse
    this._tone(64, 30, 0.14, vol, 'sine', 0, 'breath');
    this._tone(54, 28, 0.16, vol * 0.62, 'sine', 0.17, 'breath');
  }

  _noiseBurst({ buf = null, dur = 0.1, delay = 0, freq = 600, freqEnd = null, type = 'bandpass', q = 1.0, peak = 0.2, rate = 1, pan = 0, bus = 'sfx' }) {
    if (!this.ctx || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const src = this.ctx.createBufferSource();
    src.buffer = buf || this.noiseBuf;
    src.playbackRate.value = rate;
    const flt = this.ctx.createBiquadFilter();
    flt.type = type;
    flt.frequency.setValueAtTime(freq, t);
    if (freqEnd) flt.frequency.exponentialRampToValueAtTime(Math.max(40, freqEnd), t + dur);
    flt.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.006, peak), t + Math.min(0.045, dur * 0.28));
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
    g.gain.exponentialRampToValueAtTime(Math.max(0.005, vol), t + 0.008);
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
    const boost = sprint ? 1.32 : 1.0;
    const jit = (Math.random() - 0.5) * 0.18;
    if (surface === 'mud') {
      // Heavy wet squelching boot in thick clay mud + wet suction release
      this._noiseBurst({ dur: 0.17, freq: 380 + jit * 90, freqEnd: 165, type: 'bandpass', q: 2.3, peak: 0.28 * boost, rate: 0.78 + jit, bus: 'foot' });
      this._noiseBurst({ buf: this.whiteBuf, dur: 0.08, delay: 0.05, freq: 1420, freqEnd: 680, type: 'bandpass', q: 2.8, peak: 0.075 * boost, bus: 'foot' });
    } else if (surface === 'forest') {
      // Crisp pine needles & dry twig crunch
      this._noiseBurst({ buf: this.whiteBuf, dur: 0.11, freq: 1350 + jit * 350, freqEnd: 620, type: 'bandpass', q: 1.4, peak: 0.14 * boost, bus: 'foot' });
      this._noiseBurst({ dur: 0.09, freq: 260, type: 'lowpass', peak: 0.16 * boost, bus: 'foot' });
    } else if (surface === 'tile' || surface === 'stairs') {
      // Hollow echoing boot heel on dirty abandoned hospital terrazzo/concrete stairs (with real reverb!)
      this._tone(165 + jit * 35, 72, 0.065, 0.11 * boost, 'triangle', 0, 'foot');
      this._noiseBurst({ buf: this.whiteBuf, dur: 0.055, freq: 1900 + jit * 300, freqEnd: 700, type: 'bandpass', q: 1.6, peak: 0.09 * boost, bus: 'foot' });
      this._noiseBurst({ dur: 0.08, freq: 320, type: 'lowpass', peak: 0.18 * boost, bus: 'foot' });
    } else {
      // Cracked courtyard asphalt grit
      this._noiseBurst({ buf: this.whiteBuf, dur: 0.085, freq: 920 + jit * 220, freqEnd: 380, type: 'bandpass', q: 1.2, peak: 0.12 * boost, bus: 'foot' });
      this._tone(120, 62, 0.05, 0.07 * boost, 'sine', 0, 'foot');
    }
  }

  playAmbientEvent(isIndoor) {
    if (!this.ctx) return;
    const pan = (Math.random() - 0.5) * 1.5;
    if (isIndoor) {
      const r = Math.random();
      if (r < 0.34) {
        // Resonant water droplet echoing down concrete hallway via ConvolverNode
        const f = 1280 + Math.random() * 440;
        this._tone(f, f * 0.62, 0.065, 0.065, 'sine', 0, 'sfx', pan);
      } else if (r < 0.62) {
        // Slow rusted iron hinge / pipe groan
        const f = 185 + Math.random() * 55;
        this._tone(f, f * 0.74, 1.15, 0.032, 'sawtooth', 0, 'sfx', pan);
        this._tone(f * 1.52, f * 1.18, 1.0, 0.018, 'triangle', 0.06, 'sfx', pan);
      } else if (r < 0.84) {
        // Distant echoing muffled metallic bang somewhere on another floor
        this._tone(96, 38, 0.38, 0.085, 'triangle', 0, 'sfx', pan);
        this._noiseBurst({ dur: 0.24, freq: 380, freqEnd: 110, peak: 0.09, pan, bus: 'sfx' });
      } else {
        // Subtle hollow draft moan through cracked window
        this._noiseBurst({ dur: 1.9, freq: 340, freqEnd: 190, type: 'bandpass', q: 5.5, peak: 0.055, pan, bus: 'sfx' });
      }
    } else {
      const r = Math.random();
      if (r < 0.36) {
        // Deep rolling distant valley thunder
        this._noiseBurst({ dur: 2.6, freq: 135, freqEnd: 46, type: 'lowpass', peak: 0.22, rate: 0.42, pan, bus: 'sfx' });
      } else if (r < 0.68) {
        // Haunting distant forest owl
        this._tone(395, 345, 0.34, 0.045, 'sine', 0, 'sfx', pan);
        this._tone(355, 295, 0.52, 0.038, 'sine', 0.42, 'sfx', pan);
      } else {
        // Wind gust rustling pine branches + snapping twig
        this._noiseBurst({ dur: 0.85, freq: 680, freqEnd: 250, peak: 0.1, rate: 0.85, pan, bus: 'sfx' });
        this._noiseBurst({ buf: this.whiteBuf, dur: 0.04, delay: 0.22, freq: 2100, type: 'bandpass', q: 2.2, peak: 0.06, pan, bus: 'sfx' });
      }
    }
  }

  paperRustle() {
    this._noiseBurst({ buf: this.whiteBuf, dur: 0.18, freq: 1850, freqEnd: 820, type: 'bandpass', q: 1.5, peak: 0.09, bus: 'ui' });
    this._noiseBurst({ buf: this.whiteBuf, dur: 0.14, delay: 0.09, freq: 1450, freqEnd: 650, type: 'bandpass', q: 1.3, peak: 0.06, bus: 'ui' });
  }

  flashlightClick(on) {
    // Crisp tactile mechanical two-stage metal button click-clack
    this._noiseBurst({ buf: this.whiteBuf, dur: 0.018, freq: on ? 3200 : 2400, type: 'bandpass', q: 2.2, peak: 0.16, bus: 'ui' });
    this._tone(on ? 1580 : 980, on ? 880 : 540, 0.025, 0.065, 'square', 0.008, 'ui');
  }

  uiClick() {
    this._tone(580, 720, 0.04, 0.035, 'sine', 0, 'ui');
  }

  missionDone() {
    this._tone(440, 440, 0.14, 0.055, 'sine', 0, 'ui');
    this._tone(659, 659, 0.22, 0.06, 'sine', 0.14, 'ui');
  }

  clueFound() {
    this.paperRustle();
    this._tone(440, 587, 0.16, 0.05, 'triangle', 0.05, 'ui');
  }

  chatPing() {
    this._tone(960, 780, 0.028, 0.015, 'sine', 0, 'ui');
  }
}
