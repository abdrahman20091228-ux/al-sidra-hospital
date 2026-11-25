import './styles/main.css';
import { INPUT, PLAYER, SETTINGS, STATE } from './core/config.js';
import { GameEngine } from './core/engine.js';
import { createMaterialLibrary } from './core/materials.js';
import { PhysicsWorld } from './core/physics.js';
import { buildForestAndRoad } from './world/forest.js';
import { buildHospitalExterior } from './world/exterior.js';
import { buildHospitalArchitecture } from './world/hospital.js';
import { buildHospitalProps } from './world/props.js';
import { AudioEngine } from './systems/audio.js';
import { PlayerController } from './systems/player.js';
import { StorySystem } from './systems/story.js';
import { MapRenderer } from './systems/mapUI.js';
import { HudManager } from './systems/hud.js';

function boot() {
  const container = document.getElementById('game-container');
  const viewport = document.getElementById('viewport');

  // 1. Core subsystems
  const engine = new GameEngine(viewport);
  const mats = createMaterialLibrary(engine.getMaxAnisotropy());
  const physics = new PhysicsWorld();
  const audio = new AudioEngine();
  const hud = new HudManager();

  // 2. Build complete handcrafted world: Forest -> Muddy Road -> Exterior -> Real 2-Story Hospital + Props
  buildForestAndRoad(engine, mats, physics);
  buildHospitalExterior(engine, mats, physics);
  buildHospitalArchitecture(engine, mats, physics);
  const { clueObjects } = buildHospitalProps(engine, mats, physics);

  // 3. Gameplay systems
  const player = new PlayerController(
    container,
    {
      root: document.getElementById('joyRoot'),
      nub: document.getElementById('joyNub'),
      sprint: document.getElementById('joySprint'),
    },
    physics,
    audio
  );
  const story = new StorySystem(audio, hud, physics, clueObjects);
  const mapUI = new MapRenderer(document.getElementById('mapCanvas'), clueObjects);

  player.resetSpawn();

  // Landscape orientation helper for mobile phones
  function handleResize() {
    const rot = window.innerHeight > window.innerWidth && window.innerWidth < 820;
    document.body.classList.toggle('rot', rot);
    player.setRotated(rot);
    engine.resize();
  }
  handleResize();
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => setTimeout(handleResize, 120));

  // ===== UI EVENT BINDINGS =====
  function startNewRun() {
    audio.init();
    audio.uiClick();
    STATE.phase = 'play';
    STATE.pt = 0;
    STATE.battMain = 100;
    STATE.lightOn = true;
    STATE.paused = false;
    STATE.inMap = false;
    STATE.inNote = false;
    player.resetSpawn();
    story.reset();
    hud.enterPlayMode();
  }

  function toggleFlashlight() {
    if (STATE.phase !== 'play' || STATE.paused || STATE.inMap || STATE.inNote) return;
    STATE.lightOn = !STATE.lightOn;
    audio.flashlightClick(STATE.lightOn);
    hud.el.btnLight.classList.toggle('on', STATE.lightOn);
  }

  function toggleMap() {
    if (STATE.phase !== 'play' || STATE.paused || STATE.inSettings || STATE.inNote) return;
    audio.paperRustle();
    if (STATE.inMap) {
      hud.closeMap();
    } else {
      const tab = mapUI.autoSelectTab();
      hud.openMap(tab);
      mapUI.draw();
    }
  }

  hud.el.btnStart.addEventListener('click', startNewRun);
  hud.el.btnPlayAgain.addEventListener('click', startNewRun);
  hud.el.btnRestart.addEventListener('click', startNewRun);
  hud.el.btnTitleSettings.addEventListener('click', () => { audio.init(); audio.uiClick(); hud.openSettings('title'); });
  hud.el.btnPauseSettings.addEventListener('click', () => { audio.uiClick(); hud.openSettings('pause'); });
  hud.el.btnSetBack.addEventListener('click', () => { audio.uiClick(); hud.closeSettings(); });
  hud.el.btnTitleDossier.addEventListener('click', () => { audio.init(); audio.uiClick(); hud.openDossier(); });
  hud.el.btnDossierClose.addEventListener('click', () => { audio.uiClick(); hud.closeDossier(); });
  hud.el.btnNoteClose.addEventListener('click', () => { audio.uiClick(); hud.closeNoteModal(); });

  hud.el.btnMenu.addEventListener('click', () => { audio.uiClick(); hud.openPause(); });
  hud.el.btnResume.addEventListener('click', () => { audio.uiClick(); hud.closePause(); });
  hud.el.btnLight.addEventListener('click', toggleFlashlight);
  hud.el.btnMap.addEventListener('click', toggleMap);
  hud.el.btnMapClose.addEventListener('click', toggleMap);
  hud.el.btnMapX.addEventListener('click', toggleMap);
  hud.el.interactBtn.addEventListener('click', () => story.interactNearestClue());

  // Map tab switchers with authentic paper rustle sound
  hud.el.tabForest.addEventListener('click', () => { audio.paperRustle(); hud.setActiveMapTab('forest'); mapUI.setTab('forest'); });
  hud.el.tabF1.addEventListener('click', () => { audio.paperRustle(); hud.setActiveMapTab('f1'); mapUI.setTab('f1'); });
  hud.el.tabF2.addEventListener('click', () => { audio.paperRustle(); hud.setActiveMapTab('f2'); mapUI.setTab('f2'); });

  // Settings controls
  document.querySelectorAll('[data-quality]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SETTINGS.quality = btn.dataset.quality;
      engine.applyQuality();
      hud.syncSettingsUI();
      audio.uiClick();
    });
  });

  document.querySelectorAll('[data-fps]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SETTINGS.fpsCap = Number(btn.dataset.fps);
      hud.syncSettingsUI();
      audio.uiClick();
    });
  });

  document.querySelectorAll('[data-hudmode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      SETTINGS.cleanHud = btn.dataset.hudmode === 'clean';
      hud.el.camUI.classList.toggle('clean-hud', SETTINGS.cleanHud);
      hud.syncSettingsUI();
      audio.uiClick();
    });
  });

  hud.el.sBright.addEventListener('input', () => {
    SETTINGS.brightness = parseFloat(hud.el.sBright.value);
    hud.el.sBrightVal.textContent = `${Math.round(SETTINGS.brightness * 100)}%`;
  });
  hud.el.sSens.addEventListener('input', () => {
    SETTINGS.sens = parseFloat(hud.el.sSens.value);
    hud.el.sSensVal.textContent = `${SETTINGS.sens.toFixed(1)}x`;
  });
  hud.el.sVolMaster.addEventListener('input', () => {
    SETTINGS.vol.master = parseFloat(hud.el.sVolMaster.value);
    hud.el.sVolMasterVal.textContent = `${Math.round(SETTINGS.vol.master * 100)}%`;
    audio.applyVolumes();
  });
  hud.el.sVolAmb.addEventListener('input', () => {
    SETTINGS.vol.amb = parseFloat(hud.el.sVolAmb.value);
    hud.el.sVolAmbVal.textContent = `${Math.round(SETTINGS.vol.amb * 100)}%`;
    audio.applyVolumes();
  });
  if (hud.el.sVolBreath) {
    hud.el.sVolBreath.addEventListener('input', () => {
      SETTINGS.vol.breath = parseFloat(hud.el.sVolBreath.value);
      hud.el.sVolBreathVal.textContent = `${Math.round(SETTINGS.vol.breath * 100)}%`;
      audio.applyVolumes();
    });
  }

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    INPUT.keys[e.code] = true;
    if (e.code === 'KeyF') toggleFlashlight();
    if (e.code === 'KeyM') toggleMap();
    if (e.code === 'KeyE') story.interactNearestClue();
    if (e.code === 'Escape') {
      if (STATE.inNote) hud.closeNoteModal();
      else if (STATE.inDossier) hud.closeDossier();
      else if (STATE.inSettings) hud.closeSettings();
      else if (STATE.inMap) hud.closeMap();
      else if (STATE.paused) hud.closePause();
      else if (STATE.phase === 'play') hud.openPause();
    }
  });
  window.addEventListener('keyup', (e) => {
    INPUT.keys[e.code] = false;
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.suspend();
    else audio.resume();
  });

  // ===== THERMAL-CAPPED ADAPTIVE MAIN LOOP (30 / 45 / 60 / 90 FPS) =====
  let lastRenderTime = performance.now();
  let fpsFrames = 0;
  let fpsTimer = 0;
  let fpsValue = SETTINGS.fpsCap;
  let titleAngle = 0;

  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) return;

    const minFrameMs = 1000 / Math.max(24, SETTINGS.fpsCap);
    const elapsedMs = now - lastRenderTime;
    if (elapsedMs < minFrameMs - 1.0) return;
    lastRenderTime = now;

    const dt = Math.min(elapsedMs / 1000, 0.05);
    STATE.rt += dt;

    fpsFrames++;
    fpsTimer += elapsedMs / 1000;
    if (fpsTimer >= 0.5) {
      fpsValue = fpsFrames / fpsTimer;
      fpsFrames = 0;
      fpsTimer = 0;
    }

    if (STATE.paused || STATE.inSettings || STATE.inDossier || STATE.inNote || STATE.phase === 'ended') {
      return;
    }

    if (STATE.inMap) {
      if (fpsFrames % 4 === 0) mapUI.draw();
      return;
    }

    if (STATE.phase === 'title') {
      titleAngle += dt * 0.1;
      const cx = 3.8 + Math.sin(titleAngle) * 2.6;
      const cz = 14.5 + Math.cos(titleAngle * 0.7) * 1.2;
      engine.camera.position.set(cx, 2.8 + Math.sin(titleAngle * 1.2) * 0.2, cz);
      engine.camera.lookAt(-2.2, 3.0, -5.6);
      // Handheld flashlight illuminates the ominous boarded hospital & crooked rusted sign on the Title Screen!
      STATE.lightOn = true;
      engine.updateLighting(dt, STATE.rt, engine.camera.position);
      engine.render();
      return;
    }

    if (STATE.phase === 'play') {
      STATE.pt += dt;
      player.update(dt, engine.camera);
      engine.updateLighting(dt, STATE.rt, PLAYER);
      audio.updateEnvironment(dt, engine._indoorBlend, PLAYER.exertion || 0, PLAYER.z < -8);
      story.update(dt, engine.camera);
      hud.update(dt, fpsValue);
      engine.render();
    }
  }

  // Expose clean inspection API for automated multi-round visual QA
  window.__SIDRA__ = {
    start: () => startNewRun(),
    setView: (x, y, z, yaw, pitch = -0.04, lightOn = true) => {
      if (STATE.phase !== 'play') startNewRun();
      STATE.paused = false;
      STATE.inMap = false;
      hud.closeMap();
      STATE.lightOn = lightOn;
      STATE.subTimer = 0;
      hud.setSubtitle('');
      player.teleport(x, y, z, yaw, pitch);
      engine.camera.position.set(x, y + PLAYER.eyeY, z);
      engine.camera.rotation.set(pitch, yaw, 0);
      engine.updateLighting(2.0, STATE.rt, PLAYER);
      engine.updateLighting(2.0, STATE.rt, PLAYER);
      story.update(0.016, engine.camera);
      hud._hudAccum = 0;
      hud.update(0.25, SETTINGS.fpsCap);
      engine.renderer.shadowMap.needsUpdate = true;
      engine.render();
    },
    openMapTab: (tab) => {
      if (STATE.phase !== 'play') startNewRun();
      hud.openMap(tab);
      mapUI.setTab(tab);
    },
    getStats: () => ({
      calls: engine.renderer.info.render.calls,
      triangles: engine.renderer.info.render.triangles,
      geometries: engine.renderer.info.memory.geometries,
      textures: engine.renderer.info.memory.textures,
    }),
  };

  STATE.booted = true;
  hud.setReady();
  requestAnimationFrame(tick);
}

boot();
