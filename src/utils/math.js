// Deterministic math utilities, terrain heightfield, and muddy road spline

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

// Fast Mulberry32 deterministic PRNG so the forest & props are 100% consistent
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
 * Road runs from z = 62 (joining forest trail) down to z = 8 (hospital iron gate at x = 0).
 */
export function roadCenterX(z) {
  if (z <= 10) return 0;
  const t = clamp((z - 10) / 56, 0, 1);
  // Gentle organic S-curve leading from the misty forest clearing straight to the main gate
  const wave = Math.sin(t * Math.PI * 1.65) * 4.4 * smoothstep(0, 0.25, t);
  const drift = -2.2 * smoothstep(0.65, 1.0, t);
  return wave + drift;
}

/**
 * Half-width of the muddy road at a given Z.
 */
export function roadHalfWidth(z) {
  if (z < 12) return 3.2;
  if (z > 62) return 2.1;
  return 2.55 + Math.sin(z * 0.17) * 0.22;
}

/**
 * Signed distance from the muddy road centerline (negative = on road).
 */
export function distFromRoad(x, z) {
  if (z < 8 || z > 66) return 99;
  const cx = roadCenterX(z);
  return Math.abs(x - cx) - roadHalfWidth(z);
}

/**
 * Forest clearing trail path from spawn (x = -11, z = 72) curving into the muddy road at (x = -2.2, z = 62).
 */
export function distFromClearingTrail(x, z) {
  if (z < 58 || z > 76) return 99;
  const t = clamp((z - 60) / 14, 0, 1);
  const cx = lerp(-2.2, -10.5, smoothstep(0, 1, t));
  return Math.abs(x - cx) - 1.9;
}

/**
 * Continuous rolling terrain elevation outside the hospital (z > 8).
 * Smoothly flattens to Y = 0 inside the hospital courtyard (z <= 9) and gently depressions along the muddy road ruts.
 */
export function terrainHeight(x, z) {
  if (z <= 9.0) return 0;
  const blend = smoothstep(9.0, 22.0, z);
  const hills =
    Math.sin(x * 0.085 + z * 0.055) * 0.72 +
    Math.cos(x * 0.045 - z * 0.095 + 1.2) * 0.58 +
    Math.sin(x * 0.19 + z * 0.17) * 0.18;

  // Flatten the muddy road corridor so walking feels natural and puddles sit level
  const rDist = distFromRoad(x, z);
  const roadFlat = smoothstep(-0.4, 3.2, rDist);

  // Flatten spawn clearing gently
  const cDist = Math.hypot(x + 10.5, z - 71.5);
  const clearFlat = smoothstep(3.5, 9.0, cDist);

  const rawH = (hills + 0.35) * blend * Math.min(roadFlat, clearFlat);

  // Subtle sunken tire ruts in the muddy road
  let rut = 0;
  if (z >= 10 && z <= 64) {
    const cx = roadCenterX(z);
    const dx = Math.abs(x - cx);
    const rutBand = Math.exp(-Math.pow((dx - 0.95) / 0.38, 2));
    rut = -0.075 * rutBand * smoothstep(9.5, 14.0, z);
  }
  return rawH + rut;
}

/**
 * Determine current walking surface type for footstep sound synthesis.
 * Returns: 'forest' | 'mud' | 'asphalt' | 'tile' | 'stairs'
 */
export function getSurfaceType(x, y, z) {
  if (y > 0.35 && y < 3.4) return 'stairs';
  if (z <= -6.0) return 'tile';
  if (z <= 9.5) return 'asphalt';
  if (distFromRoad(x, z) <= 0.35) return 'mud';
  return 'forest';
}
