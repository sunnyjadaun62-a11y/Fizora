import { clamp } from "./anim";

/**
 * Shared, mutable state between the scroll system (GSAP) and the WebGL world.
 * Written by ScrollTriggers, read every frame by the scene — kept outside React
 * so scrolling never triggers a re-render.
 */
export const stage = {
  /** 0 → 1 across the whole page; the scene derives everything from this */
  progress: 0,
  /** Lenis scroll velocity, px/frame */
  velocity: 0,
  /** pointer in -1..1 */
  px: 0,
  py: 0,
  /** set once the loader curtain lifts */
  ready: false,
};

/**
 * Story beats — each <section data-beat="key"> maps its scroll range onto one
 * of these windows. Contiguous 0 → 1.
 */
export const BEATS = {
  hero: [0, 0.1],
  chill: [0.1, 0.3],
  crack: [0.3, 0.46],
  flavours: [0.46, 0.72],
  pour: [0.72, 0.88],
  finale: [0.88, 1],
} as const;

export type Beat = keyof typeof BEATS;

/** sub-progress inside a beat, 0..1 */
export const within = (p: number, b: Beat) => clamp((p - BEATS[b][0]) / (BEATS[b][1] - BEATS[b][0]));

/**
 * Continuous flavour position 0 → 2 during the flavours beat. Each flavour
 * holds for a while, then the next one fills the can from the bottom up.
 * Shared by the can's wipe shader and the HTML list so they always agree.
 */
export const flavourF = (p: number) => {
  const t = within(p, "flavours") * 3; // three equal slots
  const hold = (x: number) => clamp((x - 0.62) / 0.38); // last 38% of a slot is the wipe
  return Math.min(2, Math.floor(t) + hold(t - Math.floor(t)));
};

/** which flavour is "on" (the wipe flips it at the halfway mark) */
export const flavourAt = (p: number) => Math.min(2, Math.round(flavourF(p)));
