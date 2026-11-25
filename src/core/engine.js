import * as THREE from 'three';
import { QUALITY_PRESETS, SETTINGS, STATE } from './config.js';
import { clamp, lerp } from '../utils/math.js';

function createFlashlightCookie() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  // Natural vintage incandescent beam: bright warm center hotspot fading smoothly into deep darkness (no hard outer ring!)
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
  g.addColorStop(0.0, 'rgba(255,248,228,1)');
  g.addColorStop(0.22, 'rgba(250,238,208,0.94)');
  g.addColorStop(0.45, 'rgba(205,192,162,0.56)');
  g.addColorStop(0.68, 'rgba(115,108,92,0.22)');
  g.addColorStop(0.86, 'rgba(38,36,30,0.06)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Silent Hill Darkness & Flashlight-Only Lighting Engine.
 * - ZERO powered hospital lights!
 * - Faint, ghostly moonlight outdoors that fades smoothly to near-zero as you go deeper inside the abandoned hospital.
 * - Only the player's handheld flashlight cuts through the oppressive fog & shadows!
 * - Mobile thermal friendly: capped DPR, manual shadow skipping, zero-render pause, zone culling.
 */
export class GameEngine {
  constructor(mountEl) {
    this.mountEl = mountEl;
    this.frameCounter = 0;

    this.renderer = new THREE.WebGLRenderer({
      antialias: SETTINGS.quality === 'high',
      powerPreference: 'default',
      stencil: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x030508);
    this.scene.fog = new THREE.FogExp2(0x05080c, 0.032);

    this.camera = new THREE.PerspectiveCamera(65, 16 / 9, 0.1, 280);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.skyDome = null;

    // ===== SILENT HILL FAINT MOONLIGHT + DEEP SHADOW RIG =====
    this.hemi = new THREE.HemisphereLight(0x283850, 0x0a0c0d, 0.26);
    this.scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0x101822, 0.18);
    this.scene.add(this.ambient);

    // Very faint silvery moonlight outdoors — fades completely to 0 deep inside the hospital!
    this.moonDir = new THREE.DirectionalLight(0x7892be, 0.28);
    this.moonDir.position.set(-34, 42, -20);
    this.scene.add(this.moonDir);

    // Handheld Vintage Flashlight (The ONLY real light source in the abandoned hospital!)
    this.rig = new THREE.Object3D();
    this.scene.add(this.rig);

    this.flashlight = new THREE.SpotLight(0xffe8be, 38, 38, Math.PI * 0.31, 0.72, 1.32);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = 0.28;
    this.flashlight.shadow.camera.far = 32;
    this.flashlight.shadow.bias = -0.0007;
    this.flashlight.shadow.normalBias = 0.025;
    this.flashlight.map = createFlashlightCookie();
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    // Subtle warm bounce scatter directly around the flashlight beam for natural close-range depth
    this.bounceLight = new THREE.PointLight(0xdcc292, 1.05, 9.0, 1.8);
    this.bounceLight.position.set(0.05, -0.06, -1.15);
    this.rig.add(this.bounceLight);

    // Zone groups for instant mobile culling
    this.zones = {
      forest: new THREE.Group(),
      exterior: new THREE.Group(),
      hospital: new THREE.Group(),
      props: new THREE.Group(),
    };
    Object.values(this.zones).forEach((g) => this.scene.add(g));

    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._indoorBlend = 0;

    this.applyQuality();
  }

  getMaxAnisotropy() {
    const preset = QUALITY_PRESETS[SETTINGS.quality] || QUALITY_PRESETS.balanced;
    return Math.min(preset.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
  }

  // Kept as no-op hook if any environmental light is ever needed; hospital itself has ZERO powered lights!
  registerAccentLight() {}

  applyQuality() {
    const preset = QUALITY_PRESETS[SETTINGS.quality] || QUALITY_PRESETS.balanced;
    const dpr = Math.min(window.devicePixelRatio || 1, preset.dprCap);
    this.renderer.setPixelRatio(dpr);
    this.flashlight.castShadow = preset.shadows;
    if (this.flashlight.shadow.mapSize.width !== preset.shadowSize) {
      this.flashlight.shadow.mapSize.set(preset.shadowSize, preset.shadowSize);
      if (this.flashlight.shadow.map) {
        this.flashlight.shadow.map.dispose();
        this.flashlight.shadow.map = null;
      }
    }
    this.renderer.shadowMap.needsUpdate = true;
    this.resize();
  }

  resize() {
    const w = this.mountEl.clientWidth || window.innerWidth;
    const h = this.mountEl.clientHeight || window.innerHeight;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  updateLighting(dt, rt, playerPos) {
    // Progressive depth darkening: moonlight drops as you cross entrance (z=-6) and vanishes deeper inside (z=-26)!
    const entranceFactor = clamp((-playerPos.z - 4.5) / 5.5, 0, 1);
    const deepFactor = clamp((-playerPos.z - 8.0) / 22.0, 0, 1);
    this._indoorBlend += (entranceFactor - this._indoorBlend) * (1 - Math.exp(-dt * 2.6));
    const k = this._indoorBlend;
    const br = SETTINGS.brightness; // user brightness slider (default 0.22)

    // Oppressive Silent Hill night fog: deep midnight mist outside -> pitch slate-charcoal abyss indoors
    const fogR = lerp(0.011, 0.006, k);
    const fogG = lerp(0.016, 0.008, k);
    const fogB = lerp(0.024, 0.009, k);
    this.scene.fog.color.setRGB(fogR, fogG, fogB);
    this.scene.background.setRGB(fogR * 0.7, fogG * 0.7, fogB * 0.75);
    this.scene.fog.density = lerp(lerp(0.029, 0.021, br), lerp(0.064, 0.042, br), k);

    // Faint moonlight outdoors -> drops rapidly inside entrance -> 0.0 deep inside the hospital!
    const moonFade = (1 - k * 0.88) * (1 - deepFactor);
    this.moonDir.intensity = (0.28 + br * 0.14) * moonFade;

    // Very dim ambient floor so silhouettes barely breathe outside, and deep inside ONLY the flashlight reveals the dark
    this.hemi.intensity = lerp(0.26 + br * 0.16, Math.max(0.025, 0.055 * (1 - deepFactor * 0.65) + br * 0.07), k);
    this.hemi.color.setRGB(lerp(0.24, 0.12, k), lerp(0.32, 0.15, k), lerp(0.44, 0.16, k));
    this.hemi.groundColor.setRGB(0.04, 0.045, 0.045);
    this.ambient.intensity = lerp(0.15 + br * 0.12, 0.03 + br * 0.06, k);

    // Handheld Flashlight beam (slight organic micro-tremor, warm incandescent cone!)
    const wantOn = STATE.lightOn && STATE.battMain > 0;
    if (wantOn && STATE.phase === 'play') {
      STATE.battMain = Math.max(0, STATE.battMain - dt * 0.04);
    }
    const flicker = wantOn && Math.sin(rt * 23.0) * Math.sin(rt * 57.0) > 0.96 ? 0.65 : 1.0;
    const beamPower = wantOn ? (38.0 + br * 9.0) * flicker : 0;
    this.flashlight.intensity = beamPower;
    this.bounceLight.intensity = wantOn ? (1.05 + br * 0.35) * flicker : 0;
    STATE.lightLevel = wantOn ? 1 : 0;

    // Tactile smooth handheld flashlight lag
    this._v1.set(0.15, -0.20, -0.05).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    const follow = 1 - Math.exp(-dt * 11);
    this.rig.position.lerp(this._v1, follow);
    this.rig.quaternion.slerp(this.camera.quaternion, follow);

    this._v2.set(0, 0, -1).applyQuaternion(this.rig.quaternion);
    this.flashlight.position.copy(this.rig.position);
    this.flashlight.target.position.set(
      this.rig.position.x + this._v2.x * 16,
      this.rig.position.y + this._v2.y * 16,
      this.rig.position.z + this._v2.z * 16
    );

    if (this.skyDome) {
      this.skyDome.position.set(playerPos.x, 0, playerPos.z);
    }

    // Mobile occlusion/zone culling
    this.zones.forest.visible = playerPos.z > -12;
    this.zones.props.visible = playerPos.z < 18;
  }

  render() {
    const preset = QUALITY_PRESETS[SETTINGS.quality] || QUALITY_PRESETS.balanced;
    this.frameCounter++;
    if (preset.shadows && this.flashlight.intensity > 0) {
      if (preset.shadowSkip === 0 || this.frameCounter % (preset.shadowSkip + 1) === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
