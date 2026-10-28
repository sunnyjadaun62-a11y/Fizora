import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { clamp, damp, lerp, range, track } from "@/lib/anim";
import { BEATS, flavourF, stage } from "@/lib/stage";
import { FLAVOURS } from "@/lib/content";
import { MOUTH, labelTexture, makeCan } from "./can";
import { makeFruit, makeGlass, makeIce, makeStream } from "./props";
import { makeBackdrop, makeBubbles, makeSpray } from "./atmosphere";

const TAU = Math.PI * 2;

/*
 * Camera film — [p, pos x y z, look x y z, fov, shift]
 * shift pushes the subject right on wide screens (copy sits on the left).
 */
const CAM = [
  [0.0, 0, 0.2, 7.4, 0, 0.05, 0, 30, 1.0],
  [0.1, 0.6, 0.45, 6.6, 0, 0.1, 0, 30, 0.9],
  [0.2, -0.9, -0.35, 5.7, 0, 0.05, 0, 30, 0.8],
  [0.29, 0.3, 0.5, 6.2, 0, 0.2, 0, 30, 0.9],
  [0.345, 0.8, 3.0, 3.7, 0, 0.75, 0.05, 32, 0.3],
  [0.39, 0.6, 2.7, 3.4, 0, 0.95, 0.1, 34, 0.25],
  [0.445, 0.5, 1.9, 6.6, 0, 1.25, 0, 34, 0.45],
  [0.5, 0, 0.3, 7.0, 0, 0.05, 0, 30, 1.0],
  [0.71, 0.3, 0.25, 6.8, 0, 0.05, 0, 30, 1.0],
  [0.77, 0.2, 0.7, 7.8, -0.1, 0.1, 0, 30, 0.55],
  [0.86, 0.1, 0.5, 7.4, -0.1, 0.0, 0, 30, 0.55],
  [0.93, 0, 0.3, 8.4, 0, -0.05, 0, 28, 0.85],
  [1.0, 0, 0.25, 8.0, 0, -0.1, 0, 28, 0.85],
];

/* can pose — [p, x, y, tilt (world z), spin (about its own axis)] */
const CAN = [
  [0.0, 0, 0, 0.22, 0.35],
  [0.1, 0, 0.02, 0.18, 0.55],
  [0.29, 0, 0, 0.02, 0.55 + TAU],
  [0.32, 0, 0, 0, 0.3 + TAU],
  [0.45, 0, 0, 0, 0.3 + TAU],
  [0.5, 0, 0, 0.1, TAU],
  [0.71, 0, 0, 0.1, TAU],
  [0.88, 0.95, 0, 0, TAU],
  [1.0, 0.95, 0, 0.04, TAU + 0.25],
];
const POUR_TILT = 1.95;
const POUR_SPIN = TAU - Math.PI / 2 + 0.45;

function cssFont(v: string, fallback: string) {
  const f = getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  return f || fallback;
}

