// Turns the raw machine models in _assets/models into web-ready GLBs.
//
// For each model: every mesh part is assigned to a named group by regex; each
// group becomes a node whose origin sits on its hinge (so three.js can rotate
// it), parts inside a group are merged per material (≈1 draw call per
// material per group), textures go to 1K WebP and geometry gets meshopt.
//
// usage: npm run models
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { dedup, join, meshopt, prune, textureCompress, weld } from "@gltf-transform/functions";
import { MeshoptEncoder } from "meshoptimizer";
import sharp from "sharp";
import { statSync } from "node:fs";

const SRC = "_assets/models";
const OUT = "public/models";

/**
 * groups: first regex match wins; unmatched parts go to "body".
 * pivot: hinge point in the source model's coordinates.
 * origin: subtracted from everything so the model's root sits where we want.
 */
const MODELS = [
  {
    src: "dump-truck.glb",
    out: "dump-truck.glb",
    origin: [0, 0, 0],
    groups: [
      ...[1, 2, 3].flatMap((a) =>
        ["left", "right"].map((s) => ({
          name: `wheel_${a}_${s}`,
          match: new RegExp(`^Axle ${a} ${s} wheel`),
          pivot: [a === 1 ? 3.1 : a === 2 ? -1.8 : -3.2, 0.52, s === "left" ? -1.06 : 1.06],
        })),
      ),
      { name: "ram", match: /^Dump telescopic lift ram/, pivot: [0.95, 1.14, 0] },
      {
        name: "hopper",
        match: /hopper|^Hopper|tailgate|^Closed tailgate|^Headboard|^Ram headboard/i,
        pivot: [-4.15, 1.29, 0],
      },
    ],
  },
  {
    src: "wheel-loader.glb",
    out: "wheel-loader.glb",
    origin: [0, 0, 0],
    groups: [
      ...[0, 1].flatMap((a) =>
        ["left", "right"].map((s) => ({
          name: `wheel_${a}_${s}`,
          match: new RegExp(`^Loader axle ${a} ${s} wheel`),
          pivot: [a === 0 ? 1.1 : -2.25, 0.77, s === "left" ? -1.15 : 1.15],
        })),
      ),
      ...[1, -1].map((s) => ({
        name: `liftram_${s === 1 ? "l" : "r"}`,
        match: new RegExp(`^Loader lift hydraulic cylinder ${s} `),
        pivot: [0.05, 1.08, s === 1 ? -0.78 : 0.78],
      })),
      { name: "bucket", parent: "arm", match: /^Front loader bucket|^Bucket rear attachment|^Central bucket tilt lug/, pivot: [2.7, 0.85, 0] },
      {
        name: "arm",
        match: /^Loader swept lift|^Loader arm transverse|^Loader bucket hinge|^Central bucket tilt/,
        pivot: [-0.1, 2.2, 0],
      },
    ],
  },
  {
    src: "compact-tracked-excavator.glb",
    out: "excavator.glb",
    origin: [0, 0, 0],
    groups: [
      { name: "bucket", parent: "dipper", match: /^Excavator bucket|^Bucket quick coupler|^Bucket curl transverse pin\.001/, pivot: [-1.61, 0.69, -0.29] },
      { name: "dipper", parent: "boom", match: /^Shaped excavator dipper|^Bucket curl|^Dipper actuator (bright|transverse pin\.001)|^Boom articulation pin\.002/, pivot: [-1.1, 2.15, -0.29] },
      { name: "boom", parent: "upper", match: /^Shaped excavator boom|^Boom (articulation|lift|high|pin)|^Dipper actuator/, pivot: [-0.36, 1.04, -0.29] },
      {
        name: "upper",
        match: /cab|^Cab|^Crowned|^Sculpted|^Engine|^Front or rear|^Transparent|^Operator|^Contoured|^High operator|^Padded|^Joystick|^Instrument|^Seat|^Retracted|^Rear excavator lamp|^Excavator (front wiper|mirror)|^Mirror|^Rounded excavator mirror|^Slew bearing bolt|^Woven/i,
        pivot: [0.1, 0.68, 0],
      },
    ],
  },
  {
    src: "tower-crane.glb",
    out: "tower-crane.glb",
    // put the mast centre at the origin
    origin: [-11, 0, 0],
    groups: [
      { name: "hook", parent: "trolley", match: /^Tower (hook|lower hook)/, pivot: [3.5, 16.36, 0] },
      { name: "rope", parent: "trolley", match: /^Tower hanging hoist/, pivot: [3.5, 24.47, 0] },
      { name: "trolley", parent: "slew", match: /^Trolley|travelling trolley|trolley return guide/, pivot: [3.5, 24.6, 0] },
      { name: "base", match: /^Tower (angled base|base|finite concrete)/, pivot: [-11, 0, 0] },
      { name: "mast", match: /^Mast|^Tower continuous mast/, pivot: [-11, 0, 0] },
      { name: "slew", match: /./, pivot: [-11, 24.21, 0] },
    ],
  },
];

