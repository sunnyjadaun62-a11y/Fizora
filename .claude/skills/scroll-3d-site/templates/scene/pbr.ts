import * as THREE from "three";

/**
 * Poly Haven CC0 surface sets (fetched by scripts/fetch-textures.mjs).
 * `pbr()` returns textures immediately; pixels stream in via the shared
 * LoadingManager so the preloader counts them.
 */

let loader = new THREE.TextureLoader();
const cache = new Map<string, { tex: THREE.Texture; clones: THREE.Texture[]; ready: boolean }>();

export function initPbr(manager: THREE.LoadingManager) {
  loader = new THREE.TextureLoader(manager);
  cache.clear();
}

function base(id: string, map: "diff" | "nor" | "arm") {
  const key = `${id}_${map}`;
  let entry = cache.get(key);
  if (!entry) {
    const e = { tex: new THREE.Texture(), clones: [] as THREE.Texture[], ready: false };
    e.tex = loader.load(`/textures/${key}.webp`, () => {
      e.ready = true;
      // tiled copies share the image; flag them once pixels exist
      for (const c of e.clones) c.needsUpdate = true;
    });
    e.tex.wrapS = e.tex.wrapT = THREE.RepeatWrapping;
    e.tex.colorSpace = map === "diff" ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    e.tex.anisotropy = 8;
    cache.set(key, (entry = e));
  }
  return entry;
}

function rep(entry: ReturnType<typeof base>, x: number, y: number) {
  const c = entry.tex.clone();
  c.repeat.set(x, y);
  // clone() flags an upload; hold it until the image has loaded
  if (!entry.ready) c.version = 0;
  entry.clones.push(c);
  return c;
}

/** a MeshStandardMaterial dressed in a PBR set, tiled x × y times */
export function pbr(
  id: string,
  x = 1,
  y = x,
  extra: THREE.MeshStandardMaterialParameters = {},
) {
  const arm = rep(base(id, "arm"), x, y);
  return new THREE.MeshStandardMaterial({
    map: rep(base(id, "diff"), x, y),
    normalMap: rep(base(id, "nor"), x, y),
    roughnessMap: arm,
    aoMap: arm,
    aoMapIntensity: 0.8,
    roughness: 1,
    metalness: 0,
    ...extra,
  });
}
