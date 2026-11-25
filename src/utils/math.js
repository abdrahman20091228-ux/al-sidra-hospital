// Deterministic math utilities, rugged 3D forest terrain, and sculpted muddy road spline

export function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function pad2(n) {
  return String(Math.floor(n)).padStart(2, '0');
}

export function createRng(seed = 19941012) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randRange(rng, min, max) {
  return min + rng() * (max - min);
}

export function randPick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

/**
 * Center X coordinate of the winding muddy forest road as a function of Z.
 * Road runs from z = 63 (joining forest clearing trail) down to z = 9 (hospital broken gate at x = 0).
 */
export function roadCenterX(z) {
  if (z <= 10.5) return 0;
  const t = clamp((z - 10.5) / 54, 0, 1);
  const wave = Math.sin(t * Math.PI * 1.55) * 4.2 * smoothstep(0, 0.28, t);
  const drift = -2.0 * smoothstep(0.62, 1.0, t);
  return wave + drift;
}

export function roadHalfWidth(z) {
  if (z < 13) return 3.1;
  if (z > 62) return 2.15;
  return 2.6 + Math.sin(z * 0.21) * 0.24;
}

export function distFromRoad(x, z) {
  if (z < 8.5 || z > 66) return 99;
  return Math.abs(x - roadCenterX(z)) - roadHalfWidth(z);
}

export function distFromClearingTrail(x, z) {
  if (z < 58 || z > 76) return 99;
  const t = clamp((z - 60) / 14, 0, 1);
  const cx = lerp(-2.0, -10.5, smoothstep(0, 1, t));
  return Math.abs(x - cx) - 1.95;
}

/**
 * Rugged, natural 3D forest ground elevation + deeply sculpted 3D muddy road ruts & embankments.
 * Never flat! Gives dramatic flashlight shadows across ground mounds & mud wheel tracks with zero GPU overhead.
 */
export function terrainHeight(x, z) {
  if (z <= 9.2) return 0;
  const blend = smoothstep(9.2, 20.0, z);

  // Multi-octave organic forest mounds & hollows
  const macroHills =
    Math.sin(x * 0.08 + z * 0.055) * 0.85 +
    Math.cos(x * 0.05 - z * 0.09 + 1.1) * 0.65;
  const microMounds =
    Math.sin(x * 0.34 + z * 0.28) * 0.24 +
    Math.cos(x * 0.58 - z * 0.49 + 0.7) * 0.14 +
    Math.sin(x * 1.15 + z * 0.92) * 0.06;

  const rDist = distFromRoad(x, z);
  const roadZone = smoothstep(-0.3, 3.0, rDist);

  // Spawn clearing stays gently undulating (not dead flat!)
  const cDist = Math.hypot(x + 10.5, z - 71.0);
  const clearSmooth = smoothstep(1.8, 8.5, cDist);

  const forestY = (macroHills * clearSmooth + microMounds * (0.45 + 0.55 * clearSmooth) + 0.28) * blend * roadZone;

  // Sculpted 3D muddy road cross-section: raised earthy embankments, deep sunken wheel ruts, raised muddy center ridge!
  let mudRelief = 0;
  if (z >= 10.2 && z <= 64.5) {
    const cx = roadCenterX(z);
    const hw = roadHalfWidth(z);
    const dx = Math.abs(x - cx);
    const roadMask = smoothstep(10.0, 14.5, z) * smoothstep(65.0, 61.0, z);

    // Two deep sunken tire ruts at dx ~ 1.05m
    const rut = Math.exp(-Math.pow((dx - 1.05) / 0.44, 2));
    // Raised muddy center crown ridge between the wheel tracks
    const centerCrown = Math.exp(-Math.pow(dx / 0.55, 2));
    // Muddy raised shoulder embankment on the outer edges of the road
    const shoulder = Math.exp(-Math.pow((dx - (hw + 0.35)) / 0.52, 2));
    // Organic longitudinal mud clod ripples along the track
    const ripple = Math.sin(z * 1.65 + x * 1.2) * 0.032 + Math.cos(z * 3.1 - x * 2.1) * 0.018;

    mudRelief = (-0.15 * rut + 0.095 * centerCrown + 0.22 * shoulder + ripple) * roadMask;
  }

  return forestY + mudRelief;
}

export function getSurfaceType(x, y, z) {
  if (y > 0.35 && y < 3.4) return 'stairs';
  if (z <= -6.0) return 'tile';
  if (z <= 9.5) return 'asphalt';
  if (distFromRoad(x, z) <= 0.4) return 'mud';
  return 'forest';
}
