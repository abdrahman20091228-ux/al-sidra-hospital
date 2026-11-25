import * as THREE from 'three';
import { QUALITY_PRESETS, SETTINGS, STATE } from './config.js';
import { clamp, lerp } from '../utils/math.js';

function createFlashlightCookie() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d');
  // Tight focused handheld incandescent flashlight hotspot with smooth pitch-dark falloff
  const g = ctx.createRadialGradient(128, 128, 3, 128, 128, 124);
  g.addColorStop(0.0, 'rgba(255,248,228,1)');
  g.addColorStop(0.28, 'rgba(248,236,204,0.92)');
  g.addColorStop(0.54, 'rgba(182,170,142,0.44)');
  g.addColorStop(0.78, 'rgba(72,68,58,0.12)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Silent Hill Pitch-Darkness & Tight Right-Hand Flashlight Engine.
 * - camera.near = 0.035 to eliminate close-up wall near-plane clipping!
 * - True pitch-black distant fog (ZERO milky-grey haze!).
 * - Tight narrow right-hand flashlight (~70% smaller diameter than floodlight) held slightly to the right!
 * - Zero working interior/exterior hospital lights; ultra-faint outdoor moonlight fades to 0 inside!
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
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;

    mountEl.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x020408);
    this.scene.fog = new THREE.FogExp2(0x020408, 0.022);

    // Near plane 0.035 prevents wall layers from clipping away when standing flush against a wall
    this.camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.035, 280);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);
    this.skyDome = null;

    // ===== BALANCED HORROR MOONLIGHT & EYE-ADAPTED DARKNESS RIG =====
    this.hemi = new THREE.HemisphereLight(0x4a668a, 0x101418, 0.42);
    this.scene.add(this.hemi);

    this.ambient = new THREE.AmbientLight(0x1e2a38, 0.22);
    this.scene.add(this.ambient);

    // Silvery haunting moonlight outdoors — fades cleanly to 0 deep inside the abandoned hospital
    this.moonDir = new THREE.DirectionalLight(0x90b0de, 0.58);
    this.moonDir.position.set(-34, 42, -20);
    this.scene.add(this.moonDir);

    // Handheld Right-Hand Vintage Flashlight (tight center hotspot + natural soft reflector spill!)
    this.rig = new THREE.Object3D();
    this.scene.add(this.rig);

    // 1) Primary tight focused right-hand beam hotspot (casts dramatic crisp shadows)
    this.flashlight = new THREE.SpotLight(0xffe8be, 58, 40, Math.PI * 0.155, 0.62, 1.25);
    this.flashlight.castShadow = true;
    this.flashlight.shadow.mapSize.set(1024, 1024);
    this.flashlight.shadow.camera.near = 0.22;
    this.flashlight.shadow.camera.far = 36;
    this.flashlight.shadow.bias = -0.0006;
    this.flashlight.shadow.normalBias = 0.022;
    this.flashlight.map = createFlashlightCookie();
    this.scene.add(this.flashlight);
    this.scene.add(this.flashlight.target);

    // 2) Secondary soft reflector spill halo (non-shadow -> negligible GPU cost; gently reveals room silhouettes around beam!)
    this.spillLight = new THREE.SpotLight(0xd9ccb2, 15, 22, Math.PI * 0.42, 0.92, 1.55);
    this.spillLight.castShadow = false;
    this.scene.add(this.spillLight);
    this.scene.add(this.spillLight.target);

    // 3) Realistic close-range light bounce off walls/floors so interior spaces never become a 100% blind void
    this.bounceLight = new THREE.PointLight(0xd8c29a, 2.4, 11.5, 1.65);
    this.bounceLight.position.set(0.18, -0.08, -1.35);
    this.rig.add(this.bounceLight);

    this.zones = {
      forest: new THREE.Group(),
      exterior: new THREE.Group(),
      hospital: new THREE.Group(),
      props: new THREE.Group(),
    };
    Object.values(this.zones).forEach((g) => this.scene.add(g));

    this._v1 = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._vRight = new THREE.Vector3();
    this._indoorBlend = 0;

    this.applyQuality();
  }

  getMaxAnisotropy() {
    const preset = QUALITY_PRESETS[SETTINGS.quality] || QUALITY_PRESETS.high;
    return Math.min(preset.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
  }

  registerAccentLight() {}

  applyQuality() {
    const preset = QUALITY_PRESETS[SETTINGS.quality] || QUALITY_PRESETS.high;
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
    const entranceFactor = clamp((-playerPos.z - 4.5) / 5.5, 0, 1);
    const deepFactor = clamp((-playerPos.z - 8.0) / 22.0, 0, 1);
    this._indoorBlend += (entranceFactor - this._indoorBlend) * (1 - Math.exp(-dt * 2.8));
    const k = this._indoorBlend;
    const br = SETTINGS.brightness;

    // DEEP DARK DISTANCE FOG (ZERO milky-grey haze, yet readable mid-range visibility!)
    const fogR = lerp(0.0045, 0.0018, k);
    const fogG = lerp(0.0065, 0.0022, k);
    const fogB = lerp(0.0105, 0.0030, k);
    this.scene.fog.color.setRGB(fogR, fogG, fogB);
    this.scene.background.setRGB(fogR * 0.65, fogG * 0.65, fogB * 0.75);
    this.scene.fog.density = lerp(lerp(0.022, 0.015, br), lerp(0.036, 0.024, br), k);

    // Silvery moonlight outdoors -> fades cleanly down to 0 deep inside the abandoned hospital
    const moonFade = (1 - k * 0.88) * (1 - deepFactor);
    this.moonDir.intensity = (0.58 + br * 0.26) * moonFade;

    // Dark-adapted vision: still very moody and scary indoors, but walls & doorways remain faintly perceptible
    this.hemi.intensity = lerp(0.42 + br * 0.22, Math.max(0.11, 0.18 * (1 - deepFactor * 0.28) + br * 0.14), k);
    this.hemi.color.setRGB(lerp(0.32, 0.18, k), lerp(0.42, 0.22, k), lerp(0.56, 0.25, k));
    this.hemi.groundColor.setRGB(lerp(0.07, 0.06, k), lerp(0.08, 0.065, k), lerp(0.085, 0.068, k));
    this.ambient.intensity = lerp(0.22 + br * 0.14, 0.11 + br * 0.10, k);

    // Tight narrow right-hand flashlight hotspot + realistic soft spill & wall bounce!
    const wantOn = STATE.lightOn && STATE.battMain > 0;
    if (wantOn && STATE.phase === 'play') {
      STATE.battMain = Math.max(0, STATE.battMain - dt * 0.035);
    }
    const flicker = wantOn && Math.sin(rt * 23.0) * Math.sin(rt * 57.0) > 0.97 ? 0.72 : 1.0;
    this.flashlight.intensity = wantOn ? (58.0 + br * 16.0) * flicker : 0;
    this.spillLight.intensity = wantOn ? (15.0 + br * 6.0) * flicker : 0;
    this.bounceLight.intensity = wantOn ? (2.4 + br * 1.1) * flicker : 0;
    STATE.lightLevel = wantOn ? 1 : 0;

    // Held clearly in the player's RIGHT hand (x = +0.30, y = -0.22), aiming slightly from right toward forward center!
    this._v1.set(0.30, -0.22, -0.05).applyQuaternion(this.camera.quaternion).add(this.camera.position);
    const follow = 1 - Math.exp(-dt * 12);
    this.rig.position.lerp(this._v1, follow);
    this.rig.quaternion.slerp(this.camera.quaternion, follow);

    // Slight right-hand aim bias (+0.42m to the right at 14m distance) so beam feels genuinely right-handed
    this._v2.set(0, 0, -1).applyQuaternion(this.rig.quaternion);
    this._vRight.set(1, 0, 0).applyQuaternion(this.rig.quaternion);
    this.flashlight.position.copy(this.rig.position);
    this.spillLight.position.copy(this.rig.position);
    const tx = this.rig.position.x + this._v2.x * 14 + this._vRight.x * 0.42;
    const ty = this.rig.position.y + this._v2.y * 14 - 0.12;
    const tz = this.rig.position.z + this._v2.z * 14 + this._vRight.z * 0.42;
    this.flashlight.target.position.set(tx, ty, tz);
    this.spillLight.target.position.set(tx, ty, tz);

    if (this.skyDome) {
      this.skyDome.position.set(playerPos.x, 0, playerPos.z);
    }

    // Mobile zone culling
    this.zones.forest.visible = playerPos.z > -12;
    this.zones.props.visible = playerPos.z < 18;
  }

  render() {
    const preset = QUALITY_PRESETS[SETTINGS.quality] || QUALITY_PRESETS.high;
    this.frameCounter++;
    if (preset.shadows && this.flashlight.intensity > 0) {
      if (preset.shadowSkip === 0 || this.frameCounter % (preset.shadowSkip + 1) === 0) {
        this.renderer.shadowMap.needsUpdate = true;
      }
    }
    this.renderer.render(this.scene, this.camera);
  }
}
