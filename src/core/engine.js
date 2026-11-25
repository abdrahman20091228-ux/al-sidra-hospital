import * as THREE from 'three';
import { QUALITY_PRESETS, SETTINGS, STATE } from './config.js';
import { clamp, lerp } from '../utils/math.js';

function createFlashlightCookie() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  // Smooth realistic LED flashlight beam with subtle warm hotspot + soft outer spill
  const g = ctx.createRadialGradient(128, 128, 8, 128, 128, 124);
  g.addColorStop(0.0, 'rgba(255,252,240,1)');
  g.addColorStop(0.32, 'rgba(250,242,222,0.92)');
  g.addColorStop(0.58, 'rgba(200,192,172,0.52)');
  g.addColorStop(0.84, 'rgba(80,75,68,0.16)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Mobile-optimized Three.js rendering & lighting engine.
 * Designed specifically to eliminate phone overheating and battery drain:
 * - Capped DPR & thermal shadow-map frame skipping
 * - Smart outdoor/indoor atmospheric lighting transitions (never pitch black!)
 * - Single shadow-casting flashlight + cheap atmospheric accent point lights
 */
export class GameEngine {
  constructor(mountEl) {
    this.mountEl = mountEl;
    this.frameCounter = 0;

    this.renderer = new THREE.WebGLRenderer({
      antialias: SETTINGS.quality === 'high',
      powerPreference: 'default', // Avoid forcing peak-heat boost clocks on mobile SoCs
      stencil: false,
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap; // Much cooler than PCFSoftShadowMap on mobile
    this.renderer.shadowMap.autoUpdate = false; // Manual throttled shadow updates!
    this.renderer.shadowMap.needsUpdate = true;

    mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x09111c);
    this.scene.fog = new THREE.FogExp2(0x0b1522, 0.022);

    this.camera = new THREE.PerspectiveCamera(66, 16 / 9, 0.12, 280);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.skyDome = null;

    // ===== CINEMATIC NIGHT LIGHTING RIG =====
    this.hemi = new THREE.HemisphereLight(0x526e96, 0x1c2224, 0.85);
    this.scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0x223044, 0.65);
    this.scene.add(this.ambient);

    // Cool moonlight casting atmospheric highlights across forest canopy, wet mud, and facade
    this.moonDir = new THREE.DirectionalLight(0x9ab8e8, 0.92);
    this.moonDir.position.set(-28, 38, 12);
    this.scene.add(this.moonDir);

    this.moonRim = new THREE.DirectionalLight(0x3a5275, 0.34);
    this.moonRim.position.set(24, 18, 56);
    this.scene.add(this.moonRim);

    // Handheld Flashlight Rig (smoothly lags behind camera rotation for tactile weight)
    this.rig = new THREE.Object3D();
    this.scene.add(this.rig);

    this.flashlight = new THREE.SpotLight(0xfff0d4, 18, 28, Math.PI * 0.25, 0.62, 1.45);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = 0.35;
    this.flashlight.shadow.camera.far = 26;
    this.flashlight.shadow.bias = -0.0008;
    this.flashlight.shadow.normalBias = 0.025;
    this.flashlight.map = createFlashlightCookie();
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    // Soft local bounce fill near player so close walls/props have realistic ambient scatter
    this.bounceLight = new THREE.PointLight(0xdcc9a6, 0.75, 9.0, 1.7);
    this.bounceLight.position.set(0, -0.05, -0.8);
    this.rig.add(this.bounceLight);

    // Zone groups for instant visibility culling
    this.zones = {
      forest: new THREE.Group(),
      exterior: new THREE.Group(),
      hospital: new THREE.Group(),
      props: new THREE.Group(),
    };
    Object.values(this.zones).forEach((g) => this.scene.add(g));

    // Dynamic accent lights registered by world builders (e.g., road streetlamp, ambulance bay, reception, operating lamp, morgue)
    this.accentLights = [];

    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._indoorBlend = 0;

    this.applyQuality();
  }

  getMaxAnisotropy() {
    const preset = QUALITY_PRESETS[SETTINGS.quality] || QUALITY_PRESETS.balanced;
    return Math.min(preset.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
  }

  registerAccentLight(light, opts = {}) {
    this.accentLights.push({
      light,
      baseIntensity: light.intensity,
      flicker: opts.flicker || false,
      phase: opts.phase || Math.random() * 10,
      indoorOnly: opts.indoorOnly || false,
      outdoorOnly: opts.outdoorOnly || false,
      maxDist: opts.maxDist || 26,
    });
  }

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

  /**
   * Update atmospheric lighting, fog color/density, flashlight tracking, and zone culling.
   */
  updateLighting(dt, rt, playerPos) {
    const insideTarget = clamp((-playerPos.z - 5.2) / 3.2, 0, 1);
    this._indoorBlend += (insideTarget - this._indoorBlend) * (1 - Math.exp(-dt * 2.4));
    const k = this._indoorBlend;
    const br = SETTINGS.brightness; // 0..1

    // Smooth atmospheric sky/fog transition: misty midnight pine blue -> eerie clinical teal-slate indoors
    const fogR = lerp(0.045, 0.032, k);
    const fogG = lerp(0.082, 0.052, k);
    const fogB = lerp(0.135, 0.062, k);
    this.scene.fog.color.setRGB(fogR, fogG, fogB);
    this.scene.background.setRGB(fogR * 0.85, fogG * 0.85, fogB * 0.9);
    this.scene.fog.density = lerp(lerp(0.025, 0.017, br), lerp(0.044, 0.028, br), k);

    // Moonlight smoothly fades when deep inside the hospital
    this.moonDir.intensity = lerp(0.92 + br * 0.42, 0.0, k);
    this.moonRim.intensity = lerp(0.36 + br * 0.22, 0.0, k);

    // Rich hemisphere + ambient balance so architecture & textures always read cleanly without flat washout
    this.hemi.intensity = lerp(0.78 + br * 0.45, 0.36 + br * 0.42, k);
    this.hemi.color.setRGB(lerp(0.34, 0.26, k), lerp(0.46, 0.34, k), lerp(0.64, 0.38, k));
    this.hemi.groundColor.setRGB(lerp(0.12, 0.14, k), lerp(0.15, 0.16, k), lerp(0.14, 0.17, k));
    this.ambient.intensity = lerp(0.45 + br * 0.35, 0.30 + br * 0.38, k);

    // Flashlight battery & intensity
    const wantOn = STATE.lightOn && STATE.battMain > 0;
    if (wantOn && STATE.phase === 'play') {
      STATE.battMain = Math.max(0, STATE.battMain - dt * 0.055); // ~30 min exploration charge
    }
    const targetIntensity = wantOn ? (19.5 + br * 5.0) : 0;
    this.flashlight.intensity = targetIntensity;
    this.bounceLight.intensity = wantOn ? (1.15 + br * 0.55) : 0.16;
    STATE.lightLevel = wantOn ? 1 : 0;

    // Tactile smooth handheld flashlight follow
    this._v1.set(0.16, -0.22, -0.05).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    const follow = 1 - Math.exp(-dt * 12);
    this.rig.position.lerp(this._v1, follow);
    this.rig.quaternion.slerp(this.camera.quaternion, follow);

    this._v2.set(0, 0, -1).applyQuaternion(this.rig.quaternion);
    this.flashlight.position.copy(this.rig.position);
    this.flashlight.target.position.set(
      this.rig.position.x + this._v2.x * 14,
      this.rig.position.y + this._v2.y * 14,
      this.rig.position.z + this._v2.z * 14
    );

    // Distance-culled accent lights (keeps active GPU light count minimal for mobile!)
    for (let i = 0; i < this.accentLights.length; i++) {
      const item = this.accentLights[i];
      if (item.indoorOnly && k < 0.05) {
        item.light.intensity = 0;
        continue;
      }
      if (item.outdoorOnly && k > 0.95) {
        item.light.intensity = 0;
        continue;
      }
      const lp = item.light.position;
      const d = Math.hypot(lp.x - playerPos.x, lp.z - playerPos.z);
      if (d > item.maxDist) {
        item.light.intensity = 0;
        continue;
      }
      const atten = clamp(1 - Math.max(0, d - item.maxDist * 0.55) / (item.maxDist * 0.45), 0, 1);
      let mod = 1;
      if (item.flicker) {
        const s = Math.sin(rt * 11.3 + item.phase) * Math.sin(rt * 27.1 + item.phase * 2.1);
        mod = s > 0.74 ? 0.25 : 0.88 + 0.12 * Math.sin(rt * 4.2 + item.phase);
      }
      item.light.intensity = item.baseIntensity * atten * mod;
    }

    if (this.skyDome) {
      this.skyDome.position.set(playerPos.x, 0, playerPos.z);
    }

    // Zone frustum/occlusion culling: hide forest completely when deep inside hospital; hide interior furniture when deep in forest!
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
