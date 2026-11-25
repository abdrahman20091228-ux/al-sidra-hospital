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
import { clamp, lerp, smoothstep } from './utils/math.js';

function tryEnterFullscreen() {
  try {
    const docEl = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.msRequestFullscreen;
      if (req) {
        const res = req.call(docEl, { navigationUI: 'hide' });
        if (res && typeof res.catch === 'function') res.catch(() => {});
      }
    }
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  } catch {
    // Gracefully ignored if browser blocks fullscreen
  }
}

/**
 * Guarantees smooth touch-dragging scroll inside Settings/Dossier/Notes
 * even when Android Chrome renders inside CSS rotate(90deg) portrait mode!
 */
function bindRotatedScroll() {
  document.querySelectorAll('.scrollable').forEach((el) => {
    let activeId = null;
    let lastPos = 0;
    el.addEventListener(
      'touchstart',
      (e) => {
        if (e.target.closest('input, button')) return;
        const t = e.changedTouches[0];
        if (!t) return;
        activeId = t.identifier;
        const isRot = document.body.classList.contains('rot');
        lastPos = isRot ? t.clientX : t.clientY;
      },
      { passive: true }
    );
    el.addEventListener(
      'touchmove',
      (e) => {
        if (activeId === null) return;
        const isRot = document.body.classList.contains('rot');
        if (!isRot) return; // Native smooth vertical scroll works in normal landscape
        for (const t of e.changedTouches) {
          if (t.identifier === activeId) {
            // In 90deg clockwise rotation, visual vertical scroll axis maps to horizontal clientX!
            const delta = t.clientX - lastPos;
            lastPos = t.clientX;
            el.scrollTop += delta;
            e.preventDefault();
          }
        }
      },
      { passive: false }
    );
    const stop = () => { activeId = null; };
    el.addEventListener('touchend', stop, { passive: true });
    el.addEventListener('touchcancel', stop, { passive: true });
  });
}

