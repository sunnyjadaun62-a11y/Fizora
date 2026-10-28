# Architecture skeletons

Full originals: `D:\personal\ironridge\src\components\Site.tsx`, `src\scene\World.ts`, `D:\personal\cloths\src\components\Site.tsx`, `src\components\SilkCanvas.tsx`.

## stage.ts — variant A: continuous film (ironridge)

```ts
export const stage = { progress: 0, velocity: 0, px: 0, py: 0, ready: false };

// each <section data-beat="key"> maps its scroll range onto this window
export const BEATS = {
  hero: [0, 0.08],
  chapter1: [0.08, 0.32],
  chapter2: [0.32, 0.46],
  // ...
  contact: [0.92, 1],
} as const;
export type Beat = keyof typeof BEATS;
```

## stage.ts — variant B: state targets (cloths)

```ts
export interface StageTarget { x: number; y: number; tilt: number; turn: number; wind: number; variant: number }
export const stage: StageTarget & { velocity: number; ready: boolean } = { x: 0.35, y: 3.2, tilt: 0, turn: 0, wind: 1, variant: 0, velocity: 0, ready: false };
export const setStage = (t: Partial<StageTarget>) => Object.assign(stage, t);
```
x/y in viewport units (-1..1); y > 1 = parked off-screen above. Fractional `variant` blends two looks (shader mix uniform).

## Site.tsx skeleton

```tsx
"use client";
gsap.registerPlugin(ScrollTrigger, SplitText);

useEffect(() => {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  history.scrollRestoration = "manual"; scrollTo(0, 0);

  const lenis = reduce ? null : new Lenis({ lerp: 0.075, wheelMultiplier: 0.85 });
  const onTick = (t: number) => lenis?.raf(t * 1000);
  if (lenis) {
    lenis.on("scroll", (l) => { stage.velocity = l.velocity; ScrollTrigger.update(); });
    gsap.ticker.add(onTick); gsap.ticker.lagSmoothing(0); lenis.stop();
  }
  // anchor clicks → lenis.scrollTo(target, { duration: 2.4 })
  // pointermove → stage.px/py in -1..1

  const ctx = gsap.context(() => {
    // 1. cursor (quickTo)
    // 2. loader tick: shown += (loadTarget - shown) * 0.08; lift when >0.985 && >1.2s, or >12s
    //    lift timeline: inner fade → curtain yPercent -100 → stage.ready=true, lenis.start() → hero lines rise
    // 3. generic [data-reveal]/[data-fade]/[data-count] ScrollTriggers
    // 4. pinned sequences (pin: true, scrub: 1, end: "+=280%")
    // 5. LAST: beat triggers → stage
    const beats = gsap.utils.toArray<HTMLElement>("[data-beat]").map((sec, i, all) => {
      const last = i === all.length - 1, nextToLast = i === all.length - 2;
      const st = ScrollTrigger.create({ trigger: sec,
        start: last ? "top bottom" : "top top",
        end: last || nextToLast ? "bottom bottom" : "bottom top" });
      return { st, range: BEATS[sec.dataset.beat as Beat] };
    });
    const sync = () => {
      const y = lenis ? lenis.scroll : scrollY;
      for (let i = 0; i < beats.length; i++) {
        const { st, range } = beats[i];
        if (y <= st.end || i === beats.length - 1) {
          stage.progress = range[0] + (range[1] - range[0]) * clamp((y - st.start) / Math.max(st.end - st.start, 1));
          break;
        }
      }
    };
    gsap.ticker.add(sync);
    // variant B instead: ScrollTrigger.create({ trigger: sec, start: "top 55%", end: "bottom 45%",
    //   onToggle: s => { if (!s.isActive) return; html.dataset.theme = sec.dataset.theme; if (stage.ready) setStage(states[key]); } })
    // states object has separate mobile/desktop poses.
  }, root);
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  return () => { ctx.revert(); /* remove listeners, ticker, lenis.destroy() */ };
}, []);
```

JSX order: `<SceneCanvas/>`, `.world-shade`, `.grain`, cursor els, `.loader`, header/HUD, menu drawer, `<main>` sections.

## World.ts skeleton (variant A)

```ts
export async function createWorld(host: HTMLElement, onProgress: (f: number) => void) {
  const small = innerWidth < 768;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const renderer = new THREE.WebGLRenderer({ antialias: !small, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.5));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.8;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 4000);
  // Sky + separate small env Sky → PMREM (regen when sun elev changes >1.5°)
  // DirectionalLight sun w/ shadow camera ±75, Hemisphere, optional moon
  const manager = new THREE.LoadingManager();
  manager.onProgress = (_u, l, t) => onProgress(l / t);
  initPbr(manager);
  // build modules: terrain(), site(), building(), await loadModels(manager), dust()

  // post: HalfFloat RT samples 4 → RenderPass → GTAO (desktop) → UnrealBloom → OutputPass

  // tracks: CAM [p, px,py,pz, lx,ly,lz, fov], SUN [p, elev, azim], FOG [p, r,g,b]
  const pinnedP = new URLSearchParams(location.search).get("p"); // dev aid
  let curP = stage.progress;
  const frame = (ts?: number) => {
    raf = requestAnimationFrame(frame);
    timer.update(ts); const dt = Math.min(timer.getDelta(), 0.1);
    curP += (stage.progress - curP) * damp(reduce ? 20 : 5, dt);
    const p = curP;
    // every object: pose = f(p) using range(p, a, b) windows; ambient life = f(time)
    // camera: track(CAM) → optional follow-cam lerp → pointer parallax → velocity shake
    //         → clamp above terrain → lerp current toward target with damp(6, dt)
    // portrait: fov *= 1.4 when aspect < 1
    composer.render();
  };
  renderer.compile(scene, camera); onProgress(1); frame();
  return { dispose() { /* cancel raf, traverse+dispose, envRT, pmrem, composer, renderer, removeChild */ } };
}
```

## Single-object variant (cloths SilkCanvas)

- `alpha: true` renderer, transparent clear, canvas `z-index: 5; pointer-events: none` floating above sections (with `.layer-front` content above when needed).
- `RoomEnvironment` PMREM for reflections; key + rim + warm point light.
- Fixed-step sim (`STEP = 1/60`, accumulator, max 3 steps/frame).
- Camera distance from aspect so object keeps ~65% width on portrait.
- Map stage x/y (viewport units) → world via `view.halfW/halfH` computed in resize.
- Variant blending: `material.onBeforeCompile` replaces `#include <map_fragment>` etc. with `mix(texA, texB, wipeFront)` + emissive seam glow.
