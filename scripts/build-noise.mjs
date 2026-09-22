#!/usr/bin/env node
/**
 * Generates the grain tile: 256x256 monochrome noise, written once to
 * public/noise.png and repeated as a background image.
 *
 * Per-pixel random noise has no low-frequency structure, so it tiles
 * seamlessly with no edge treatment. Values are kept in a mid band rather
 * than full black-to-white so a 6% overlay does not lift the page's blacks.
 */
import sharp from 'sharp';
import path from 'node:path';

const SIZE = 256;
const LO = 70;
const HI = 190;

const px = Buffer.alloc(SIZE * SIZE * 3);
for (let i = 0; i < SIZE * SIZE; i++) {
  const v = LO + Math.floor(Math.random() * (HI - LO));
  px[i * 3] = v;
  px[i * 3 + 1] = v;
  px[i * 3 + 2] = v;
}

const out = path.join(process.cwd(), 'public', 'noise.png');
await sharp(px, { raw: { width: SIZE, height: SIZE, channels: 3 } })
  .png({ compressionLevel: 9, palette: true })
  .toFile(out);

console.log(`noise tile: ${SIZE}x${SIZE} -> public/noise.png`);