function boot() {
  const container = document.getElementById('game-container');
  const viewport = document.getElementById('viewport');

  // 1. Core subsystems
  const engine = new GameEngine(viewport);
  const mats = createMaterialLibrary(engine.getMaxAnisotropy());
  const physics = new PhysicsWorld();
  const audio = new AudioEngine();
  const hud = new HudManager();

  // 2. Build handcrafted world
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
  bindRotatedScroll();

  function handleResize() {
    const rot = window.innerHeight > window.innerWidth && window.innerWidth < 820;
    document.body.classList.toggle('rot', rot);
    player.setRotated(rot);
    engine.resize();
  }
  handleResize();
  window.addEventListener('resize', handleResize);
  window.addEventListener('orientationchange', () => setTimeout(handleResize, 120));

  // Auto-Fullscreen immediately on first touch/click anywhere in the app!
  const autoFs = () => {
    tryEnterFullscreen();
  };
  window.addEventListener('pointerdown', autoFs, { passive: true });
  window.addEventListener('touchstart', autoFs, { passive: true });

  // ===== SMOOTH FRAME-BY-FRAME OPENING CINEMATIC =====
  let introLightClicked = false;

  function finishIntroToPlay() {
    if (STATE.phase !== 'intro') return;
    STATE.phase = 'play';
    STATE.lightOn = true;
    PLAYER.yaw = -0.34;
    PLAYER.pitch = -0.02;
    hud.enterPlayMode();
  }

  function startNewRun(skipIntro = false) {
    tryEnterFullscreen();
    audio.init();
    audio.uiClick();
    STATE.pt = 0;
    STATE.battMain = 100;
    STATE.paused = false;
    STATE.inMap = false;
    STATE.inNote = false;
    STATE.inSettings = false;
    player.resetSpawn();
    story.reset();

    if (skipIntro) {
      STATE.phase = 'play';
      STATE.lightOn = true;
      hud.enterPlayMode();
    } else {
      STATE.phase = 'intro';
      STATE.introTime = 0;
      STATE.lightOn = false;
      introLightClicked = false;
      hud.enterIntroMode();
    }
  }

  function updateIntroCinematic(dt) {
    STATE.introTime += dt;
    const t = STATE.introTime;

    // 0.0 -> 1.5s: Smooth dark fade-in while slowly lifting head from pine ground
    const curtainAlpha = 1 - smoothstep(0.15, 1.55, t);
    hud.el.introCurtain.style.opacity = curtainAlpha.toFixed(3);

    const riseT = smoothstep(0.25, 2.4, t);
    const eyeH = lerp(1.02, PLAYER.eyeY, riseT);
    const pitch = lerp(-0.56, -0.04, riseT) + Math.sin(t * 1.4) * 0.008;

    // 1.45s: Mechanical flashlight click ON!
    if (t >= 1.45 && !introLightClicked) {
      introLightClicked = true;
      STATE.lightOn = true;
      audio.flashlightClick(true);
    }

    // 1.7s -> 4.9s: Smooth atmospheric glance left -> right -> locked onto foggy muddy path
    let yaw = -0.34;
    if (t < 2.2) {
      yaw = lerp(-0.62, -0.45, smoothstep(0.3, 2.2, t));
    } else if (t < 3.6) {
      yaw = lerp(-0.45, -0.05, smoothstep(2.2, 3.6, t));
    } else {
      yaw = lerp(-0.05, -0.34, smoothstep(3.6, 5.0, t));
    }

    if (t > 1.7 && t < 4.8) {
      hud.el.introCaption.textContent = 'ليلة ١٢ أكتوبر ١٩٩٤... لم يبقَ سوى هذا الطريق إلى مستشفى السدرة.';
      hud.el.introCaption.classList.add('show');
    } else {
      hud.el.introCaption.classList.remove('show');
    }

    engine.camera.position.set(PLAYER.x, PLAYER.y + eyeH, PLAYER.z);
    engine.camera.rotation.set(pitch, yaw, Math.sin(t * 1.1) * 0.012);
    engine.updateLighting(dt, STATE.rt, PLAYER);
    audio.updateEnvironment(dt, 0, 0.12, false);
    engine.render();

    if (t >= 5.2) {
      finishIntroToPlay();
    }
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

  hud.el.btnStart.addEventListener('click', () => startNewRun(false));
  hud.el.btnSkipIntro.addEventListener('click', () => { audio.uiClick(); finishIntroToPlay(); });
  hud.el.btnPlayAgain.addEventListener('click', () => startNewRun(false));
  hud.el.btnRestart.addEventListener('click', () => startNewRun(false));
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

  window.addEventListener('keydown', (e) => {
    INPUT.keys[e.code] = true;
    if (e.code === 'Space' && STATE.phase === 'intro') finishIntroToPlay();
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

  // ===== TRUE 90/120 FPS + DRIFT-FREE PHASE-ACCUMULATED CAP FOR 30 / 45 / 60 FPS =====
  let lastNow = performance.now();
  let frameBudget = 0;
  let fpsFrames = 0;
  let fpsTimer = 0;
  let fpsValue = SETTINGS.fpsCap;
  let titleAngle = 0;

  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) {
      lastNow = now;
      return;
    }

    const rawMs = Math.min(now - lastNow, 100);
    lastNow = now;

    // When 90+ FPS is chosen, NEVER artificially skip frames so 90Hz/120Hz phones hit full 90-120 FPS!
    if (SETTINGS.fpsCap < 90) {
      const targetMs = 1000 / Math.max(24, SETTINGS.fpsCap);
      frameBudget += rawMs;
      if (frameBudget < targetMs) return;
      frameBudget = Math.min(frameBudget - targetMs, targetMs);
    }

    const dt = clamp(rawMs / 1000, 0.001, 0.05);
    STATE.rt += dt;

    fpsFrames++;
    fpsTimer += rawMs / 1000;
    if (fpsTimer >= 0.45) {
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
      const cx = 3.8 + Math.sin(titleAngle) * 2.4;
      const cz = 14.5 + Math.cos(titleAngle * 0.7) * 1.1;
      engine.camera.position.set(cx, 2.75 + Math.sin(titleAngle * 1.2) * 0.16, cz);
      engine.camera.lookAt(-1.8, 3.0, -5.6);
      STATE.lightOn = true;
      engine.updateLighting(dt, STATE.rt, engine.camera.position);
      engine.render();
      return;
    }

    if (STATE.phase === 'intro') {
      updateIntroCinematic(dt);
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

  // Inspection & Physics Verification API
  window.__SIDRA__ = {
    start: (skipIntro = true) => startNewRun(skipIntro),
    startIntroAt: (sec) => {
      startNewRun(false);
      STATE.introTime = sec;
      updateIntroCinematic(0.016);
    },
    setView: (x, y, z, yaw, pitch = -0.04, lightOn = true) => {
      if (STATE.phase !== 'play') startNewRun(true);
      STATE.paused = false;
      STATE.inMap = false;
      hud.closeMap();
      STATE.lightOn = lightOn;
      STATE.subTimer = 0;
      hud.setSubtitle('');
      hud.el.objective.classList.add('hidden');
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
      if (STATE.phase !== 'play') startNewRun(true);
      hud.openMap(tab);
      mapUI.setTab(tab);
    },
    openSettings: () => {
      hud.openSettings('title');
    },
    // Automated walk-test proving ZERO invisible walls from Floor 1 Spine -> Stairs -> Floor 2 Landing -> Room 312!
    testStairWalk: () => {
      let px = 0.0, py = 0.0, pz = -31.8;
      const waypoints = [
        [-8.3, -31.8],  // Enter Main Stairwell from Clinical Spine
        [-8.3, -39.6],  // Climb straight up stairs to Floor 2 top landing (Y -> 3.6)
        [-8.3, -40.5],  // Step onto top landing
        [-4.2, -40.5],  // Turn east into f2_landing
        [-4.2, -32.0],  // Walk south into Floor 2 Upper Corridor
        [8.3, -32.0],   // Walk east to Room 312 doorway
        [8.3, -26.0],   // Enter Room 312!
      ];
      const trace = [];
      for (const [tx, tz] of waypoints) {
        for (let step = 0; step < 120; step++) {
          const dx = tx - px, dz = tz - pz;
          const dist = Math.hypot(dx, dz);
          if (dist < 0.25) break;
          const s = Math.min(0.18, dist);
          const next = physics.moveAndSlide(px, py, pz, (dx / dist) * s, (dz / dist) * s);
          px = next.x; py = next.y; pz = next.z;
        }
        trace.push({ target: [tx, tz], reached: [Number(px.toFixed(2)), Number(py.toFixed(2)), Number(pz.toFixed(2))], ok: Math.hypot(tx - px, tz - pz) < 0.35 });
      }
      // Also test gate iron leaf collision (walking straight into closed bar vs center opening)
      const gateCenter = physics.isFree(0, 0, 7.6);
      const gateBarBlocked = !physics.isFree(-3.0, 0, 7.2);
      return { trace, allWaypointsReached: trace.every((t) => t.ok), gateCenterWalkable: gateCenter, gateIronBlocked: gateBarBlocked };
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