export async function createWorld(host: HTMLElement, onProgress: (f: number) => void) {
  const small = innerWidth < 768;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const params = new URLSearchParams(location.search);
  const pinned = params.get("p");

  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, small ? 1.25 : 1.6));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.8;
  renderer.setClearColor("#0b0203");
  host.appendChild(renderer.domElement);
  onProgress(0.1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 200);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envRT = pmrem.fromScene(room, 0.04);
  room.dispose();
  scene.environment = envRT.texture;
  scene.environmentIntensity = 0.6;
  onProgress(0.25);

  /* ---------------------------------------------------------------- fonts for the printed labels */
  const display = cssFont("--nf-display", "Impact, sans-serif");
  const sans = cssFont("--nf-sans", "system-ui, sans-serif");
  try {
    await Promise.race([
      Promise.all([document.fonts.load(`400 100px ${display}`), document.fonts.load(`600 30px ${sans}`)]),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {}
  onProgress(0.4);

  /* ---------------------------------------------------------------- set */
  const backdrop = makeBackdrop();
  scene.add(backdrop.mesh);

  const labels = FLAVOURS.map((f, i) => labelTexture(f, i, display, sans));
  labels.forEach((t) => renderer.initTexture(t));
  const can = makeCan(labels, small);
  scene.add(can.group);

  const ice = makeIce(small ? 6 : 9, false);
  ice.forEach((m) => scene.add(m));

  const glass = makeGlass();
  glass.group.visible = false;
  scene.add(glass.group);
  const stream = makeStream(glass.liquidMat);
  scene.add(stream);

  const fruit = makeFruit();
  fruit.sets.forEach((s) => scene.add(s.group));

  const bubbles = makeBubbles(small ? 220 : 520);
  scene.add(bubbles.points);
  const spray = makeSpray(small ? 500 : 1100);
  scene.add(spray.points);
  onProgress(0.6);

  /* ---------------------------------------------------------------- light */
  const key = new THREE.SpotLight("#fff1e6", 70, 0, 0.6, 1, 2);
  key.position.set(-3.6, 5.5, 5.5);
  key.target.position.set(0, 0, 0);
  scene.add(key, key.target);
  const rimL = new THREE.DirectionalLight("#ff2a3c", 4.2);
  rimL.position.set(-5, 1.5, -4);
  const rimR = new THREE.DirectionalLight("#ff4a3a", 3.4);
  rimR.position.set(5, 2.5, -3.5);
  const top = new THREE.DirectionalLight("#ffffff", 0.45);
  top.position.set(0.5, 6, 1.5);
  const fill = new THREE.HemisphereLight("#ffe7e0", "#2a0408", 0.35);
  const pop = new THREE.PointLight("#ffd9c4", 0, 4, 2);
  scene.add(rimL, rimR, top, fill, pop);

  /* ---------------------------------------------------------------- post */
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: small ? 0 : 4 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.5, 0.9);
  if (!small) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let aspect = 1;
  const resize = () => {
    const w = host.clientWidth || innerWidth;
    const h = host.clientHeight || innerHeight;
    aspect = w / h;
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    composer.setSize(w, h);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    const s = Math.min(renderer.getPixelRatio() * (h / 860), 2.2);
    bubbles.uniforms.uScale.value = s;
    spray.uniforms.uScale.value = s;
  };
  resize();
  addEventListener("resize", resize);

  /* ---------------------------------------------------------------- flavour colours */
  const glowC = FLAVOURS.map((f) => new THREE.Color(f.glow));
  const juiceC = FLAVOURS.map((f) => new THREE.Color(f.accent));
  const colaLiquid = new THREE.Color("#7a0818");
  const tmpC = new THREE.Color();
  const tmpC2 = new THREE.Color();
  const lerpFlavour = (arr: THREE.Color[], f: number, out: THREE.Color) => {
    const i = Math.min(arr.length - 2, Math.floor(f));
    return out.copy(arr[i]).lerp(arr[i + 1], clamp(f - i));
  };

  /* ---------------------------------------------------------------- frame */
  const cam = new Array(8).fill(0);
  const pose = new Array(4).fill(0);
  const camPos = new THREE.Vector3(0, 0.3, 9);
  const camLook = new THREE.Vector3(0, 0, 0);
  const tPos = new THREE.Vector3();
  const tLook = new THREE.Vector3();
  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const tmp = new THREE.Vector3();
  const mouth = new THREE.Vector3();
  const up = new THREE.Vector3();
  const surf = new THREE.Vector3();
  const UP = new THREE.Vector3(0, 1, 0);
  const DOWN = new THREE.Vector3(0, -1, 0);
  const euler = new THREE.Euler(0, 0, 0, "ZYX");
  let fov = 30;

  let curP = pinned ? Number(pinned) : stage.progress;
  let intro = pinned ? 1 : 0;
  let time = 0;
  let last = performance.now();
  let raf = 0;
  let shownA = -1;
  let shownB = -1;

  camera.position.copy(camPos);
  camera.lookAt(camLook);
  camera.updateMatrixWorld();

  const frame = () => {
    raf = requestAnimationFrame(frame);
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    time += dt;

    const target = pinned ? Number(pinned) : stage.progress;
    curP += (target - curP) * damp(reduce ? 20 : 4.2, dt);
    const p = curP;
    if (stage.ready || pinned) intro = Math.min(1, intro + dt / (reduce ? 0.3 : 2.2));
    // the can drops in with a little overshoot
    const introE = intro >= 1 ? 1 : 1 - Math.pow(1 - intro, 3) * Math.cos(intro * 4.2);

    /* ---------------- flavour: label wipe + colours */
    const ff = flavourF(p);
    const back = range(p, BEATS.flavours[1], BEATS.flavours[1] + 0.04); // back to the original for the pour
    let mapA: number;
    let mapB: number;
    let wipe: number;
    if (p >= BEATS.flavours[1]) {
      mapA = 2;
      mapB = 0;
      wipe = back;
    } else {
      mapA = Math.min(2, Math.floor(ff));
      mapB = Math.min(2, mapA + 1);
      wipe = ff - mapA;
    }
    if (mapA !== shownA) {
      can.body.map = labels[mapA];
      shownA = mapA;
    }
    if (mapB !== shownB) {
      can.wipe.uMapB.value = labels[mapB];
      shownB = mapB;
    }
    can.wipe.uWipe.value = wipe;
    can.wipe.uTime.value = time;
    const fCol = p >= BEATS.flavours[1] ? 2 - back * 2 : ff;
    lerpFlavour(glowC, fCol, tmpC);

    /* ---------------- mood */
    const crackGlow = range(p, 0.35, 0.38) * (1 - range(p, 0.43, 0.48));
    const finale = range(p, 0.9, 0.98);
    backdrop.uniforms.uGlow.value.copy(tmpC).multiplyScalar(introE * (0.5 + crackGlow * 0.3 + finale * 0.15));
    backdrop.uniforms.uHorizon.value.copy(tmpC).multiplyScalar(0.16);
    rimL.color.copy(tmpC).lerp(tmpC2.set("#ff2a3c"), 0.4);
    rimR.color.copy(rimL.color);
    key.intensity = 70 * clamp(introE);
    rimL.intensity = 4.2 * clamp(introE * 1.4 - 0.2);
    rimR.intensity = 3.4 * clamp(introE * 1.4 - 0.3);
    scene.environmentIntensity = 0.45 * clamp(introE);

    /* ---------------- can pose */
    track(CAN, p, pose);
    const pw = range(p, 0.73, 0.78) * (1 - range(p, 0.86, 0.9));
    const sway = reduce ? 0 : Math.sin(time * 0.5) * 0.06;
    const tilt = lerp(pose[2] + sway * 0.4, POUR_TILT, pw);
    const spinY = lerp(pose[3] + sway + stage.px * 0.25 * (1 - pw), POUR_SPIN, pw);

    // glass rises for the pour and stays for the finale
    const glassIn = range(p, 0.72, 0.775);
    glass.group.visible = glassIn > 0.001;
    const gx = lerp(-0.2, -0.1, range(p, 0.86, 0.92));
    const gy = lerp(-4.2, -1.05, glassIn);
    glass.group.position.set(gx, gy, 0.15);
    glass.group.rotation.y = time * 0.05;
    const level = range(p, 0.785, 0.865) * 0.82;

    // where the mouth ends up for this rotation (can at the origin)
    euler.set(0, spinY, tilt);
    mouth.copy(MOUTH).applyEuler(euler);
    const glassTop = gy + glass.floor + glass.depth;
    const bob = reduce ? 0 : Math.sin(time * 0.9) * 0.04;
    const drop = (1 - introE) * 4.6;
    can.group.position.set(
      lerp(pose[0], gx - mouth.x + 0.05, pw),
      lerp(pose[1] + bob, glassTop + 0.32 - mouth.y, pw) + drop,
      lerp(0, 0.15 - mouth.z, pw),
    );
    can.group.rotation.set(0, 0, tilt);
    can.spin.rotation.y = spinY;
    can.group.updateMatrixWorld();

    /* ---------------- the crack */
    can.tab.rotation.x = 1.1 * range(p, 0.33, 0.355) - 1.0 * range(p, 0.39, 0.43);
    const holeS = Math.max(0.001, range(p, 0.35, 0.362));
    can.hole.scale.setScalar(holeS * 1.02);
    mouth.copy(MOUTH).applyMatrix4(can.spin.matrixWorld);
    up.set(0, 1, 0).applyQuaternion(can.group.quaternion);
    const burst = range(p, 0.355, 0.372) * (1 - range(p, 0.44, 0.48)) + range(p, 0.93, 0.97) * 0.35 * (1 - pw);
    spray.uniforms.uBurst.value = reduce ? burst * 0.4 : burst;
    spray.uniforms.uOrigin.value.copy(mouth);
    spray.uniforms.uDir.value.copy(up);
    spray.uniforms.uTime.value = time;
    lerpFlavour(juiceC, fCol, spray.uniforms.uJuice.value);
    spray.points.visible = burst > 0.002;
    pop.position.copy(mouth).addScaledVector(up, 0.4);
    pop.intensity = 4 * range(p, 0.355, 0.365) * (1 - range(p, 0.37, 0.42));

    /* ---------------- pour */
    glass.liquid.scale.y = Math.max(level, 0.001) * glass.depth;
    glass.liquid.visible = level > 0.002;
    glass.liquidMat.color.copy(colaLiquid);
    glass.foam.position.y = glass.floor + level * glass.depth + 0.012;
    glass.foam.visible = level > 0.02;
    const foamW = 0.86 + level * 0.14;
    glass.foam.scale.set(foamW, 1, foamW);
    for (let i = 0; i < glass.ice.length; i++) {
      const m = glass.ice[i];
      m.position.y = Math.max(glass.floor + 0.13 + i * 0.16, glass.floor + level * glass.depth - 0.1 - i * 0.05) + (reduce ? 0 : Math.sin(time + i) * 0.01);
    }
    const flowing = pw > 0.95 && p > 0.78 && p < 0.862;
    stream.visible = flowing;
    if (flowing) {
      surf.set(gx, gy + glass.floor + level * glass.depth, 0.15);
      tmp.subVectors(surf, mouth);
      const len = tmp.length();
      stream.position.copy(mouth);
      stream.quaternion.setFromUnitVectors(DOWN, tmp.normalize());
      const wob = reduce ? 1 : 1 + Math.sin(time * 18) * 0.06;
      stream.scale.set(wob, len, wob);
    }

    /* ---------------- ice in the air */
    const iceIn = clamp(introE) * (1 - range(p, 0.24, 0.31)) + range(p, 0.88, 0.95);
    const drift = 1 + range(p, 0.1, 0.3) * 0.7;
    for (let i = 0; i < ice.length; i++) {
      const m = ice[i];
      const h = m.userData.home as THREE.Vector3;
      const sp = m.userData.spin as THREE.Vector3;
      const ph = m.userData.phase as number;
      m.visible = iceIn > 0.002;
      if (!m.visible) continue;
      const fall = (1 - clamp(introE)) * (5 + i * 0.4);
      m.position.set(h.x * drift, h.y + fall + (reduce ? 0 : Math.sin(time * 0.7 + ph) * 0.08), h.z * (p > 0.85 ? 1.15 : drift));
      if (p > 0.85) m.position.x += h.x > 0 ? 0.7 : 0.35;
      m.scale.setScalar(iceIn * (m.userData.size as number));
      if (!reduce) {
        m.rotation.x = time * sp.x * 0.4 + ph + p * 6 * sp.y;
        m.rotation.y = time * sp.y * 0.4 + ph;
        m.rotation.z = time * sp.z * 0.3 + p * 4 * sp.x;
      }
    }

    /* ---------------- fruit ring per flavour */
    const ringIn = range(p, 0.46, 0.5) * (1 - range(p, 0.69, 0.73));
    for (let f = 0; f < fruit.sets.length; f++) {
      const set = fruit.sets[f];
      const w = clamp(1 - Math.abs(ff - f) * 1.8) * ringIn;
      set.group.visible = w > 0.002;
      if (!set.group.visible) continue;
      for (const o of set.items) {
        const a = (o.userData.angle as number) + (reduce ? 0 : time * 0.18) + (1 - w) * 1.4;
        const rad = (o.userData.rad as number) * (1.4 - w * 0.4);
        const ph = o.userData.phase as number;
        const sp = o.userData.spin as THREE.Vector3;
        o.position.set(Math.sin(a) * rad, (o.userData.y as number) + Math.sin(time * 0.8 + ph) * 0.06 - (1 - w) * 0.8, Math.cos(a) * rad * 0.85);
        o.scale.setScalar(w * (o.userData.size as number));
        if (!reduce) {
          o.rotation.x = time * sp.x * 0.6 + ph;
          o.rotation.y = time * sp.y * 0.6 + ph;
          o.rotation.z = time * sp.z * 0.4;
        }
      }
    }

    /* ---------------- bubbles */
    bubbles.uniforms.uTime.value = reduce ? 0 : time;
    bubbles.uniforms.uRise.value = p * 14;
    bubbles.uniforms.uAmount.value = clamp(introE) * (0.45 + crackGlow * 0.6 + finale * 0.4);
    lerpFlavour(juiceC, fCol, tmpC2);
    bubbles.uniforms.uColor.value.set("#ffe2da").lerp(tmpC2, 0.35);

    /* ---------------- camera */
    track(CAM, p, cam);
    tPos.set(cam[0], cam[1], cam[2]);
    tLook.set(cam[3], cam[4], cam[5]);
    fov = cam[6];
    let shift = cam[7];

    fwd.subVectors(tLook, tPos).normalize();
    right.crossVectors(fwd, UP).normalize();
    if (aspect > 1.1) {
      shift *= clamp((aspect - 1.1) / 0.6) * 0.85;
      tLook.addScaledVector(right, -shift);
    } else {
      // portrait: copy sits low, lift the subject and widen the lens
      tLook.y -= 1.0 + 0.45 * (1 - range(p, 0.08, 0.14)); // hero copy is tall on phones
      tLook.x += 0.7 * pw; // keep the tilted can and the glass both in frame
      fov *= 1.0 + clamp((1.1 - aspect) / 0.55) * 0.6;
    }
    if (!reduce) {
      tPos.addScaledVector(right, stage.px * 0.18);
      tPos.y += -stage.py * 0.1;
      // the crack kicks the camera
      const kick = range(p, 0.352, 0.36) * (1 - range(p, 0.36, 0.385));
      tPos.x += Math.sin(time * 61) * 0.025 * kick;
      tPos.y += Math.cos(time * 53) * 0.025 * kick;
    }

    const k = damp(reduce ? 20 : 5, dt);
    camPos.lerp(tPos, k);
    camLook.lerp(tLook, k);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov += (fov - camera.fov) * k;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    key.target.position.lerp(can.group.position, 0.08);

    bloom.strength = 0.28 + crackGlow * 0.2 + finale * 0.1;
    composer.render();
  };

  // warm the GPU before the curtain lifts
  try {
    await renderer.compileAsync(scene, camera);
  } catch {}
  onProgress(1);
  frame();

  return {
    dispose() {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        const kill = (x: THREE.Material) => {
          for (const v of Object.values(x)) if (v instanceof THREE.Texture) v.dispose();
          x.dispose();
        };
        if (Array.isArray(mat)) mat.forEach(kill);
        else if (mat) kill(mat);
      });
      labels.forEach((t) => t.dispose());
      fruit.textures.forEach((t) => t.dispose());
      envRT.dispose();
      pmrem.dispose();
      rt.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
