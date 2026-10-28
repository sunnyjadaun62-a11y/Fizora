# Asset pipeline

## Textures — `templates/scripts/fetch-textures.mjs`
- Poly Haven API (`https://api.polyhaven.com/files/<id>`), CC0. Pulls diff / nor_gl / arm at 1K, converts with sharp: diff 1024 WebP q80, nor+arm 512.
- Output `public/textures/<id>_{diff,nor,arm}.webp`. Edit `IDS` list.
- Use via `pbr(id, repeatX, repeatY, extraParams)` from `scene/pbr.ts` — shared cache, clones per tiling, counts in LoadingManager.
- Browse ids at polyhaven.com/textures (verify each id exists before adding).

## Models — `templates/scripts/optimize-models.example.mjs`
- Raw sources in `_assets/models/` (gitignored), output `public/models/`.
- Per model: regex-match mesh names into named groups, move each group's origin to its hinge `pivot` (so three.js can rotate it), merge per material per group, `dedup/prune/weld/join`, textureCompress → 1K WebP, `meshopt` geometry. Load with `GLTFLoader` + `MeshoptDecoder`.
- Write a tiny `scripts/inspect-model.mjs` first to list node/mesh names + bounds, then author the group regexes.
- At load: `prep()` traverse → castShadow/receiveShadow, recolor brand material by name, transparent → depthWrite false. Wrap in root Group so every rig faces +Z. `req(name)` throws if rig part missing.
- Sources: Poly Haven models, Kenney, Poly Pizza, Sketchfab (filter CC0/CC-BY, credit CC-BY). Check license each time.

## Procedural (no downloads)
- Canvas textures (cloths `fabrics.ts`): paint colour pass + ORM pass (G roughness, B metal) on 1024×1792 canvas with seeded rng, grain overlay, streaks, weave lines, motifs → `CanvasTexture`, `renderer.initTexture()` up front.
- Generated geometry: terrain heightfield from `fbm()`, buildings from box floors revealed by progress, particles as `Points` with soft radial-gradient sprite (`softDot()`), additive blend.

## Images / video
- Photos in `public/images` via `next/image` (fallback hero, cards). Use AI-generated or licensed stock; credit if needed.
- Ambient video: muted, loop, playsInline, poster jpg, lazy play via IntersectionObserver.
