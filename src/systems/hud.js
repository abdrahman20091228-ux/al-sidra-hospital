import { PLAYER, SETTINGS, STATE } from '../core/config.js';
import { MISSIONS } from './story.js';

const $ = (id) => document.getElementById(id);

/**
 * Ultra-Clean Minimalist HUD & Menu Manager:
 * - Comments neatly top-left (max 2 compact lines)
 * - Icon-only Settings Gear & Map buttons top-right
 * - Single Flashlight button bottom-right
 * - Auto-hiding stamina bar & fleeting mission whisper so screen stays spotless!
 */
export class HudManager {
  constructor() {
    this.el = {
      camUI: $('camUI'),
      introOverlay: $('introOverlay'),
      introCurtain: $('introCurtain'),
      introCaption: $('introCaption'),
      btnSkipIntro: $('btnSkipIntro'),

      startScreen: $('startScreen'),
      pauseOverlay: $('pauseOverlay'),
      settingsScreen: $('settingsScreen'),
      mapOverlay: $('mapOverlay'),
      dossierScreen: $('dossierScreen'),
      noteModal: $('noteModal'),
      endScreen: $('endScreen'),

      viewers: $('hudViewers'),
      fps: $('hudFps'),
      zone: $('hudZone'),
      objective: $('hudObjective'),
      staminaBar: $('staminaBar'),
      staFill: $('hudStaFill'),
      sub: $('hudSubtitle'),
      chat: $('hudChat'),
      interactBtn: $('btnInteract'),

      afBox: $('afBox'),
      afLabel: $('afLabel'),
      afFill: $('afFill'),

      btnLight: $('btnLight'),
      btnMap: $('btnMap'),
      btnMenu: $('btnMenu'),

      btnStart: $('btnStartGame'),
      btnTitleSettings: $('btnTitleSettings'),
      btnTitleDossier: $('btnTitleDossier'),
      loadBadge: $('titleLoad'),

      pauseObjectives: $('pauseObjectives'),
      btnResume: $('btnResume'),
      btnPauseSettings: $('btnPauseSettings'),
      btnRestart: $('btnRestart'),

      tabForest: $('tabForest'),
      tabF1: $('tabF1'),
      tabF2: $('tabF2'),
      btnMapClose: $('btnMapClose'),
      btnMapX: $('btnMapX'),

      btnSetBack: $('btnSetBack'),
      sBright: $('sBright'),
      sBrightVal: $('sBrightVal'),
      sSens: $('sSens'),
      sSensVal: $('sSensVal'),
      sVolMaster: $('sVolMaster'),
      sVolMasterVal: $('sVolMasterVal'),
      sVolAmb: $('sVolAmb'),
      sVolAmbVal: $('sVolAmbVal'),
      sVolBreath: $('sVolBreath'),
      sVolBreathVal: $('sVolBreathVal'),

      noteTitle: $('noteTitle'),
      noteDate: $('noteDate'),
      noteBody: $('noteBody'),
      btnNoteClose: $('btnNoteClose'),
      btnDossierClose: $('btnDossierClose'),
      endSummary: $('endSummary'),
      btnPlayAgain: $('btnPlayAgain'),
    };

    this._hudAccum = 0;
    this._settingsReturn = 'title';
    this._objToastTimer = null;
    this._lastMissionIdx = -1;
  }

  setReady() {
    this.el.loadBadge.classList.add('hidden');
    [this.el.btnStart, this.el.btnTitleSettings, this.el.btnTitleDossier].forEach((b) =>
      b.classList.remove('disabled')
    );
  }

  enterIntroMode() {
    this.el.startScreen.classList.add('hidden');
    this.el.pauseOverlay.classList.add('hidden');
    this.el.endScreen.classList.add('hidden');
    this.el.camUI.classList.add('hidden');
    this.el.introOverlay.classList.remove('hidden');
    this.el.introCurtain.style.opacity = '1';
    this.el.introCaption.textContent = '';
    this.el.introCaption.classList.remove('show');
  }

  enterPlayMode() {
    this.el.introOverlay.classList.add('hidden');
    this.el.startScreen.classList.add('hidden');
    this.el.pauseOverlay.classList.add('hidden');
    this.el.endScreen.classList.add('hidden');
    this.el.camUI.classList.remove('hidden');
    this.el.camUI.classList.toggle('clean-hud', SETTINGS.cleanHud);
    this.el.btnLight.classList.toggle('on', STATE.lightOn);
  }

