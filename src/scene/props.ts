import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { rng } from "@/lib/anim";

/**
 * Supporting cast: ice cubes, the serving glass and the fruit for each flavour.
 * All procedural.
 *
 * Glass note: transmissive materials can't see other transmissive materials,
 * so the liquid and ice *inside* the glass are opaque/translucent standard
 * materials — the floating cubes outside are the only real transmissive ice.
 */

export function makeIce(count: number, transmissive: boolean) {
  const geo = new RoundedBoxGeometry(0.42, 0.42, 0.42, 4, 0.07);
  const mat = transmissive
    ? new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        transmission: 1,
        thickness: 0.6,
        roughness: 0.24,
        ior: 1.31,
        clearcoat: 1,
        clearcoatRoughness: 0.05,
        envMapIntensity: 1.6,
        specularIntensity: 1,
      })
    : new THREE.MeshPhysicalMaterial({ color: "#f2f7ff", roughness: 0.12, transparent: true, opacity: 0.38, clearcoat: 1, envMapIntensity: 2.4, depthWrite: false });
  // a cloudy frozen core: reads as ice even against a red studio
  const coreMat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.6, transparent: true, opacity: 0.28, depthWrite: false });
  const coreGeo = new RoundedBoxGeometry(0.26, 0.26, 0.26, 2, 0.08);
  const r = rng(5);
  const cubes: THREE.Mesh[] = [];
  for (let i = 0; i < count; i++) {
    const m = new THREE.Mesh(geo, mat);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.rotation.set(0.4, 0.7, 0.2);
    core.renderOrder = 1;
    m.renderOrder = 2;
    m.add(core);
    const a = (i / count) * Math.PI * 2 + r() * 0.5;
    const rad = 1.25 + r() * 1.1;
    m.userData.home = new THREE.Vector3(Math.cos(a) * rad, (r() - 0.5) * 2.4, Math.sin(a) * rad * 0.8 - 0.2);
    m.userData.spin = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5);
    m.userData.phase = r() * 10;
    m.userData.size = 0.7 + r() * 0.55;
    cubes.push(m);
  }
  return cubes;
}

export interface Glass {
  group: THREE.Group;
  liquid: THREE.Mesh;
  liquidMat: THREE.MeshPhysicalMaterial;
  foam: THREE.Mesh;
  ice: THREE.Mesh[];
  /** inner floor of the glass, local y */
  floor: number;
  /** usable inner height */
  depth: number;
}

export function makeGlass(): Glass {
  const group = new THREE.Group();
  const pts: [number, number][] = [
    [0, 0],
    [0.36, 0],
    [0.375, 0.02],
    [0.43, 1.2],
    [0.405, 1.21],
    [0.345, 0.11],
    [0, 0.11],
  ];
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: "#ffffff",
    transmission: 1,
    thickness: 0.18,
    roughness: 0.03,
    ior: 1.5,
    clearcoat: 1,
    clearcoatRoughness: 0.03,
    envMapIntensity: 1.4,
    side: THREE.DoubleSide,
  });
  group.add(
    new THREE.Mesh(
      new THREE.LatheGeometry(
        pts.map(([x, y]) => new THREE.Vector2(x, y)),
        80,
      ),
      glassMat,
    ),
  );

  const floor = 0.115;
  const depth = 1.0;
  const liquidMat = new THREE.MeshPhysicalMaterial({
    color: "#b30d22",
    emissive: new THREE.Color("#4a0209"),
    emissiveIntensity: 0.8,
    roughness: 0.12,
    clearcoat: 1,
    envMapIntensity: 0.8,
  });
  const lg = new THREE.CylinderGeometry(0.392, 0.338, 1, 64);
  lg.translate(0, 0.5, 0);
  const liquid = new THREE.Mesh(lg, liquidMat);
  liquid.position.y = floor;
  group.add(liquid);

  const foam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.39, 0.39, 0.035, 48),
    new THREE.MeshStandardMaterial({ color: "#e8c7b8", roughness: 0.95 }),
  );
  group.add(foam);

  const iceGeo = new RoundedBoxGeometry(0.24, 0.24, 0.24, 3, 0.04);
  const iceMat = new THREE.MeshPhysicalMaterial({ color: "#f6fbff", roughness: 0.08, transparent: true, opacity: 0.5, clearcoat: 1, envMapIntensity: 2.2 });
  const ice = [
    [-0.12, 0.05, 0.4],
    [0.13, -0.08, 1.1],
    [0.02, 0.14, 2.3],
  ].map(([x, z, ry]) => {
    const m = new THREE.Mesh(iceGeo, iceMat);
    m.position.set(x, 0, z);
    m.rotation.set(0.3, ry, 0.2);
    group.add(m);
    return m;
  });

  return { group, liquid, liquidMat, foam, ice, floor, depth };
}

/** pour stream: an open tube with its pivot at the top, scaled along -y */
export function makeStream(mat: THREE.Material) {
  const g = new THREE.CylinderGeometry(0.03, 0.045, 1, 14, 6, true);
  g.translate(0, -0.5, 0);
  const m = new THREE.Mesh(g, mat);
  m.visible = false;
  return m;
}

/* ------------------------------------------------------------------ fruit */

