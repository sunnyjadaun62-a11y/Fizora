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
 * of these progress windows. Scene choreography and any HUD key off them.
 * Rename/re-split per project; windows must be contiguous 0 → 1.
 */
export const BEATS = {
  hero: [0, 0.1],
  beat1: [0.1, 0.3],
  beat2: [0.3, 0.5],
  beat3: [0.5, 0.7],
  beat4: [0.7, 0.9],
  contact: [0.9, 1],
} as const;

export type Beat = keyof typeof BEATS;
