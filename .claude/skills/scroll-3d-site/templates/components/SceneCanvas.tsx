"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

/**
 * Hosts the WebGL world; reports real asset-loading progress to the loader.
 * If WebGL is unavailable, falls back to the photographic hero.
 */
export default function SceneCanvas({ onProgress }: { onProgress: (f: number) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const cb = useRef(onProgress);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    cb.current = onProgress;
  }, [onProgress]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let dispose: (() => void) | null = null;
    import("@/scene/World")
      .then(({ createWorld }) => createWorld(host, (f) => cb.current(f)))
      .then((h) => {
        if (disposed) h.dispose();
        else dispose = h.dispose;
      })
      .catch((err) => {
        console.error("[site] 3D world unavailable, using photo fallback", err);
        if (!disposed) setFailed(true);
        cb.current(1);
      });
    return () => {
      disposed = true;
      dispose?.();
    };
  }, []);

  return (
    <div ref={hostRef} aria-hidden="true" className="world">
      {failed && (
        <Image src="/images/hero-site-dawn.jpg" alt="" fill priority sizes="100vw" className="object-cover" />
      )}
    </div>
  );
}
