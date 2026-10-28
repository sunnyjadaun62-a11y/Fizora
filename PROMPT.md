Build "Fizzora", a single cinematic landing page for a sparkling soda brand (Cherry Cola, Blood Orange, Raspberry Zero). Next.js 16 + raw three.js + GSAP ScrollTrigger/SplitText + Lenis + Tailwind v4. Landing page only.

Look: red studio — near-black wine sweep with a coloured glow behind the can that follows the flavour, ring-shaped bubbles rising, Anton (uppercase) + Instrument Sans, cherry red / cream palette, film grain, bubble cursor, loader = a can outline filling with cream.

World (continuous film, `stage.progress` 0→1, every pose a pure function of it so scrolling back rewinds). Everything procedural: lathe neck/base + open cylinder body with a 2048×1024 canvas wrap label (vertical wordmark, flavour name, info panels, barcode), condensation beads, extruded pull tab hinged on the rivet, teardrop opening; frosted translucent ice with a cloudy core; cherries, blood-orange slices (canvas texture), merged-drupelet raspberries; tumbler glass (transmissive) with opaque liquid, foam and ice inside.

Beats:
1. Hero — can drops in with ice, "Crack the cold."
2. Chill — can spins a full turn, ice drifts away; three lines punch through blur.
3. Crack — camera rises over the lid, tab lifts, panel pushes in, camera kick, fizz fountain (looping point particles gated by scroll), outlined "PSSSHT!", stat count-ups.
4. Flavours — label refills bottom-up with a wavy foam line (shader blend of two label maps), fruit ring swaps per flavour, list synced via shared `flavourF(p)`.
5. Pour — label returns to Cherry Cola, glass rises, can tilts so its mouth lands over the glass (solved each frame), stream + rising liquid.
6. Finale — can upright beside the full glass, ice returns, red marquee, pack picker + cart toast, Fizz Club signup, footer.

Phones: subject lifted with a wider lens, full-height shade, one flavour shown at a time. Reduced motion: no Lenis, fast damping, no grain/marquee.