function cherryPair(mat: THREE.Material, stemMat: THREE.Material) {
  const g = new THREE.Group();
  const sphere = new THREE.SphereGeometry(0.12, 32, 24);
  // dimple at the stem
  const p = sphere.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0.09) p.setY(i, y - (y - 0.09) * 1.6);
  }
  sphere.computeVertexNormals();
  const tips: THREE.Vector3[] = [];
  for (const s of [-1, 1]) {
    const c = new THREE.Mesh(sphere, mat);
    c.position.set(s * 0.1, -s * 0.03, 0);
    c.scale.set(1, 0.92, 1);
    g.add(c);
    tips.push(new THREE.Vector3(s * 0.1, 0.07 - s * 0.03, 0));
  }
  const top = new THREE.Vector3(0.03, 0.42, -0.02);
  for (const t of tips) {
    const mid = new THREE.Vector3((t.x + top.x) / 2 + t.x * 0.6, (t.y + top.y) / 2, 0);
    const curve = new THREE.QuadraticBezierCurve3(t, mid, top);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.009, 6), stemMat));
  }
  return g;
}

function sliceTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  g.fillStyle = "#ff8a2a";
  g.fillRect(0, 0, 512, 512);
  g.translate(256, 256);
  g.fillStyle = "#fff0d8";
  g.beginPath();
  g.arc(0, 0, 240, 0, Math.PI * 2);
  g.fill();
  const segs = 10;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2 + 0.05;
    const a1 = ((i + 1) / segs) * Math.PI * 2 - 0.05;
    const grd = g.createRadialGradient(0, 0, 20, 0, 0, 225);
    grd.addColorStop(0, "#c7241a");
    grd.addColorStop(0.6, "#e0401e");
    grd.addColorStop(1, "#f06a24");
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(Math.cos((a0 + a1) / 2) * 22, Math.sin((a0 + a1) / 2) * 22);
    g.arc(0, 0, 222, a0, a1);
    g.closePath();
    g.fill();
  }
  // juice cells
  const r = rng(9);
  g.fillStyle = "rgba(255,210,170,0.25)";
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2;
    const d = 30 + r() * 190;
    g.beginPath();
    g.ellipse(Math.cos(a) * d, Math.sin(a) * d, 3 + r() * 4, 1.5 + r() * 2, a, 0, Math.PI * 2);
    g.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function raspberryGeometry() {
  const r = rng(13);
  const parts: THREE.BufferGeometry[] = [];
  const bead = new THREE.SphereGeometry(0.034, 10, 8);
  // drupelets on a rounded cone
  for (let ring = 0; ring < 7; ring++) {
    const v = ring / 6;
    const y = -0.11 + v * 0.22;
    const rad = 0.075 + Math.sin(v * Math.PI * 0.85 + 0.2) * 0.045;
    const n = Math.round(6 + rad * 70);
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + ring * 0.4 + r() * 0.1;
      const b = bead.clone();
      const s = 0.9 + r() * 0.25;
      b.scale(s, s, s);
      b.translate(Math.cos(a) * rad, y, Math.sin(a) * rad);
      parts.push(b);
    }
  }
  const top = bead.clone();
  top.scale(1.2, 1, 1.2);
  top.translate(0, 0.125, 0);
  parts.push(top);
  const merged = mergeGeometries(parts)!;
  parts.forEach((p) => p.dispose());
  bead.dispose();
  return merged;
}

export interface FruitSet {
  group: THREE.Group;
  items: THREE.Object3D[];
}

/** six pieces per flavour, each with a home on a loose ring around the can */
export function makeFruit() {
  const r = rng(17);
  const cherryMat = new THREE.MeshPhysicalMaterial({ color: "#7a0614", roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05, sheen: 0.3, sheenColor: new THREE.Color("#ff5a6a") });
  const stemMat = new THREE.MeshStandardMaterial({ color: "#5b6a2a", roughness: 0.7 });
  const slice = sliceTexture();
  const rind = new THREE.MeshStandardMaterial({ color: "#f07a1e", roughness: 0.55 });
  const flesh = new THREE.MeshPhysicalMaterial({ map: slice, roughness: 0.3, clearcoat: 0.6, emissive: new THREE.Color("#5a1404"), emissiveIntensity: 0.25 });
  const sliceGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.05, 48);
  const rasp = raspberryGeometry();
  const raspMat = new THREE.MeshPhysicalMaterial({ color: "#b80a35", roughness: 0.35, clearcoat: 0.8, sheen: 1, sheenColor: new THREE.Color("#ff8aa8"), emissive: new THREE.Color("#3a0010"), emissiveIntensity: 0.3 });

  const build = [
    () => cherryPair(cherryMat, stemMat),
    () => new THREE.Mesh(sliceGeo, [rind, flesh, flesh]),
    () => new THREE.Mesh(rasp, raspMat),
  ];
  const sets: FruitSet[] = build.map((make, f) => {
    const group = new THREE.Group();
    const items: THREE.Object3D[] = [];
    for (let i = 0; i < 6; i++) {
      const o = make();
      const a = (i / 6) * Math.PI * 2 + f * 0.5;
      o.userData.angle = a;
      o.userData.y = (i % 3) * 0.75 - 0.75 + (r() - 0.5) * 0.3;
      o.userData.rad = 1.25 + r() * 0.35;
      o.userData.spin = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5);
      o.userData.phase = r() * 10;
      o.userData.size = f === 1 ? 1 + r() * 0.3 : 1.2 + r() * 0.5;
      group.add(o);
      items.push(o);
    }
    return { group, items };
  });
  return { sets, textures: [slice] };
}
