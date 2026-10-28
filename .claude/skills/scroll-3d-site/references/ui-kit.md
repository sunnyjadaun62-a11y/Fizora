# UI kit (CSS, Tailwind v4)

Full sheets: `D:\personal\ironridge\src\app\globals.css`, `D:\personal\cloths\src\app\globals.css`.

```css
@import "tailwindcss";
@theme {
  --font-sans: var(--font-archivo), system-ui, sans-serif;
  --font-mono: var(--font-mono), ui-monospace, monospace;
  --color-ink: #121314;  --color-paper: #ebe7df;  --color-accent: #ff6a1a;
  --ease-out: cubic-bezier(0.16, 1, 0.3, 1);
}
:root { --bg: var(--color-ink); --fg: #f1eee8; --fg-mute: rgb(241 238 232 / .58); --line: rgb(241 238 232 / .16); color-scheme: dark; }
:root[data-theme="light"] { --bg: var(--color-paper); --fg: #1a1512; --fg-mute: rgb(26 21 18 / .58); --line: rgb(26 21 18 / .14); color-scheme: light; }

html { background: var(--color-ink); }
html.lenis, html.lenis body { height: auto; }
.lenis.lenis-smooth { scroll-behavior: auto !important; }
body { background: transparent; color: var(--fg); overflow-x: clip; -webkit-font-smoothing: antialiased; }

.world { position: fixed; inset: 0; z-index: 0; }
.world canvas { display: block; }
.world-shade { position: fixed; inset: 0; z-index: 1; pointer-events: none;
  background: linear-gradient(90deg, rgb(10 11 12 / .62), rgb(10 11 12 / 0) 70%),
              linear-gradient(0deg, rgb(10 11 12 / .6), transparent 40%); }
main { position: relative; z-index: 2; }

.display { font-weight: 800; font-stretch: 125%; text-transform: uppercase; letter-spacing: -0.035em; line-height: .86; }
.eyebrow { font-family: var(--font-mono); font-size: .68rem; letter-spacing: .2em; text-transform: uppercase; color: var(--fg-mute); display: inline-flex; gap: .75rem; align-items: center; }
.eyebrow::before { content: ""; width: 18px; height: 2px; background: var(--color-accent); }
.panel { background: rgb(18 19 20 / .62); border: 1px solid var(--line); backdrop-filter: blur(14px) saturate(1.2); }

/* button: fill slides in from left */
.btn { position: relative; overflow: hidden; isolation: isolate; display: inline-flex; gap: .9rem; padding: 1.05rem 1.6rem; transition: color .45s var(--ease-out); }
.btn::before { content: ""; position: absolute; inset: 0; z-index: -1; transform: translateX(-101%); transition: transform .55s var(--ease-out); }
.btn:hover::before { transform: none; }

/* SplitText line masks */
.line-mask { display: block; overflow: hidden; padding-bottom: .06em; margin-bottom: -.06em; }

/* cursor */
.reticle { position: fixed; top: 0; left: 0; z-index: 95; width: 44px; height: 44px; margin: -22px 0 0 -22px; pointer-events: none; mix-blend-mode: difference; }
@media (hover: none), (pointer: coarse) { .reticle, .reticle-dot { display: none; } }

/* grain */
.grain { position: fixed; inset: -50%; z-index: 85; pointer-events: none; opacity: .06;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
  animation: grain 1.2s steps(6) infinite; }
@keyframes grain { 20% { transform: translate(-3%,2%) } 40% { transform: translate(2%,-3%) } 60% { transform: translate(-2%,-1%) } 80% { transform: translate(3%,3%) } }
@media (prefers-reduced-motion: reduce) { .grain, .marquee { animation: none; } }

/* dev aid ?scene */
.scene-only main, .scene-only header, .scene-only .loader, .scene-only .world-shade { display: none !important; }
```

Loader markup:
```tsx
<div className="loader fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-ink)]">
  <div className="loader-inner w-[min(360px,76vw)]">
    <div className="flex items-end justify-between">
      <p className="display text-3xl">Brand</p>
      <p className="loader-count display text-3xl tabular-nums">000</p>
    </div>
    <div className="mt-5 h-[3px] bg-white/10"><div className="loader-bar h-full origin-left scale-x-0 bg-[var(--color-accent)]" /></div>
  </div>
</div>
```

Section patterns used: hero (masked display lines + CTA pair), manifesto (word-by-word opacity scrub), pinned services list w/ clip-path image wipe, stat count-ups, pinned horizontal project track, process timeline, HUD sidebar with per-beat progress bars (ironridge), slide-in menu drawer, contact form w/ underline fields, giant footer wordmark char reveal.
