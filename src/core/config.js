// Central game settings, thermal management presets, and runtime state

export const IS_MOBILE =
  typeof navigator !== 'undefined' &&
  (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    (typeof window !== 'undefined' && 'ontouchstart' in window && window.innerWidth < 1024));

export const QUALITY_PRESETS = {
  eco: {
    label: 'توفير البطارية (أقل حرارة)',
    dprCap: 0.9,
    shadowSize: 512,
    shadowSkip: 2,
    shadows: true,
    anisotropy: 4,
    fogFar: 46,
  },
  balanced: {
    label: 'متوازن',
    dprCap: 1.2,
    shadowSize: 1024,
    shadowSkip: 1,
    shadows: true,
    anisotropy: 6,
    fogFar: 60,
  },
  high: {
    label: 'عالي (الافتراضي)',
    dprCap: 1.65,
    shadowSize: 1024,
    shadowSkip: 0,
    shadows: true,
    anisotropy: 8,
    fogFar: 78,
  },
};

export const SETTINGS = {
  quality: 'high', // Default High Quality as requested
  fpsCap: 90,      // True 90 FPS (native 90/120Hz uncapped mode) by default; 30/45/60/90 selectable
  brightness: 0.22,
  sens: 2.2,
  cleanHud: false,
  vol: {
    master: 0.92,
    amb: 0.95,
    foot: 0.95,
    breath: 0.92,
    sfx: 0.95,
    ui: 0.8,
  },
};

export const FLOOR2_Y = 3.6;
export const WALL_H = 3.2;

export const STATE = {
  booted: false,
  phase: 'title', // 'title' | 'intro' | 'play' | 'ending' | 'ended'
  paused: false,
  inSettings: false,
  inMap: false,
  inDossier: false,
  inNote: false,
  activeNote: null,

  pt: 0,
  rt: 0,
  introTime: 0,

  battMain: 100,
  lightOn: true,
  lightLevel: 1,

  viewers: 418,
  maxViewers: 418,
  missionIdx: 0,
  discoveredRooms: new Set(),
  collectedClues: new Set(),
  currentZone: 'forest',
  currentRoomId: null,
  currentRoomName: 'غابة وادي الضباب',

  nextChat: 5,
  nextAmbientSfx: 9,
  stamina: 100,
  subText: '',
  subTimer: 0,
};

export const PLAYER = {
  x: -10.5,
  y: 0,
  z: 71.0,
  vx: 0,
  vz: 0,
  yaw: -0.32,
  pitch: -0.02,
  eyeY: 1.66,
  wallRadius: 0.42, // Keeps camera safely away from walls so near-plane NEVER clips wall faces!
  propRadius: 0.23, // Smaller prop radius for smooth effortless walking around hospital furniture!
  radius: 0.34,
  bob: 0,
  stepTimer: 0.25,
  stepAlt: 1,
  exhausted: false,
  exertion: 0,
  onFloor2: false,
};

export const INPUT = {
  keys: Object.create(null),
  joyX: 0,
  joyY: 0,
  joySprint: false,
  pointerLocked: false,
};
