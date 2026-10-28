// Downloads CC0 PBR textures from Poly Haven (1K) and converts them to WebP.
// Output: public/textures/<id>_{diff,nor,arm}.webp  (arm = AO/rough/metal packed)
// usage: npm run textures
import { mkdirSync, existsSync } from "node:fs";
import sharp from "sharp";

const IDS = [
  "asphalt_02",
  "brown_mud_dry",
  "aerial_grass_rock",
  "rough_concrete",
  "concrete_wall_008",
  "excavated_soil_wall",
  "gravel_floor_02",
];
const MAPS = { diff: "Diffuse", nor: "nor_gl", arm: "arm" };
const OUT = "public/textures";
mkdirSync(OUT, { recursive: true });

for (const id of IDS) {
  const files = await (await fetch(`https://api.polyhaven.com/files/${id}`)).json();
  for (const [short, key] of Object.entries(MAPS)) {
    const dest = `${OUT}/${id}_${short}.webp`;
    if (existsSync(dest)) continue;
    const url = files[key]?.["1k"]?.jpg?.url ?? files[key]?.["1k"]?.png?.url;
    if (!url) {
      console.warn(`! ${id}: no ${key} map`);
      continue;
    }
    const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
    // colour carries the visible detail; normal/roughness tile happily at half size
    const size = short === "diff" ? 1024 : 512;
    await sharp(buf).resize(size, size).webp({ quality: short === "nor" ? 85 : 80 }).toFile(dest);
    console.log(`✓ ${dest}`);
  }
}
