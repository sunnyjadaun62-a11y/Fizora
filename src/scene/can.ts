import * as THREE from "three";
import { rng } from "@/lib/anim";

/**
 * The can — fully procedural. Aluminium neck and base are lathe profiles, the
 * printed body is an open cylinder whose material blends two flavour labels
 * with a rising, wavy "fill line" (the flavour swap).
 *
 * Local space: origin at the can's centre, +y up, label front faces +z.
 */

export const CAN_R = 0.5;
const BODY_Y0 = -0.78;
const BODY_Y1 = 0.72;
export const LID_Y = 0.905;
/** centre of the drinking opening, local space */
export const MOUTH = new THREE.Vector3(0, LID_Y, 0.2);

const v = (x: number, y: number) => new THREE.Vector2(x, y);
const lathe = (pts: [number, number][], seg: number) =>
  new THREE.LatheGeometry(
    pts.map(([x, y]) => v(x, y)),
    seg,
  );

export interface FlavourPrint {
  name: string;
  tag: string;
  kcal: number;
  body: string;
  deep: string;
  ink: string;
  accent: string;
}

/** one 360° wrap label, 2048 × 1024; u = 0.5 is the front */
export function labelTexture(f: FlavourPrint, index: number, display: string, sans: string) {
  const W = 2048;
  const H = 1024;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const track = (px: number) => {
    if ("letterSpacing" in g) (g as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${px}px`;
  };

  // body: top-lit gradient
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, f.body);
  bg.addColorStop(0.7, f.body);
  bg.addColorStop(1, f.deep);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);

  // bubble print, denser toward the bottom band
  const r = rng(11 + index * 7);
  g.strokeStyle = f.ink;
  for (let i = 0; i < 150; i++) {
    const y = H * (0.15 + Math.pow(r(), 0.6) * 0.75);
    const x = r() * W;
    const rad = 4 + r() * 22 * (y / H);
    g.globalAlpha = 0.08 + r() * 0.14;
    g.lineWidth = 2 + rad * 0.12;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.stroke();
  }
  g.globalAlpha = 1;

  // wave band at the bottom
  const wave = (y0: number, amp: number, ph: number) => {
    g.beginPath();
    g.moveTo(0, H);
    for (let x = 0; x <= W; x += 16) g.lineTo(x, y0 + Math.sin((x / W) * Math.PI * 6 + ph) * amp);
    g.lineTo(W, H);
    g.closePath();
  };
  g.fillStyle = f.deep;
  wave(H * 0.8, 18, 0.4);
  g.fill();
  g.strokeStyle = f.ink;
  g.lineWidth = 6;
  g.beginPath();
  for (let x = 0; x <= W; x += 16) {
    const y = H * 0.765 + Math.sin((x / W) * Math.PI * 6 + 1.2) * 18;
    if (x === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();

  // thin rules top + bottom
  g.fillStyle = f.ink;
  g.fillRect(0, 34, W, 5);
  g.fillRect(0, H - 40, W, 5);

  // front: the wordmark runs up the can
  const cx = W / 2;
  g.save();
  g.translate(cx - 30, H * 0.47);
  g.rotate(-Math.PI / 2);
  g.textAlign = "center";
  g.textBaseline = "middle";
  let size = 330;
  g.font = `400 ${size}px ${display}`;
  track(4);
  const wm = "FIZZORA";
  const fit = 840;
  const m = g.measureText(wm).width;
  if (m > fit) {
    size = Math.floor((size * fit) / m);
    g.font = `400 ${size}px ${display}`;
  }
  g.fillStyle = f.ink;
  g.fillText(wm, 0, 0);
  g.restore();

  // flavour name, right of the wordmark, reading up
  g.save();
  g.translate(cx + 190, H * 0.47);
  g.rotate(-Math.PI / 2);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = f.accent;
  g.font = `400 86px ${display}`;
  track(3);
  g.fillText(f.name.toUpperCase(), 0, 0);
  g.font = `600 26px ${sans}`;
  track(10);
  g.globalAlpha = 0.85;
  g.fillText(f.tag.toUpperCase(), 0, 66);
  g.restore();

  // left of the wordmark: size + number
  g.save();
  g.translate(cx - 250, H * 0.47);
  g.rotate(-Math.PI / 2);
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillStyle = f.ink;
  g.font = `600 26px ${sans}`;
  track(12);
  g.globalAlpha = 0.8;
  g.fillText(`NO. 0${index + 1}  ·  330 ML  ·  SPARKLING`, 0, 0);
  g.restore();
  g.globalAlpha = 1;

  // back: two info panels, either side of the seam
  const panel = (x: number) => {
    g.textAlign = "left";
    g.textBaseline = "alphabetic";
    g.fillStyle = f.ink;
    g.font = `400 64px ${display}`;
    track(2);
    g.fillText(`${f.kcal} KCAL`, x, 250);
    g.font = `600 22px ${sans}`;
    track(6);
    g.globalAlpha = 0.8;
    const lines = ["CARBONATED WATER, CANE SUGAR,", "FRUIT JUICE 6%, NATURAL FLAVOURS,", "CITRIC ACID. NO PRESERVATIVES.", "", "BEST SERVED AT 4°C", "SHAKE NOTHING. CRACK EVERYTHING."];
    lines.forEach((l, i) => g.fillText(l, x, 310 + i * 36));
    g.globalAlpha = 1;
  };
  panel(140);
  panel(1480);

  // barcode
  const bx = 160;
  const by = 560;
  g.fillStyle = f.ink;
  g.fillRect(bx - 16, by - 16, 300, 150);
  g.fillStyle = f.deep;
  for (let x = 0, i = 0; x < 268; i++) {
    const w = 2 + Math.floor(r() * 3) * 2;
    if (i % 2 === 0) g.fillRect(bx + x, by, w, 118);
    x += w + 2;
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

/** silver lid + tab cut */
function tabShape() {
  const s = new THREE.Shape();
  const w = 0.085;
  const back = -0.21;
  const front = 0.075;
  s.moveTo(-w, front - 0.03);
  s.quadraticCurveTo(-w, front, -w + 0.03, front);
  s.lineTo(w - 0.03, front);
  s.quadraticCurveTo(w, front, w, front - 0.03);
  s.lineTo(w * 1.05, back + 0.06);
  s.quadraticCurveTo(w, back, 0, back);
  s.quadraticCurveTo(-w, back, -w * 1.05, back + 0.06);
  s.closePath();
  const hole = new THREE.Path();
  hole.absellipse(0, -0.12, 0.05, 0.055, 0, Math.PI * 2, false, 0);
  s.holes.push(hole);
  return s;
}

function openingShape() {
  // the classic rounded teardrop the scored panel leaves behind
  const s = new THREE.Shape();
  s.moveTo(0, -0.09);
  s.bezierCurveTo(0.11, -0.09, 0.15, 0.03, 0.12, 0.09);
  s.bezierCurveTo(0.08, 0.14, -0.08, 0.14, -0.12, 0.09);
  s.bezierCurveTo(-0.15, 0.03, -0.11, -0.09, 0, -0.09);
  return s;
}

export interface Can {
  group: THREE.Group;
  /** spins about the can's own axis (droplets + label ride along) */
  spin: THREE.Group;
  tab: THREE.Group;
  hole: THREE.Mesh;
  droplets: THREE.InstancedMesh;
  body: THREE.MeshPhysicalMaterial;
  /** flavour wipe: set map (from) + uniforms.uMapB (to) + uniforms.uWipe (0..1) */
  wipe: { uMapB: { value: THREE.Texture | null }; uWipe: { value: number }; uTime: { value: number } };
}

export function makeCan(labels: THREE.Texture[], small: boolean): Can {
  const group = new THREE.Group();
  group.rotation.order = "ZYX"; // spin about the can axis first, then tilt in the world
  const spin = new THREE.Group();
  group.add(spin);

  const alu = new THREE.MeshPhysicalMaterial({
    color: "#d9d6d3",
    metalness: 1,
    roughness: 0.3,
    clearcoat: 0.4,
    envMapIntensity: 0.7,
    side: THREE.DoubleSide,
  });

  const wipe = { uMapB: { value: labels[1] ?? labels[0] }, uWipe: { value: 0 }, uTime: { value: 0 } };
  const body = new THREE.MeshPhysicalMaterial({
    map: labels[0],
    metalness: 0.28,
    roughness: 0.34,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.7,
  });
  body.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, wipe);
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform sampler2D uMapB;\nuniform float uWipe;\nuniform float uTime;")
      .replace(
        "#include <map_fragment>",
        /* glsl */ `
        #ifdef USE_MAP
          vec4 ca = texture2D(map, vMapUv);
          vec4 cb = texture2D(uMapB, vMapUv);
          float edge = uWipe * 1.16 - 0.08
            + sin(vMapUv.x * 37.7 + uTime * 3.0) * 0.014
            + sin(vMapUv.x * 94.2 - uTime * 2.1) * 0.006;
          float m = 1.0 - smoothstep(edge - 0.006, edge + 0.006, vMapUv.y);
          vec4 col = mix(ca, cb, m);
          float live = step(0.001, uWipe) * step(uWipe, 0.999);
          col.rgb += (1.0 - smoothstep(0.0, 0.014, abs(vMapUv.y - edge))) * live * 0.7;
          diffuseColor *= col;
        #endif`,
      );
  };
  body.customProgramCacheKey = () => "fizzora-can-wipe";

  const H = BODY_Y1 - BODY_Y0;
  // thetaStart = π puts u = 0.5 (the label's front) at +z
  const bodyGeo = new THREE.CylinderGeometry(CAN_R, CAN_R, H, 128, 1, true, Math.PI, Math.PI * 2);
  bodyGeo.translate(0, (BODY_Y0 + BODY_Y1) / 2, 0);
  spin.add(new THREE.Mesh(bodyGeo, body));

  const neck = new THREE.Mesh(
    lathe(
      [
        [CAN_R, BODY_Y1],
        [0.485, 0.8],
        [0.445, 0.865],
        [0.412, 0.9],
        [0.408, 0.93],
        [0.418, 0.952],
        [0.4, 0.968],
        [0.38, 0.955],
        [0.372, 0.92],
        [0.36, LID_Y],
      ],
      96,
    ),
    alu,
  );
  spin.add(neck);
  // the lid is brushed and flat-on to the key light: keep it duller than the walls
  const lidMat = new THREE.MeshPhysicalMaterial({ color: "#9c9895", metalness: 1, roughness: 0.42, envMapIntensity: 0.55 });
  const lid = new THREE.Mesh(new THREE.CircleGeometry(0.362, 64), lidMat);
  lid.rotation.x = -Math.PI / 2;
  lid.position.y = LID_Y;
  spin.add(lid);
  const base = new THREE.Mesh(
    lathe(
      [
        [0, -0.86],
        [0.2, -0.875],
        [0.32, -0.925],
        [0.38, -0.948],
        [0.43, -0.935],
        [0.48, -0.875],
        [CAN_R, BODY_Y0],
      ],
      96,
    ),
    alu,
  );
  spin.add(base);

  // scored panel outline + the dark opening that appears when it pushes in
  const scoreMat = new THREE.MeshPhysicalMaterial({ color: "#7d7976", metalness: 1, roughness: 0.5, envMapIntensity: 0.5 });
  const score = new THREE.Mesh(new THREE.ShapeGeometry(openingShape(), 24), scoreMat);
  score.rotation.x = -Math.PI / 2;
  score.position.set(MOUTH.x, LID_Y + 0.002, MOUTH.z);
  score.scale.setScalar(1.06);
  spin.add(score);
  const hole = new THREE.Mesh(new THREE.ShapeGeometry(openingShape(), 24), new THREE.MeshBasicMaterial({ color: "#070304" }));
  hole.rotation.x = -Math.PI / 2;
  hole.position.set(MOUTH.x, LID_Y + 0.004, MOUTH.z);
  hole.scale.setScalar(0.001);
  spin.add(hole);

  // tab: hinged on the rivet, lies flat pointing to the back
  const tab = new THREE.Group();
  tab.position.set(0, LID_Y + 0.02, 0.05);
  const tabGeo = new THREE.ExtrudeGeometry(tabShape(), { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.006, bevelSegments: 2, curveSegments: 16 });
  tabGeo.rotateX(Math.PI / 2);
  const tabMat = new THREE.MeshPhysicalMaterial({ color: "#d4cfca", metalness: 1, roughness: 0.25, envMapIntensity: 0.9 });
  const tabMesh = new THREE.Mesh(tabGeo, tabMat);
  tab.add(tabMesh);
  const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), tabMat);
  rivet.position.y = -0.004;
  tab.add(rivet);
  spin.add(tab);

  // condensation: flattened beads on the body, sparse at the top
  const r = rng(3);
  const count = small ? 140 : 300;
  const droplets = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 12, 8),
    new THREE.MeshPhysicalMaterial({
      color: "#ffffff",
      roughness: 0.02,
      metalness: 0,
      transparent: true,
      opacity: 0.3,
      clearcoat: 1,
      envMapIntensity: 2.6,
      depthWrite: false,
    }),
    count,
  );
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const pos = new THREE.Vector3();
  const sc = new THREE.Vector3();
  const n = new THREE.Vector3();
  const Z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < count; i++) {
    const a = r() * Math.PI * 2;
    const y = BODY_Y0 + 0.04 + Math.pow(r(), 0.75) * (H - 0.08);
    const s = 0.006 + Math.pow(r(), 3) * 0.019;
    n.set(Math.sin(a), 0, Math.cos(a));
    pos.copy(n).multiplyScalar(CAN_R + s * 0.2).setY(BODY_Y1 - (y - BODY_Y0));
    q.setFromUnitVectors(Z, n);
    sc.set(s, s * (1.15 + r() * 0.5), s * 0.45);
    m4.compose(pos, q, sc);
    droplets.setMatrixAt(i, m4);
  }
  droplets.renderOrder = 3;
  spin.add(droplets);

  return { group, spin, tab, hole, droplets, body, wipe };
}
