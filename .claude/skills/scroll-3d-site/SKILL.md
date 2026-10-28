---
name: scroll-3d-site
description: Build a cinematic, scroll-driven 3D marketing website (Next.js + raw three.js + GSAP ScrollTrigger + Lenis) in the style of the Ironridge (construction) and Maharani/cloths (textile) projects. Use when the user wants a new "3D website", "3D landing page", "immersive scroll experience", WebGL hero, or says "like ironridge" / "like cloths" — for any industry or brand.
---

# Scroll-driven 3D site

Recipe distilled from two shipped projects in `D:\personal`:

| Project | Hero subject | 3D technique | Scroll model |
|---|---|---|---|
| `ironridge/` | Construction site: truck hauls, loader digs, crane builds tower, day→night, blueprint scan | Full world: terrain, rigged GLB machines, PBR textures, Sky, GTAO + bloom, particles | **Continuous film**: `stage.progress` 0→1, every visual is a pure function of it (scroll back = rewind) |
| `kavira/` | Hospital assembles floor by floor, ambulance arrives, floors explode per department, x-ray scan, helicopter lands at night | Fully procedural (no GLBs): instanced fins/trees/city, canvas textures, shader-patched x-ray, depthTest-off wireframe holograms | Continuous film, sections use CSS `sticky` instead of GSAP pin |
| `cloths/` | Silk dupatta held in wind, re-weaves into new fabrics | Single hero object: Verlet cloth sim, procedural canvas textures, shader-patched `MeshPhysicalMaterial` | **State targets**: each section sets `{x,y,tilt,wind,fabric}`, scene damps toward them |

When in doubt, read the real source in those folders — they are the reference implementation. Templates in `templates/` are copied from them.

## Stack (pin these)

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (`@import "tailwindcss"` + `@theme`)
- `three` (raw, **no** react-three-fiber), `gsap` (ScrollTrigger + SplitText, free now), `lenis`
- Dev: `@gltf-transform/*`, `meshoptimizer`, `sharp` (asset pipeline)
- `next.config.ts`: `cacheComponents: true`. If build breaks on three examples, use `next build --webpack` (cloths did).
- Next 16 differs from training data — read `node_modules/next/dist/docs/` before touching Next APIs (AGENTS.md rule).

## Architecture (non-negotiable core)

```
src/app/layout.tsx        fonts (next/font) as CSS vars, metadata, themeColor
src/app/page.tsx          <Site />
src/components/Site.tsx   "use client" — Lenis, GSAP context, loader, reveals, ScrollTriggers → stage
src/components/SceneCanvas.tsx  dynamic-imports scene, reports load progress, photo fallback if WebGL fails
src/scene/World.ts        createWorld(host, onProgress) → { dispose }   (plain TS, no React)
src/scene/*.ts            one module per subject (terrain, building, machines, dust, pbr…)
src/lib/stage.ts          shared mutable state object + BEATS map
src/lib/anim.ts           clamp/lerp/smooth/range/damp/track/rng/noise — allocation-free
src/lib/content.ts        all copy/data arrays (sections stay dumb)
src/components/sections/  one file per section, each <section data-beat|data-stage="key">
scripts/                  fetch-textures.mjs, optimize-models.mjs, inspect-model.mjs
public/{models,textures,images,video}
```

Key rules:
1. **`stage` object is the only bridge** scroll → WebGL. GSAP/ScrollTrigger write it; render loop reads it every frame. Never React state for per-frame values — scroll must not re-render.
2. **Scene damps toward stage** with `damp(k, dt)` (frame-rate independent), never snaps. Clamp `dt` to ≤0.1.
3. **Keyframe tracks** (`track(KEYS, p, out)`) for camera, sun, fog, colors: arrays of `[p, ...values]`. Easy to tune, reversible.
4. **Section → progress window** via `BEATS` map; ScrollTriggers for beats are created **last** in the GSAP context so pin spacers are already measured. Call `ScrollTrigger.refresh()` after `document.fonts.ready`.
5. Lenis drives `gsap.ticker`; `lagSmoothing(0)`; Lenis velocity → `stage.velocity` (wind / camera shake / particle speed).
6. Canvas `position: fixed; inset: 0; z-index: 0` behind `<main>` (z 2). Add `.world-shade` vignette gradient for text legibility.
7. Pre-allocate vectors/arrays outside the frame loop. Zero allocation per frame.
8. `dispose()` everything: geometries, materials, textures, render targets, pmrem, composer, renderer, listeners, rAF.

See `references/architecture.md` for the full code skeleton of Site.tsx, stage.ts and World.ts.

## Signature UX kit (both projects use all of these)

- **Loader curtain**: counter `000→100` + bar driven by real `LoadingManager` progress (ironridge) or timed (cloths); lift with `yPercent:-100, expo.inOut`; then hero chars/lines rise from masks. Lenis stays stopped until lift. Fallback lift at 12s.
- **SplitText reveals**: `[data-reveal]` lines masked, `[data-fade]` fade-up, `[data-count]` number count-ups, `[data-speed]` parallax.
- **Pinned sequences**: sticky services list with clip-path image wipes; horizontal pinned project track; process timeline line scaleX.
- **Custom cursor**: `gsap.quickTo` ring + dot, `mix-blend-mode: difference`, grows on links, hidden on touch.
- **Film grain** SVG turbulence overlay at 5–6% opacity, stepped animation.
- **Section themes**: `data-theme` on sections toggles `:root[data-theme=…]` CSS vars (cloths: ink / indigo / ivory).
- **Dev aids**: `?p=0.5` freezes film at progress; `?scene` hides HTML to inspect world.
- Display type: big condensed/wide uppercase or elegant serif, + mono eyebrow labels with accent dash.

