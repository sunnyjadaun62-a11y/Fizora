import * as THREE from "three";
import { rng } from "@/lib/anim";

/** Studio sweep: a dark gradient dome with a soft coloured glow behind the subject. */
export function makeBackdrop() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color("#0b0203") },
      uHorizon: { value: new THREE.Color("#2a0609") },
      uGlow: { value: new THREE.Color("#b40f22") },
      uGlowDir: { value: new THREE.Vector3(0, 0.08, -1).normalize() },
      uGlowSize: { value: 0.4 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTop, uHorizon, uGlow, uGlowDir;
      uniform float uGlowSize;
      varying vec3 vDir;
      void main() {
        float h = clamp(abs(vDir.y) * 2.0, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(h, 0.55));
        float g = max(dot(vDir, normalize(uGlowDir)), 0.0);
        col += uGlow * pow(g, 1.0 / max(uGlowSize, 0.01) * 2.0) * 0.85;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(80, 48, 24), mat);
  mesh.renderOrder = -1;
  return { mesh, uniforms: mat.uniforms };
}

/** Carbonation in the air: ring-shaped bubbles rising through the studio. */
export function makeBubbles(count: number) {
  const r = rng(7);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (r() - 0.5) * 14;
    pos[i * 3 + 1] = r() * 8;
    pos[i * 3 + 2] = (r() - 0.5) * 9 - 1.5;
    seed[i] = r();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uAmount: { value: 0.6 },
      uSpeed: { value: 1 },
      uRise: { value: 0 },
      uScale: { value: 1 },
      uColor: { value: new THREE.Color("#ffd6cc") },
    },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime, uScale, uRise;
      varying float vA;
      varying float vSeed;
      void main() {
        vec3 p = position;
        // uRise is scroll-driven so bubbles also stream with the film
        p.y = mod(p.y + uTime * (0.18 + seed * 0.4) + uRise * (1.0 + seed), 8.0) - 3.2;
        p.x += sin(uTime * 1.3 + seed * 40.0) * 0.06 * (0.5 + seed);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = smoothstep(-3.2, -2.2, p.y) * (1.0 - smoothstep(3.6, 4.8, p.y));
        vSeed = seed;
        gl_PointSize = (3.0 + pow(seed, 3.0) * 16.0) * uScale * (10.0 / -mv.z);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uAmount;
      varying float vA;
      varying float vSeed;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float rim = smoothstep(0.5, 0.42, d) * smoothstep(0.26, 0.42, d);
        float hl = smoothstep(0.12, 0.0, length(q - vec2(-0.16, -0.16)));
        float a = (rim * 0.75 + hl) * vA * uAmount;
        if (a < 0.003) discard;
        gl_FragColor = vec4(uColor * a, 1.0);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms: mat.uniforms };
}

/**
 * The crack: a fountain of fizz from the can's mouth. Each particle loops on
 * its own lifetime; `uBurst` (scroll-driven) gates the whole thing so
 * scrolling back calms it down.
 */
export function makeSpray(count: number) {
  const r = rng(29);
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    seed[i * 4] = r() * Math.PI * 2; // azimuth
    seed[i * 4 + 1] = r(); // spread
    seed[i * 4 + 2] = r(); // lifetime offset
    seed[i * 4 + 3] = r(); // size / colour
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 4));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uBurst: { value: 0 },
      uOrigin: { value: new THREE.Vector3() },
      uDir: { value: new THREE.Vector3(0, 1, 0) },
      uScale: { value: 1 },
      uFoam: { value: new THREE.Color("#fff0e6") },
      uJuice: { value: new THREE.Color("#ff2a3c") },
    },
    vertexShader: /* glsl */ `
      attribute vec4 seed;
      uniform float uTime, uBurst, uScale;
      uniform vec3 uOrigin, uDir;
      varying float vA;
      varying float vMix;
      void main() {
        float life = 1.15;
        float t = fract(uTime * 0.85 + seed.z) * life;
        vec3 side = normalize(cross(uDir, vec3(0.0, 0.0, 1.0)) + vec3(0.0001));
        vec3 side2 = normalize(cross(uDir, side));
        vec3 lateral = (side * cos(seed.x) + side2 * sin(seed.x)) * (0.15 + seed.y * 1.1);
        vec3 vel = uDir * (2.4 + (1.0 - seed.y) * 2.2) * (0.6 + uBurst * 0.4) + lateral;
        vec3 p = uOrigin + vel * t + vec3(0.0, -4.2, 0.0) * t * t * 0.5;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        vA = uBurst * smoothstep(0.0, 0.06, t) * (1.0 - t / life);
        vMix = seed.w;
        gl_PointSize = (1.5 + seed.w * seed.w * 6.0) * uScale * (10.0 / -mv.z) * (1.0 + t * 0.8);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uFoam, uJuice;
      varying float vA;
      varying float vMix;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float a = smoothstep(0.5, 0.1, d) * vA;
        if (a < 0.003) discard;
        vec3 c = mix(uFoam, uJuice, step(0.55, vMix));
        gl_FragColor = vec4(c * a, 1.0);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, uniforms: mat.uniforms };
}