  setSubtitle(text) {
    this.el.sub.textContent = text;
    this.el.sub.classList.toggle('visible', Boolean(text));
  }

  setInteractPrompt(label) {
    if (label) {
      this.el.interactBtn.textContent = label;
      this.el.interactBtn.classList.remove('hidden');
    } else {
      this.el.interactBtn.classList.add('hidden');
    }
  }

  showObjectiveToast(text, isDone = false, ms = 3800) {
    this.el.objective.textContent = text;
    this.el.objective.classList.toggle('done', isDone);
    this.el.objective.classList.remove('hidden');
    clearTimeout(this._objToastTimer);
    this._objToastTimer = setTimeout(() => {
      this.el.objective.classList.add('hidden');
      this.el.objective.classList.remove('done');
    }, ms);
  }

  flashMissionDone(title) {
    this.showObjectiveToast(`✓ تم التوثيق — ${title}`, true, 2600);
  }

  pushChat(user, text, color = '#98c4d8') {
    const row = document.createElement('div');
    row.className = 'chat-line';
    const b = document.createElement('b');
    b.textContent = `${user}: `;
    b.style.color = color;
    row.appendChild(b);
    row.appendChild(document.createTextNode(text));
    this.el.chat.appendChild(row);
    // Keep top-left comment feed crisp & uncluttered (max 2 visible messages!)
    while (this.el.chat.children.length > 2) {
      this.el.chat.firstChild.remove();
    }
    setTimeout(() => {
      row.classList.add('fade');
      setTimeout(() => row.remove(), 650);
    }, 6200);
  }

  updateAFBox(ndcX, ndcY, dist, label, locked, prog) {
    const w = this.el.camUI.clientWidth || window.innerWidth;
    const h = this.el.camUI.clientHeight || window.innerHeight;
    const sx = (ndcX * 0.5 + 0.5) * w;
    const sy = (-ndcY * 0.5 + 0.5) * h;
    const size = Math.max(66, Math.min(185, 1700 / Math.max(2, dist)));
    const box = this.el.afBox;
    box.style.display = 'block';
    box.style.left = `${sx}px`;
    box.style.top = `${sy}px`;
    box.style.width = `${size}px`;
    box.style.height = `${size * 0.64}px`;
    box.classList.toggle('lock', locked);
    this.el.afLabel.textContent = locked ? `● جاري التوثيق... ${Math.round(prog * 100)}%` : label;
    this.el.afFill.style.width = `${(prog * 100).toFixed(1)}%`;
  }

  hideAFBox() {
    this.el.afBox.style.display = 'none';
  }

  update(dt, fpsValue) {
    this._hudAccum -= dt;
    if (this._hudAccum > 0) return;
    this._hudAccum = 0.2;

    this.el.fps.textContent = `${Math.max(1, Math.round(fpsValue))} FPS`;
    this.el.viewers.textContent = Math.floor(STATE.viewers).toLocaleString('en-US');
    this.el.zone.textContent = STATE.currentRoomName;

    // Only show thin stamina line while actively sprinting/recovering
    const sta = Math.round(STATE.stamina);
    this.el.staminaBar.classList.toggle('hidden', sta >= 99);
    this.el.staFill.style.width = `${sta}%`;
    this.el.btnLight.classList.toggle('on', STATE.lightOn);

    // Show clean brief toast ONLY when mission advances
    if (STATE.missionIdx !== this._lastMissionIdx) {
      this._lastMissionIdx = STATE.missionIdx;
      const active = MISSIONS[STATE.missionIdx];
      if (active) {
        this.showObjectiveToast(`الهدف ${STATE.missionIdx + 1}/${MISSIONS.length} · ${active.title}`, false, 4200);
      }
    }
  }

  openPause() {
    STATE.paused = true;
    this.el.pauseObjectives.innerHTML = MISSIONS.map((m, idx) => {
      const done = idx < STATE.missionIdx;
      const cur = idx === STATE.missionIdx;
      return `<div class="obj-item ${done ? 'done' : cur ? 'cur' : ''}">${done ? '✓ ' : cur ? '▶ ' : '○ '}${m.title}</div>`;
    }).join('');
    this.el.pauseOverlay.classList.remove('hidden');
  }

