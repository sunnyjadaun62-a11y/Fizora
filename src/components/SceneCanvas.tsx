"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Hosts the WebGL world; reports real asset-loading progress to the loader.
 * If WebGL is unavailable, falls back to a flat poster glow.
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
        console.error("[fizzora] 3D world unavailable, using poster fallback", err);
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
      {failed && <div className="world-fallback" />}
    </div>
  );
}
