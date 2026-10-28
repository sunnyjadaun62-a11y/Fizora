// Writes soft gradient placeholders for photos that haven't been supplied yet.
// Never overwrites a real photo already in public/images.
import sharp from "sharp";
import { existsSync } from "node:fs";

const OUT = "public/images";
const SHOTS = [
  ["ritual-01-cleanse.webp", "#ead3c7", "#b98476"],
  ["ritual-02-serum.webp", "#f0c27d", "#6b3416"],
  ["ritual-03-cream.webp", "#f3e2da", "#c39a90"],
];
for (const [name, a, b] of SHOTS) {
  const path = `${OUT}/${name}`;
  if (existsSync(path)) continue;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200">
    <defs><radialGradient id="g" cx="45%" cy="38%" r="80%"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></radialGradient></defs>
    <rect width="100%" height="100%" fill="url(#g)"/></svg>`;
  await sharp(Buffer.from(svg)).webp({ quality: 80 }).toFile(path);
  console.log("placeholder", path);
}
