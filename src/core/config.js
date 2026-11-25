// Central game settings, thermal management presets, and runtime state

export const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && 'ontouchstart' in window && window.innerWidth < 1024));

export const QUALITY_PRESETS = {
  eco: {
    label: 'توفير البطارية (أقل حرارة)',
    dprCap: 0.85,
    shadowSize: 512,
    shadowSkip: 2,
    shadows: true,
    anisotropy: 2,
    fogFar: 48,
  },
  balanced: {
    label: 'متوازن (موصى به للهاتف)',
    dprCap: 1.05,
    shadowSize: 1024,
    shadowSkip: 1,
    shadows: true,
    anisotropy: 4,
    fogFar: 62,
  },
  high: {
    label: 'عالي (لأجهزة الكمبيوتر)',
    dprCap: 1.5,
    shadowSize: 1024,
    shadowSkip: 0,
    shadows: true,
    anisotropy: 8,
    fogFar: 78,
  },
};

export const SETTINGS = {
  quality: IS_MOBILE ? 'balanced' : 'high',
  fpsCap: IS_MOBILE ? 45 : 60, // Supports 30 / 45 / 60 / 90 FPS thermal control
  brightness: 0.22,
  sens: 2.2,
  cleanHud: false,
  vol: {
    master: 0.9,
    amb: 0.95,
    foot: 0.92,
    breath: 0.9,
    sfx: 0.92,
    ui: 0.78,
  },
};

export const FLOOR2_Y = 3.6;
export const WALL_H = 3.2;

export const STATE = {
  booted: false,
  phase: 'title', // 'title' | 'play' | 'ending' | 'ended'
  paused: false,
  inSettings: false,
  inMap: false,
  inDossier: false,
  inNote: false,
  activeNote: null,

  pt: 0, // play time
  rt: 0, // real elapsed time

  // Camera battery (generous exploration pace, rechargeable or slow drain, no unfair instant death)
  battMain: 100,
  lightOn: true,
  lightLevel: 1,

  // Broadcast & narrative progress
  viewers: 418,
  maxViewers: 418,
  missionIdx: 0,
  discoveredRooms: new Set(),
  collectedClues: new Set(),
  currentZone: 'forest', // 'forest' | 'road' | 'courtyard' | 'hospital_f1' | 'hospital_f2'
  currentRoomId: null,
  currentRoomName: 'غابة وادي الضباب',

  // Timers
  nextChat: 4,
  nextAmbientSfx: 10,
  stamina: 100,
  subText: '',
  subTimer: 0,
};

export const PLAYER = {
  // Starts in the misty pine forest clearing
  x: -10.5,
  y: 0,
  z: 71.0,
  vx: 0,
  vz: 0,
  yaw: -0.32, // Facing northeast toward the trail & muddy road
  pitch: -0.02,
  eyeY: 1.66,
  radius: 0.36,
  bob: 0,
  stepTimer: 0.25,
  stepAlt: 1,
  exhausted: false,
  onFloor2: false,
};

export const INPUT = {
  keys: Object.create(null),
  joyX: 0,
  joyY: 0,
  joySprint: false,
  pointerLocked: false,
};