CSS snippets: `references/ui-kit.md`.

## Workflow for a new project

1. **Brief → hero subject + story.** Pick ONE thing that can be told in 5–8 scroll beats. Decide model: *continuous film* (world that evolves) vs *state targets* (one object reposed per section). Write `BEATS` before any code.
2. **Art direction**: palette (5–8 tokens in `@theme`), two fonts, lighting mood per beat (sun/fog tracks). Load `design-taste-frontend` / `frontend-design` skill for anti-template direction.
3. **Scaffold**: `npx create-next-app@latest <name> --ts --tailwind --app --src-dir`, then `npm i three gsap lenis` + `npm i -D @types/three @gltf-transform/core @gltf-transform/extensions @gltf-transform/functions meshoptimizer sharp`. Copy `templates/` into `src/` and `scripts/`.
4. **Assets**: CC0 only — Poly Haven (textures/HDRIs, via `fetch-textures.mjs`), Poly Pizza / Sketchfab CC0 / Kenney for models. Run through `optimize-models` (meshopt, 1K WebP textures, hinge pivots for moving parts). Procedural (canvas textures, generated geometry) when no good model exists — cloths' fabrics are 100% procedural. See `references/assets.md`.
5. **Build world** with `?p=` pinning, beat by beat. Then HTML sections over it. Then loader + reveals. Then mobile pass.
6. **Verify**: `npm run build`, run dev, check in browser (claude-in-chrome) at desktop + 390px width, reduced-motion on, scroll fully down and back up.

## Lessons learned (apply by default)

- **Bloom only when the scene is dark** (night, scan). Bloom on a sunny daylight scene washes everything white.
- Daylight exposure ~0.6 with ACES; ~0.9 at night. Check midday shots for blown-out white.
- **Copy on the left → push subject right**: on wide screens offset `camLook` by `-camRight * k` during beats where text overlaps the subject.
- **CSS `sticky` blocks inside tall sections** (min-h 200–400svh) are simpler than GSAP pins and keep beat mapping exact. On phones use `md:sticky` (tall content clips) except for compact interactive blocks.
- **Shared progress helper** (e.g. `deptAt(p)` in stage.ts) used by both scene and HTML so highlighted item and 3D always agree.
- Phones: full-screen `.world-shade` gradient, not just a left vignette.
- "Simple view" toggle for trust-critical sites: `html.simple` hides canvas, `stage.paused` skips render; store via `useSyncExternalStore` (lint forbids setState in effect).
- `react-hooks/set-state-in-effect` lint rule is on in Next 16 configs.
- Procedural-only worlds load instantly and avoid licensing; reach for GLBs only for hero machines/vehicles.

## Verifying without the Chrome extension

Headless Chrome via `puppeteer-core` (installed in scratchpad, `executablePath` = system Chrome, args `--use-angle=d3d11 --enable-gpu --ignore-gpu-blocklist`):
- `/?scene&p=0.5` screenshots each beat of the world alone.
- Scripts: `templates/scripts/verify-beats.mjs` + `verify-scroll.mjs` (edit port + section ids). `npm i puppeteer-core` in scratchpad first.
- Real scroll test: `window.scrollTo` to `section.top + height * f`, wait ~4s for damping, screenshot at 1440×860 and 390×844; collect `pageerror` + console errors.

## Performance + accessibility budget

- `small = innerWidth < 768`: pixelRatio cap 1.25 (desktop 1.5–1.75), no MSAA, no GTAO, half shadow map, fewer particles / sim cells.
- Post: `EffectComposer` with HalfFloat MSAA RT → RenderPass → (GTAO) → UnrealBloom (disable when strength≈0) → OutputPass. ACES tone mapping, exposure ~0.8.
- Env lighting: `PMREMGenerator.fromScene(RoomEnvironment | Sky)`; regenerate only when sun moves > threshold.
- `prefers-reduced-motion`: no Lenis, no shake/parallax/particles, faster damping, kill grain/marquee animations.
- WebGL failure → `SceneCanvas` shows static hero image and reports progress 1 so loader lifts.
- Canvas `aria-hidden`; all real content is semantic HTML on top. Keep text contrast via shade gradients/panels.
- GLB total ideally < 6 MB, textures 1K WebP (normal/arm 512).

## Picking the hero concept (any industry)

Method: find the one physical thing the business *makes, moves or transforms*, and let scroll show that transformation. Past examples:

| Project | Hero | Beats |
|---|---|---|
| ironridge (construction) | Site builds itself (world) | haul → dig → frame → blueprint scan → night skyline |
| cloths (textile) | Living fabric in wind (single object) | drape → re-weave per collection → denim → partners |

Offer the user 2–3 concepts, mixing these shapes:
- **World that evolves**: the place/product assembles or changes over time (building, factory, city, landscape, day→night).
- **Hero object reposed per section**: one tactile object (fabric, product, vehicle, device) moves, changes material, explodes into parts.
- **Abstract signature form**: brand symbol as 3D (ribbon, particles, helix, line) that morphs per chapter.

Adapt tone to audience: luxury → slow, serif, dark; industrial → bold, mono, HUD; trust-critical (health, finance, govt) → calm, light, high contrast, key info (contact/CTA) always visible, a "simple view / reduce motion" toggle.

Always ask user to confirm hero concept + beats before building the world.
