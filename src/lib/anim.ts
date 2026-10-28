/** Small, allocation-free helpers for progress-driven choreography. */

export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
/** 0→1 as p moves from a to b, eased */
export const range = (p: number, a: number, b: number) => smooth(clamp((p - a) / (b - a)));
/** linear version of range */
export const rangeLin = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
/** frame-rate independent damping factor */
export const damp = (k: number, dt: number) => 1 - Math.exp(-k * dt);

/**
 * Keyframe track over progress: [[p, ...values], ...] sorted by p.
 * Writes eased-interpolated values into `out` and returns it.
 */
export function track(keys: number[][], p: number, out: number[]) {
  const n = keys[0].length - 1;
  if (p <= keys[0][0]) {
    for (let i = 0; i < n; i++) out[i] = keys[0][i + 1];
    return out;
  }
  const last = keys[keys.length - 1];
  if (p >= last[0]) {
    for (let i = 0; i < n; i++) out[i] = last[i + 1];
    return out;
  }
  let k = 0;
  while (keys[k + 1][0] < p) k++;
  const a = keys[k];
  const b = keys[k + 1];
  const t = smooth((p - a[0]) / (b[0] - a[0]));
  for (let i = 0; i < n; i++) out[i] = a[i + 1] + (b[i + 1] - a[i + 1]) * t;
  return out;
}

/** deterministic PRNG */
export function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** cheap 2D value noise, roughly -1..1 */
export function noise2(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const h = (i: number, j: number) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const u = smooth(xf);
  const v = smooth(yf);
  return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v);
}

export function fbm(x: number, y: number) {
  return noise2(x, y) * 0.55 + noise2(x * 2.1, y * 2.1) * 0.28 + noise2(x * 4.3, y * 4.3) * 0.17;
}