const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.encoder": MeshoptEncoder });
await MeshoptEncoder.ready;

for (const cfg of MODELS) {
  const doc = await io.read(`${SRC}/${cfg.src}`);
  const root = doc.getRoot();
  const scene = root.listScenes()[0];
  const top = scene.listChildren()[0];

  // world pivot of each group (origin-relative)
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const groupNodes = { body: doc.createNode("body") };
  const pivotOf = { body: [0, 0, 0] };
  for (const g of cfg.groups) pivotOf[g.name] = sub(g.pivot, cfg.origin);
  for (const g of cfg.groups) groupNodes[g.name] = doc.createNode(g.name);
  // parenting + local offsets
  top.addChild(groupNodes.body);
  for (const g of cfg.groups) {
    const parent = g.parent ?? "body";
    const p = pivotOf[parent];
    groupNodes[g.name].setTranslation(sub(pivotOf[g.name], p));
    groupNodes[parent].addChild(groupNodes[g.name]);
  }

  // assign parts
  const counts = {};
  for (const n of [...top.listChildren()]) {
    if (!n.getMesh()) continue;
    const g = cfg.groups.find((x) => x.match.test(n.getName()))?.name ?? "body";
    counts[g] = (counts[g] ?? 0) + 1;
    const t = sub(n.getTranslation(), cfg.origin);
    // child local = world - group world pivot
    n.setTranslation(sub(t, pivotOf[g]));
    groupNodes[g].addChild(n);
  }
  top.setTranslation([0, 0, 0]);

  // glass: three's transmission costs a full extra render pass — drop it, the runtime fakes glass
  for (const m of root.listMaterials()) {
    const tr = m.getExtension("KHR_materials_transmission");
    if (tr) {
      m.setExtension("KHR_materials_transmission", null);
      m.setAlphaMode("BLEND");
      m.setBaseColorFactor([0.12, 0.16, 0.2, 0.35]);
      m.setRoughnessFactor(0.05);
      m.setMetallicFactor(0.6);
    }
  }

  await doc.transform(
    dedup(),
    join({ keepNamed: false }),
    weld(),
    prune({ keepLeaves: false }),
    textureCompress({ encoder: sharp, targetFormat: "webp", resize: [1024, 1024], quality: 82 }),
    meshopt({ encoder: MeshoptEncoder, level: "medium" }),
  );

  // join() names merged nodes generically; keep group nodes intact
  await io.write(`${OUT}/${cfg.out}`, doc);
  const kb = (f) => (statSync(f).size / 1024) | 0;
  const meshes = root.listMeshes().length;
  console.log(
    `${cfg.out}: ${kb(`${SRC}/${cfg.src}`)}KB → ${kb(`${OUT}/${cfg.out}`)}KB, ${meshes} meshes  parts:`,
    JSON.stringify(counts),
  );
}
