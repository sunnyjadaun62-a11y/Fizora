"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { BEATS, flavourAt, stage, type Beat } from "@/lib/stage";
import { clamp } from "@/lib/anim";
import { BRAND, CHILL_LINES, FLAVOURS, NAV, PACKS, POUR_STEPS, SHOUTS, STATS } from "@/lib/content";

const SceneCanvas = dynamic(() => import("@/components/SceneCanvas"), { ssr: false });

gsap.registerPlugin(ScrollTrigger, SplitText);

const BEAT_KEYS = Object.keys(BEATS) as Beat[];
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function Site() {
  const root = useRef<HTMLDivElement>(null);
  const loadTarget = useRef(0);
  const [flav, setFlav] = useState(0);
  const [cart, setCart] = useState(0);
  const [bump, setBump] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);
  const toastTimer = useRef(0);

  const onProgress = useCallback((f: number) => {
    loadTarget.current = Math.max(loadTarget.current, f);
  }, []);

  const addToCart = (name: string) => {
    setCart((b) => b + 1);
    setBump((b) => b + 1);
    setToast(name);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const html = document.documentElement;
    if (new URLSearchParams(location.search).has("scene")) html.classList.add("scene-only");
    history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    /* ------------------------------------------------ smooth scroll */
    const lenis = reduce ? null : new Lenis({ lerp: 0.08, wheelMultiplier: 0.85 });
    const onTick = (t: number) => lenis?.raf(t * 1000);
    if (lenis) {
      lenis.on("scroll", (l: Lenis) => {
        stage.velocity = l.velocity;
        ScrollTrigger.update();
      });
      gsap.ticker.add(onTick);
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
    const onAnchor = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!a) return;
      e.preventDefault();
      const target = a.getAttribute("href")!;
      if (lenis) lenis.scrollTo(target === "#top" ? 0 : target, { duration: 2.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
      else if (target === "#top") window.scrollTo(0, 0);
      else document.querySelector(target)?.scrollIntoView();
    };
    document.addEventListener("click", onAnchor);

    const ctx = gsap.context(() => {
      /* ------------------------------------------------ cursor */
      const cursor = document.querySelector<HTMLElement>(".cursor")!;
      const cx = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3" });
      const cy = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3" });
      const move = (e: PointerEvent) => {
        stage.px = (e.clientX / innerWidth) * 2 - 1;
        stage.py = (e.clientY / innerHeight) * 2 - 1;
        if (e.pointerType !== "mouse") return;
        html.classList.add("has-pointer");
        cx(e.clientX);
        cy(e.clientY);
        html.classList.toggle("on-link", !!(e.target as HTMLElement).closest("a, button, input"));
      };
      window.addEventListener("pointermove", move, { passive: true });

      /* ------------------------------------------------ hero split (prepared, played on lift) */
      const split = new SplitText("[data-split]", { type: "lines", mask: "lines", linesClass: "line" });
      gsap.set(split.lines, { yPercent: 115, rotate: 4 });
      gsap.set(".hero-fade", { autoAlpha: 0, y: 18 });

      /* ------------------------------------------------ loader → arrival */
      const countEl = document.querySelector<HTMLElement>(".loader-count");
      const fillEl = document.querySelector<HTMLElement>(".loader-fill");
      const t0 = performance.now();
      let shown = 0;
      let lifted = false;
      const lift = () => {
        lifted = true;
        gsap.ticker.remove(loadTick);
        const tl = gsap.timeline();
        tl.to(".loader-inner", { autoAlpha: 0, scale: 0.94, duration: 0.5, ease: "power2.in" })
          .to(".loader", { yPercent: -100, duration: 1.15, ease: "expo.inOut" }, "-=0.1")
          .add(() => {
            stage.ready = true;
            lenis?.start();
          }, "-=0.8")
          .to(split.lines, { yPercent: 0, rotate: 0, duration: 1.3, stagger: 0.1, ease: "expo.out" }, "-=0.25")
          .to(".hero-fade", { autoAlpha: 1, y: 0, duration: 1, stagger: 0.08, ease: "power3.out" }, "-=1")
          .fromTo(".chrome", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1 }, "-=1")
          .set(".loader", { display: "none" });
      };
      const loadTick = () => {
        const elapsed = (performance.now() - t0) / 1000;
        shown += (loadTarget.current - shown) * (reduce ? 0.5 : 0.08);
        if (countEl) countEl.textContent = String(Math.round(shown * 100)).padStart(3, "0");
        if (fillEl) fillEl.style.transform = `scaleY(${shown})`;
        if (!lifted && ((shown > 0.985 && elapsed > 1.2) || elapsed > 12)) lift();
      };
      gsap.ticker.add(loadTick);

      /* ------------------------------------------------ header gets a glass once you leave the top */
      ScrollTrigger.create({
        start: 120,
        end: "max",
        onToggle: (s) => document.querySelector(".site-header")?.classList.toggle("solid", s.isActive),
      });

      /* ------------------------------------------------ generic reveals */
      gsap.utils.toArray<HTMLElement>("[data-rise]").forEach((el) => {
        gsap.fromTo(
          el,
          { autoAlpha: 0, y: 34 },
          { autoAlpha: 1, y: 0, duration: 1.1, ease: "power3.out", scrollTrigger: { trigger: el, start: "top 90%" } },
        );
      });
      gsap.utils.toArray<HTMLElement>("[data-count]").forEach((el) => {
        const to = Number(el.dataset.count);
        const o = { v: 0 };
        gsap.to(o, {
          v: to,
          duration: 1.8,
          ease: "power2.out",
          scrollTrigger: { trigger: el, start: "top 88%" },
          onUpdate: () => {
            el.textContent = String(Math.round(o.v));
          },
        });
      });

      /* ------------------------------------------------ chill: three lines punch through blur */
      const lines = gsap.utils.toArray<HTMLElement>(".chill-line");
      const chillTl = gsap.timeline({ scrollTrigger: { trigger: "#chill", start: "top top", end: "bottom bottom", scrub: 1 } });
      lines.forEach((l, i) => {
        chillTl.fromTo(l, { autoAlpha: 0, scale: 0.86, filter: "blur(14px)" }, { autoAlpha: 1, scale: 1, filter: "blur(0px)", duration: 1, ease: "back.out(2)" }, i * 2.2);
        if (i < lines.length - 1) chillTl.to(l, { autoAlpha: 0, y: -40, filter: "blur(10px)", duration: 1, ease: "power2.in" }, i * 2.2 + 1.5);
      });
      chillTl.to({}, { duration: 1.2 });

      /* ------------------------------------------------ the crack: the word bursts in on impact */
      gsap.fromTo(
        ".crack-word",
        { autoAlpha: 0, scale: 0.6, filter: "blur(12px)" },
        { autoAlpha: 1, scale: 1, filter: "blur(0px)", ease: "back.out(2.6)", scrollTrigger: { trigger: "#crack", start: "top -12%", end: "top -40%", scrub: 1 } },
      );
      gsap.fromTo(
        ".crack-in",
        { autoAlpha: 0, y: 30 },
        { autoAlpha: 1, y: 0, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: "#crack", start: "top -30%", end: "top -70%", scrub: 1 } },
      );
      gsap.fromTo(".pour-in", { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, stagger: 0.1, ease: "power3.out", scrollTrigger: { trigger: "#pour", start: "top 30%", end: "top -30%", scrub: 1 } });

      /* ------------------------------------------------ per-frame chrome: rail + flavour list */
      const bars = gsap.utils.toArray<HTMLElement>(".rail b");
      let flavShown = -1;
      const chrome = () => {
        const p = stage.progress;
        for (let i = 0; i < BEAT_KEYS.length; i++) {
          const [a, b] = BEATS[BEAT_KEYS[i]];
          bars[i].style.transform = `scaleY(${clamp((p - a) / (b - a))})`;
        }
        const fi = flavourAt(p);
        if (fi !== flavShown) {
          flavShown = fi;
          setFlav(fi);
        }
      };
      gsap.ticker.add(chrome);

      /* ------------------------------------------------ LAST: beats → film progress */
      const beats = gsap.utils.toArray<HTMLElement>("[data-beat]").map((sec, i, all) => {
        const lastOne = i === all.length - 1;
        const nextToLast = i === all.length - 2;
        const st = ScrollTrigger.create({
          trigger: sec,
          start: lastOne ? "top bottom" : "top top",
          end: lastOne || nextToLast ? "bottom bottom" : "bottom top",
        });
        return { st, range: BEATS[sec.dataset.beat as Beat] };
      });
      const sync = () => {
        const y = lenis ? lenis.scroll : window.scrollY;
        for (let i = 0; i < beats.length; i++) {
          const { st, range } = beats[i];
          if (y <= st.end || i === beats.length - 1) {
            stage.progress = range[0] + (range[1] - range[0]) * clamp((y - st.start) / Math.max(st.end - st.start, 1));
            break;
          }
        }
      };
      gsap.ticker.add(sync);

      return () => {
        window.removeEventListener("pointermove", move);
        gsap.ticker.remove(loadTick);
        gsap.ticker.remove(chrome);
        gsap.ticker.remove(sync);
        split.revert();
      };
    }, root);

    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    return () => {
      ctx.revert();
      document.removeEventListener("click", onAnchor);
      if (lenis) {
        gsap.ticker.remove(onTick);
        lenis.destroy();
      }
    };
  }, []);

  return (
    <div ref={root} style={{ "--flav": FLAVOURS[flav].body, "--flav-accent": FLAVOURS[flav].accent } as React.CSSProperties}>
      <SceneCanvas onProgress={onProgress} />
      <div className="world-shade" aria-hidden="true" />
      <div className="grain" aria-hidden="true" />
      <div className="cursor" aria-hidden="true">
        <span className="ring" />
      </div>

      {/* ---------------------------------------------------------- loader: a can filling up */}
      <div className="loader fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-red)]">
        <div className="loader-inner flex flex-col items-center">
          <div className="loader-can">
            <div className="loader-fill" />
          </div>
          <p className="display mt-7 text-[2.4rem] uppercase leading-none text-[var(--color-cream)]">{BRAND}</p>
          <p className="label loader-count mt-2 tabular-nums !text-[var(--color-cream)]">000</p>
        </div>
      </div>

      {/* ---------------------------------------------------------- chrome */}
      <div className="chrome invisible">
        <header className="site-header fixed inset-x-0 top-0 z-50">
          <div className="flex items-center justify-between px-5 py-4 md:px-10 md:py-5">
            <a href="#top" className="wordmark" aria-label={`${BRAND} — back to top`}>
              {BRAND}
            </a>
            <nav className="hidden gap-9 md:flex" aria-label="Sections">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} className="nav-link">
                  {n.label}
                </a>
              ))}
            </nav>
            <a href="#finale" className="cart-pill">
              Cart
              <span key={bump} className={`cart-count ${bump ? "bump" : ""}`} aria-live="polite">
                {cart}
              </span>
            </a>
          </div>
        </header>
        <div className="rail" aria-hidden="true">
          {BEAT_KEYS.map((k) => (
            <i key={k}>
              <b />
            </i>
          ))}
        </div>
      </div>

      <main>
        {/* ======================================================== HERO */}
        <section id="top" data-beat="hero" className="relative h-[100svh]">
          <div className="absolute inset-x-0 bottom-0 px-5 pb-8 md:px-10 md:pb-12">
            <p className="eyebrow hero-fade">Sparkling soda · No.01 Cherry Cola</p>
            <h1 className="display h-hero mt-4 md:mt-5" data-split>
              Crack
              <br />
              the <span className="text-[var(--color-red)]">cold.</span>
            </h1>
            <div className="mt-6 flex flex-col gap-6 md:mt-8 md:flex-row md:items-end md:justify-between">
              <p className="body hero-fade max-w-[24rem]">
                Real cherries, half the sugar, twice the fizz. A cola that bites back — and leaves nothing sticky behind.
              </p>
              <div className="hero-fade flex flex-wrap gap-3">
                <button type="button" className="btn btn-red" onClick={() => addToCart("Six pack")}>
                  Grab a six-pack · {inr(220)}
                </button>
                <a href="#flavours" className="btn btn-ghost">
                  See flavours <span className="arrow">↓</span>
                </a>
              </div>
            </div>
          </div>
          <div className="sticker hero-fade" aria-hidden="true">
            <svg viewBox="0 0 120 120">
              <defs>
                <path id="ring" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
              </defs>
              <text>
                <textPath href="#ring">ICE COLD · REAL FRUIT · ICE COLD · REAL FRUIT ·</textPath>
              </text>
            </svg>
            <span>4°</span>
          </div>
        </section>

        {/* ======================================================== CHILL */}
        <section id="chill" data-beat="chill" className="relative h-[300svh]">
          <div className="sticky top-0 flex h-[100svh] flex-col justify-end px-5 pb-16 md:justify-center md:px-10 md:pb-0">
            <p className="eyebrow" data-rise>
              01 · What&apos;s inside
            </p>
            <div className="relative mt-5 h-[6.5rem] max-w-[40rem] md:h-[10rem]">
              {CHILL_LINES.map((l, i) => (
                <p key={l} className={`chill-line display invisible text-[3.6rem] md:text-[7rem] ${i === 2 ? "text-[var(--color-red)]" : ""}`}>
                  {l}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================== CRACK */}
        <section id="crack" data-beat="crack" className="relative h-[260svh]">
          <div className="sticky top-0 flex h-[100svh] flex-col justify-end px-5 pb-10 md:px-10 md:pb-12">
            <p className="crack-word display invisible" aria-hidden="true">
              Psssht!
            </p>
            <h2 className="display h-lg crack-in">
              Four times <span className="text-[var(--color-red)]">the bite.</span>
            </h2>
            <p className="body crack-in mt-4">We carbonate cold and slow, so the bubbles are tiny, sharp and last to the bottom of the can.</p>
            <div className="mt-8 grid grid-cols-3 gap-4 md:max-w-3xl md:gap-10">
              {STATS.map((s) => (
                <div key={s.label} className="stat crack-in">
                  <p className="display text-[2.6rem] md:text-[4.2rem]">
                    <span data-count={s.value}>0</span>
                    <span className="ml-1 text-[0.45em] text-[var(--color-red)]">{s.suffix}</span>
                  </p>
                  <p className="mt-2 text-[12px] leading-snug text-[var(--fg-mute)] md:text-[13px]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ======================================================== FLAVOURS */}
        <section id="flavours" data-beat="flavours" className="relative h-[420svh]">
          <div className="sticky top-0 flex h-[100svh] flex-col justify-end px-5 pb-8 md:justify-center md:px-10 md:pb-0">
            <div className="md:max-w-[28rem]">
              <p className="eyebrow" data-rise>
                02 · Three ways to fizz
              </p>
              <h2 className="display h-lg mt-4" data-rise>
                Pick your <span className="flav-text">poison.</span>
              </h2>
              <ol className="mt-6 md:mt-9">
                {FLAVOURS.map((f, i) => (
                  <li key={f.key} className={`flav-item ${flav === i ? "on" : ""} ${flav !== i ? "max-md:hidden" : ""}`} style={{ "--c": f.key === "zero" ? f.ink : f.body } as React.CSSProperties}>
                    <div className="flex items-center gap-4">
                      <span className="flav-dot" />
                      <div className="min-w-0 flex-1">
                        <p className="label">{f.tag}</p>
                        <p className="display mt-1 text-[2rem] md:text-[2.4rem]">{f.name}</p>
                      </div>
                      <span className="label tabular-nums">{f.kcal} kcal</span>
                    </div>
                    <div className="flav-note">
                      <div>
                        <p className="body mt-3 pl-8 text-[15px]">{f.note}</p>
                        <button type="button" className="btn btn-ghost mt-4 ml-8 !px-4 !py-2.5 !text-[0.68rem]" onClick={() => addToCart(f.name)}>
                          Add a can · {inr(40)}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ======================================================== POUR */}
        <section id="pour" data-beat="pour" className="relative h-[280svh]">
          <div className="sticky top-0 flex h-[100svh] flex-col justify-end px-5 pb-10 md:justify-center md:px-10 md:pb-0">
            <div className="md:max-w-[26rem]">
              <p className="eyebrow pour-in">03 · The serve</p>
              <h2 className="display h-lg pour-in mt-4">
                Over ice. <span className="text-[var(--color-red)]">Always.</span>
              </h2>
              <ol className="mt-7 grid gap-4 max-md:grid-cols-3 max-md:gap-3">
                {POUR_STEPS.map((s) => (
                  <li key={s.n} className="pour-in border-t border-[var(--line)] pt-3 md:flex md:gap-5">
                    <span className="label tabular-nums !text-[var(--color-red)]">{s.n}</span>
                    <div>
                      <p className="display text-[1.4rem] md:text-[1.7rem]">{s.title}</p>
                      <p className="mt-1 text-[12px] text-[var(--fg-mute)] md:text-[14px]">{s.note}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* ======================================================== FINALE */}
        <section id="finale" data-beat="finale" className="relative flex min-h-[170svh] flex-col justify-end">
          <div className="marquee-wrap" aria-label={SHOUTS.join(", ")}>
            <div className="marquee" aria-hidden="true">
              {[0, 1].map((k) => (
                <div key={k} className="flex shrink-0">
                  {[...SHOUTS, ...SHOUTS].map((s, i) => (
                    <span key={`${k}-${i}`} className="display flex items-center px-7 text-[2rem] uppercase md:text-[3rem]">
                      {s}
                      <span className="ml-14 inline-block h-3 w-3 rounded-full border-2 border-current" />
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div className="px-5 pt-[28svh] pb-8 max-md:bg-gradient-to-t max-md:from-[#0b0203] max-md:from-60% max-md:to-transparent md:px-10 md:pt-0">
            <div className="max-w-[44rem]">
              <p className="eyebrow" data-rise>
                Get it cold
              </p>
              <h2 className="display h-xl mt-4" data-rise>
                Grab a <span className="text-[var(--color-red)]">cold one.</span>
              </h2>
              <div className="mt-8 grid gap-3 sm:grid-cols-3" data-rise>
                {PACKS.map((pk, i) => (
                  <button key={pk.name} type="button" className={`pack ${i === 1 ? "hot" : ""}`} onClick={() => addToCart(pk.name)}>
                    {i === 1 && <span className="pack-flag">Most grabbed</span>}
                    <span className="label">{pk.size}</span>
                    <span className="display mt-2 block text-[1.7rem] leading-none">{pk.name}</span>
                    <span className="mt-4 flex items-center justify-between text-[14px]">
                      <span className="font-semibold">{inr(pk.price)}</span>
                      <span className="pack-add">Add +</span>
                    </span>
                  </button>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-[var(--fg-faint)]" data-rise>
                Free delivery over ₹500 · Delivered chilled in most metros
              </p>

              <form
                className="mt-12 max-w-[28rem]"
                onSubmit={(e) => {
                  e.preventDefault();
                  setJoined(true);
                }}
                data-rise
              >
                <p className="label !text-[var(--fg)]">Join the Fizz Club</p>
                <p className="body mt-2 text-[15px]">New flavours before anyone else, and a free can on your birthday.</p>
                {joined ? (
                  <p className="display mt-5 text-[1.6rem]">You&apos;re in. Stay cold.</p>
                ) : (
                  <label className="field mt-4">
                    <span className="sr-only">Email address</span>
                    <input type="email" required placeholder="you@email.com" autoComplete="email" />
                    <button type="submit" className="nav-link !opacity-100">
                      Join →
                    </button>
                  </label>
                )}
              </form>
            </div>

            <footer className="mt-[10vh] flex flex-col gap-4 border-t border-[var(--line)] pt-6 text-[12px] text-[var(--fg-faint)] md:flex-row md:items-center md:justify-between">
              <p className="wordmark !text-[1rem] text-[var(--fg)]">{BRAND}</p>
              <p>© 2026 {BRAND} · Concept site — not a real brand. Can, ice and fruit built in code.</p>
              <a href="#top" className="nav-link">
                Back to top ↑
              </a>
            </footer>
          </div>
        </section>
      </main>

      <div className={`toast rounded-full px-5 py-3 text-[13px] ${toast ? "show" : ""}`} role="status" aria-live="polite">
        {toast ? <>{toast} added to your cart</> : null}
      </div>
    </div>
  );
}