  closePause() {
    STATE.paused = false;
    this.el.pauseOverlay.classList.add('hidden');
  }

  openSettings(from) {
    this._settingsReturn = from;
    STATE.inSettings = true;
    this.el.introOverlay.classList.add('hidden');
    if (from === 'title') this.el.startScreen.classList.add('hidden');
    else this.el.pauseOverlay.classList.add('hidden');
    this.syncSettingsUI();
    this.el.settingsScreen.classList.remove('hidden');
  }

  closeSettings() {
    STATE.inSettings = false;
    this.el.settingsScreen.classList.add('hidden');
    if (this._settingsReturn === 'title') this.el.startScreen.classList.remove('hidden');
    else this.el.pauseOverlay.classList.remove('hidden');
  }

  syncSettingsUI() {
    document.querySelectorAll('[data-quality]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.quality === SETTINGS.quality);
    });
    document.querySelectorAll('[data-fps]').forEach((btn) => {
      btn.classList.toggle('on', Number(btn.dataset.fps) === SETTINGS.fpsCap);
    });
    document.querySelectorAll('[data-hudmode]').forEach((btn) => {
      btn.classList.toggle('on', (btn.dataset.hudmode === 'clean') === SETTINGS.cleanHud);
    });
    this.el.sBright.value = SETTINGS.brightness;
    this.el.sBrightVal.textContent = `${Math.round(SETTINGS.brightness * 100)}%`;
    this.el.sSens.value = SETTINGS.sens;
    this.el.sSensVal.textContent = `${SETTINGS.sens.toFixed(1)}x`;
    this.el.sVolMaster.value = SETTINGS.vol.master;
    this.el.sVolMasterVal.textContent = `${Math.round(SETTINGS.vol.master * 100)}%`;
    this.el.sVolAmb.value = SETTINGS.vol.amb;
    this.el.sVolAmbVal.textContent = `${Math.round(SETTINGS.vol.amb * 100)}%`;
    if (this.el.sVolBreath) {
      this.el.sVolBreath.value = SETTINGS.vol.breath;
      this.el.sVolBreathVal.textContent = `${Math.round(SETTINGS.vol.breath * 100)}%`;
    }
  }

  openDossier() {
    STATE.inDossier = true;
    this.el.dossierScreen.classList.remove('hidden');
  }

  closeDossier() {
    STATE.inDossier = false;
    this.el.dossierScreen.classList.add('hidden');
  }

  openNoteModal(data) {
    STATE.inNote = true;
    this.el.noteTitle.textContent = data.title;
    this.el.noteDate.textContent = data.date;
    this.el.noteBody.textContent = data.body;
    this.el.noteModal.classList.remove('hidden');
  }

  closeNoteModal() {
    STATE.inNote = false;
    this.el.noteModal.classList.add('hidden');
  }

  openMap(tab) {
    STATE.inMap = true;
    this.setActiveMapTab(tab);
    this.el.mapOverlay.classList.remove('hidden');
  }

  closeMap() {
    STATE.inMap = false;
    this.el.mapOverlay.classList.add('hidden');
  }

  setActiveMapTab(tab) {
    this.el.tabForest.classList.toggle('on', tab === 'forest');
    this.el.tabF1.classList.toggle('on', tab === 'f1');
    this.el.tabF2.classList.toggle('on', tab === 'f2');
  }

  showEndingScreen() {
    this.el.camUI.classList.add('hidden');
    this.el.endSummary.textContent =
      `تم توثيق جميع أقسام مستشفى السدرة الريفي بنجاح.\n` +
      `الأدلة المجموعة: ${STATE.collectedClues.size} / 6  ·  الأقسام المستكشفة: ${STATE.discoveredRooms.size}\n` +
      `ذروة المتابعين المباشرين: ${Math.floor(STATE.maxViewers).toLocaleString('en-US')}\n\n` +
      `أُرسلت نسخة من الشريط الأصلي إلى لجنة التحقيق... ولأول مرة منذ ١٩٩٤، ظهرت حقيقة حادثة العزل.`;
    this.el.endScreen.classList.remove('hidden');
  }
}
