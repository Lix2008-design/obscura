#!/usr/bin/env node
/**
 * OBSCURA — frame sequence pipeline.
 *
 *   node scripts/build-frames.mjs --placeholder [--count 180]
 *       Renders a synthetic rotating lens element. Used until real product
 *       frames exist. Output matches the real spec exactly, so swapping in
 *       a genuine turntable needs no code changes.
 *
 *   node scripts/build-frames.mjs --from <video.mp4> [--count 180]
 *       Extracts N evenly spaced frames from a video with ffmpeg.
 *
 *   node scripts/build-frames.mjs --from <folder> 
 *       Converts a folder of PNG/JPG frames (sorted by filename).
 *
 * Everything lands in public/frames as frame-0001.webp … at WIDTH px / QUALITY.
 */
import sharp from 'sharp';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const WIDTH = 1600;
const QUALITY = 80;
const OUT = path.join(process.cwd(), 'public', 'frames');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1] ?? true;
};
const COUNT = Number(flag('--count') ?? 180);

// ---------------------------------------------------------------- geometry --
// The placeholder is a real 3D projection, not a 2D squash: outline points are
// given a z from the lens wrap, rotated about Y, then perspective projected.
// Edge-on frames collapse to a sliver with the temples visible, like the
// real thing would.

const W = 455;   // lens half width
const H = 196;   // lens half height
const WRAP = 124; // how far the lens edges curve away from camera
const FOCAL = 1700;

const cubic = (p0, p1, p2, p3, t) => {
  const u = 1 - t;
  return [
    u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
    u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
  ];
};

// Sport shield outline, front view, centred on origin. Tall lens, a near
// straight brow that squares off at the outer corners, close to vertical outer
// edges, and a bottom that sweeps up hard toward the temples — the proportions
// of a wrapped sport frame rather than a soft oval.
const SEGMENTS = [
  // brow, outer-left corner to centre
  [[-W, -H * 0.60], [-W * 0.93, -H * 0.99], [-W * 0.50, -H * 1.05], [0, -H * 1.05]],
  // brow, centre to outer-right corner
  [[0, -H * 1.05], [W * 0.50, -H * 1.05], [W * 0.93, -H * 0.99], [W, -H * 0.60]],
  // right outer edge, close to vertical
  [[W, -H * 0.60], [W * 1.02, -H * 0.26], [W * 1.0, H * 0.04], [W * 0.90, H * 0.32]],
  // right lower edge sweeping in and up
  [[W * 0.90, H * 0.32], [W * 0.70, H * 0.74], [W * 0.44, H * 0.96], [W * 0.22, H * 0.97]],
  // nose notch, right flank
  [[W * 0.22, H * 0.97], [W * 0.15, H * 0.70], [W * 0.10, H * 0.52], [0, H * 0.47]],
  // nose notch, left flank
  [[0, H * 0.47], [-W * 0.10, H * 0.52], [-W * 0.15, H * 0.70], [-W * 0.22, H * 0.97]],
  // left lower edge
  [[-W * 0.22, H * 0.97], [-W * 0.44, H * 0.96], [-W * 0.70, H * 0.74], [-W * 0.90, H * 0.32]],
  // left outer edge
  [[-W * 0.90, H * 0.32], [-W * 1.0, H * 0.04], [-W * 1.02, -H * 0.26], [-W, -H * 0.60]],
];

const outline3d = () => {
  const pts = [];
  for (const [a, b, c, d] of SEGMENTS) {
    for (let i = 0; i < 34; i++) {
      const [x, y] = cubic(a, b, c, d, i / 34);
      pts.push([x, y, -Math.pow(x / W, 2) * WRAP]);
    }
  }
  return pts;
};

// The brow line alone, for the frame bar across the top.
const brow3d = () => {
  const pts = [];
  for (const [a, b, c, d] of SEGMENTS.slice(0, 2)) {
    for (let i = 0; i <= 34; i++) {
      const [x, y] = cubic(a, b, c, d, i / 34);
      pts.push([x, y, -Math.pow(x / W, 2) * WRAP]);
    }
  }
  return pts;
};

const rotateY = ([x, y, z], t) => [
  x * Math.cos(t) + z * Math.sin(t),
  y,
  -x * Math.sin(t) + z * Math.cos(t),
];

const project = ([x, y, z], cx, cy) => {
  const s = FOCAL / (FOCAL + z);
  return [cx + x * s, cy + y * s];
};

const toPath = (pts, close = true) =>
  pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join('') + (close ? 'Z' : '');

// ------------------------------------------------------------------ render --

/**
 * How far the product turns either side of head on, in degrees. A full 360
 * would pass edge-on twice per revolution, where the projected width changes
 * fastest and the motion visibly snaps. Sweeping an arc keeps every frame on
 * the slow, flattering part of the curve and still loops seamlessly.
 */
const ARC = (58 * Math.PI) / 180;

const renderFrame = (index, count, { width = WIDTH, height = 900 } = {}) => {
  const p = index / count;
  const t = ARC * Math.sin(p * Math.PI * 2);
  const cx = width / 2;
  const cy = height * 0.46;

  const lens = outline3d().map((p) => project(rotateY(p, t), cx, cy));
  const lensPath = toPath(lens);
  const browPath = toPath(brow3d().map((p) => project(rotateY(p, t), cx, cy)), false);

  // Temples: from each hinge, straight back in +z.
  const temple = (sign) => {
    const a = project(rotateY([sign * W * 0.99, -44, -WRAP], t), cx, cy);
    const b = project(rotateY([sign * W * 0.95, -74, 170], t), cx, cy);
    const c = project(rotateY([sign * W * 0.88, -34, 320], t), cx, cy);
    return `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${b[0].toFixed(1)},${b[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
  };

  // Tinted coating, not a full spectrum: a narrow emerald -> teal -> violet
  // band that drifts as the lens turns.
  const base = 146 + Math.sin(p * Math.PI * 2) * 26;
  const h = (n, l) => `hsl(${(base + n) % 360} 62% ${l}%)`;

  // Facing ratio: 1 head-on, 0 edge-on. Drives glow and specular strength.
  const facing = Math.abs(Math.cos(t));

  const xs = lens.map((p) => p[0]);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const baseline = cy + H + 130;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="irid" x1="${x0}" y1="${cy - H}" x2="${x1}" y2="${cy + H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${h(-18, 24)}"/>
      <stop offset="0.3" stop-color="${h(26, 40)}"/>
      <stop offset="0.55" stop-color="${h(68, 36)}"/>
      <stop offset="0.8" stop-color="${h(112, 31)}"/>
      <stop offset="1" stop-color="${h(148, 23)}"/>
    </linearGradient>
    <linearGradient id="metal" x1="${x0}" y1="0" x2="${x1}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2b2b30"/>
      <stop offset="0.42" stop-color="#7c7c86"/>
      <stop offset="0.72" stop-color="#1d1d21"/>
      <stop offset="1" stop-color="#4a4a52"/>
    </linearGradient>
    <linearGradient id="streak" x1="${x0}" y1="${cy - H}" x2="${x1}" y2="${cy + H * 0.4}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.42" stop-color="#ffffff" stop-opacity="${(0.30 * facing).toFixed(3)}"/>
      <stop offset="0.62" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="floor" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#C8FF3C" stop-opacity="${(0.13 * facing + 0.03).toFixed(3)}"/>
      <stop offset="0.45" stop-color="#5bd6c0" stop-opacity="0.04"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity="0.22"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <mask id="reflmask">
      <rect x="0" y="${baseline}" width="${width}" height="${height - baseline}" fill="url(#fade)"/>
    </mask>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="11"/>
    </filter>
    <filter id="bloom" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="30"/>
    </filter>
  </defs>

  <ellipse cx="${cx}" cy="${baseline - 16}" rx="${((x1 - x0) * 0.74).toFixed(1)}" ry="66" fill="url(#floor)"/>

  <g mask="url(#reflmask)" transform="translate(0 ${(2 * baseline).toFixed(1)}) scale(1 -1)" filter="url(#soft)" opacity="0.4">
    <path d="${lensPath}" fill="url(#irid)"/>
  </g>

  <g filter="url(#bloom)" opacity="${(0.22 * facing).toFixed(3)}">
    <path d="${lensPath}" fill="url(#irid)"/>
  </g>

  <path d="${temple(-1)}" stroke="url(#metal)" stroke-width="22" fill="none" stroke-linecap="round"/>
  <path d="${temple(1)}" stroke="url(#metal)" stroke-width="22" fill="none" stroke-linecap="round"/>

  <path d="${lensPath}" fill="#080d0c"/>
  <path d="${lensPath}" fill="url(#irid)" opacity="0.62"/>
  <path d="${lensPath}" fill="url(#streak)"/>
  <path d="${lensPath}" fill="none" stroke="#000000" stroke-opacity="0.55" stroke-width="10" stroke-linejoin="round"/>
  <path d="${browPath}" fill="none" stroke="url(#metal)" stroke-width="21" stroke-linecap="round"/>
  <path d="${lensPath}" fill="none" stroke="#ffffff" stroke-opacity="${(0.20 * facing).toFixed(3)}" stroke-width="1.5"/>
</svg>`);
};

/**
 * The "worn" sequence: a rim-lit silhouette with the product lifting away from
 * the face. Deliberately a silhouette rather than an attempt at photography —
 * on a near-black page it reads as art direction, where a synthetic model
 * would read as a fake. Replace with real footage via --from when you have it.
 */
// A profile reads as human from the outline alone — forehead, nose, lips,
// chin — where a front-facing oval reads as a mannequin. It also lets the
// product start edge-on against the face, the way it really sits, and turn
// toward camera as it lifts away.
const HEAD = [
  'M -30,-235',
  'C 60,-235 132,-180 142,-108',
  'C 146,-88 138,-78 132,-68',
  'C 152,-58 172,-18 178,-2',
  'C 181,10 172,15 159,17',
  'C 149,19 145,21 143,29',
  'C 152,35 154,45 145,53',
  'C 152,59 149,71 139,79',
  'C 150,89 147,111 127,125',
  'C 99,147 59,157 19,159',
  'C -21,161 -61,151 -93,133',
  'L -105,151',
  'C -121,121 -141,61 -143,-9',
  'C -147,-89 -110,-200 -30,-235 Z',
].join(' ');
const HAIR = 'M -18,-246 C -108,-238 -152,-152 -152,-42 C -154,40 -142,112 -122,172 C -154,177 -188,150 -198,98 C -218,6 -212,-122 -152,-192 C -112,-238 -58,-252 -18,-246 Z';
const NECK = 'M 19,159 C 41,201 45,241 41,301 L -91,301 C -97,241 -101,191 -105,151 Z';
const SHOULDER = 'M -420,470 C -330,350 -180,300 -60,296 C 90,290 250,340 360,470 L 420,520 L -460,520 Z';

const easeInOut = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

const renderWorn = (index, count, { width = WIDTH, height = 900 } = {}) => {
  const p = index / count;
  const e = easeInOut(p);

  // On the face the lens is almost edge-on. It turns to three-quarter as it
  // comes away, so the product is legible by the time it clears the head.
  const t = ((71 - 51 * e) * Math.PI) / 180;
  const lens = outline3d().map((q) => project(rotateY(q, t), 0, 0));
  const brow = brow3d().map((q) => project(rotateY(q, t), 0, 0));
  const temple = (sign) => {
    const a = project(rotateY([sign * W * 0.99, -44, -WRAP], t), 0, 0);
    const b = project(rotateY([sign * W * 0.95, -74, 170], t), 0, 0);
    const c = project(rotateY([sign * W * 0.88, -34, 320], t), 0, 0);
    return `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${b[0].toFixed(1)},${b[1].toFixed(1)} ${c[0].toFixed(1)},${c[1].toFixed(1)}`;
  };

  const base = 146 + e * 30;
  const h = (n, l) => `hsl(${(base + n) % 360} 62% ${l}%)`;
  const facing = Math.abs(Math.cos(t));

  // Sits at the brow, lifts up and forward, staying inside the frame.
  const gx = 38 - 30 * e;
  const gy = -78 - 262 * e;
  const gs = 0.4 + 0.13 * e;
  const tilt = -14 * e;
  const cx = width / 2 - 40;
  const cy = height * 0.5;

  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="irid" x1="${-W}" y1="${-H}" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="${h(-18, 26)}"/>
      <stop offset="0.3" stop-color="${h(26, 42)}"/>
      <stop offset="0.55" stop-color="${h(68, 38)}"/>
      <stop offset="0.8" stop-color="${h(112, 33)}"/>
      <stop offset="1" stop-color="${h(148, 25)}"/>
    </linearGradient>
    <linearGradient id="metal" x1="${-W}" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#2b2b30"/>
      <stop offset="0.42" stop-color="#7c7c86"/>
      <stop offset="0.72" stop-color="#1d1d21"/>
      <stop offset="1" stop-color="#4a4a52"/>
    </linearGradient>
    <!-- Key light sits behind and to the right, so only the face edge catches it. -->
    <linearGradient id="rim" x1="-40" y1="0" x2="185" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="0.55" stop-color="#9fe6d8" stop-opacity="0.22"/>
      <stop offset="0.85" stop-color="#dffbff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.95"/>
    </linearGradient>
    <linearGradient id="rimsoft" x1="-150" y1="0" x2="190" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#4fb9c9" stop-opacity="0"/>
      <stop offset="1" stop-color="#8fe8ff" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="halo" cx="0.62" cy="0.42" r="0.5">
      <stop offset="0" stop-color="#1d3d46" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#000000" stop-opacity="0"/>
    </radialGradient>
    <filter id="glowsoft" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="13"/>
    </filter>
  </defs>

  <ellipse cx="${cx + 120}" cy="${cy - 60}" rx="470" ry="430" fill="url(#halo)"/>

  <g transform="translate(${cx} ${cy})">
    <g filter="url(#glowsoft)" opacity="0.7">
      <path d="${HEAD}" fill="none" stroke="url(#rimsoft)" stroke-width="9"/>
      <path d="${HAIR}" fill="none" stroke="url(#rimsoft)" stroke-width="5" opacity="0.5"/>
      <path d="${NECK}" fill="none" stroke="url(#rimsoft)" stroke-width="6"/>
    </g>

    <path d="${SHOULDER}" fill="#090909"/>
    <path d="${NECK}" fill="#08080a"/>
    <path d="${HAIR}" fill="#08080b"/>
    <path d="${HEAD}" fill="#0a0a0d"/>

    <path d="${SHOULDER}" fill="none" stroke="url(#rimsoft)" stroke-width="2" opacity="0.5"/>
    <path d="${NECK}" fill="none" stroke="url(#rim)" stroke-width="2.5"/>
    <path d="${HEAD}" fill="none" stroke="url(#rim)" stroke-width="3.2"/>

    <!-- Mirrored so the temples run back over the ear, not forward past the nose. -->
    <g transform="translate(${gx.toFixed(1)} ${gy.toFixed(1)}) scale(${(-gs).toFixed(3)} ${gs.toFixed(3)}) rotate(${tilt.toFixed(2)})">
      <path d="${temple(-1)}" stroke="url(#metal)" stroke-width="22" fill="none" stroke-linecap="round"/>
      <path d="${temple(1)}" stroke="url(#metal)" stroke-width="22" fill="none" stroke-linecap="round"/>
      <path d="${toPath(lens)}" fill="#080d0c"/>
      <path d="${toPath(lens)}" fill="url(#irid)" opacity="${(0.62 + 0.18 * e).toFixed(3)}"/>
      <path d="${toPath(lens)}" fill="none" stroke="#000000" stroke-opacity="0.5" stroke-width="10" stroke-linejoin="round"/>
      <path d="${toPath(brow, false)}" fill="none" stroke="url(#metal)" stroke-width="21" stroke-linecap="round"/>
      <path d="${toPath(lens)}" fill="none" stroke="#ffffff" stroke-opacity="${(0.28 * facing).toFixed(3)}" stroke-width="1.5"/>
    </g>
  </g>
</svg>`);
};

// ------------------------------------------------------------------- modes --

const clean = () => {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
};

let outDir = OUT;
const name = (i) => path.join(outDir, `frame-${String(i + 1).padStart(4, '0')}.webp`);

const writeWebp = (input, i) =>
  sharp(input).resize({ width: WIDTH, withoutEnlargement: false }).webp({ quality: QUALITY }).toFile(name(i));

const placeholder = async () => {
  clean();
  for (let i = 0; i < COUNT; i++) {
    await writeWebp(renderFrame(i, COUNT), i);
    if ((i + 1) % 30 === 0) console.log(`  ${i + 1}/${COUNT}`);
  }
  console.log(`placeholder sequence: ${COUNT} frames -> public/frames`);
};

const fromVideo = async (src) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obscura-'));
  const probe = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', src])
    .toString()
    .trim();
  const fps = COUNT / parseFloat(probe);
  execFileSync('ffmpeg', ['-loglevel', 'error', '-i', src, '-vf', `fps=${fps},scale=${WIDTH}:-2`, path.join(tmp, 'f-%05d.png'), '-y']);
  const files = fs.readdirSync(tmp).sort();
  clean();
  for (let i = 0; i < files.length; i++) await writeWebp(path.join(tmp, files[i]), i);
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`extracted ${files.length} frames from ${path.basename(src)} -> public/frames`);
};

const fromFolder = async (dir) => {
  const files = fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) throw new Error(`no images in ${dir}`);
  clean();
  for (let i = 0; i < files.length; i++) await writeWebp(path.join(dir, files[i]), i);
  console.log(`converted ${files.length} frames from ${dir} -> public/frames`);
};

const worn = async () => {
  outDir = path.join(process.cwd(), 'public', 'worn');
  clean();
  for (let i = 0; i < COUNT; i++) {
    await writeWebp(renderWorn(i, COUNT), i);
    if ((i + 1) % 30 === 0) console.log(`  ${i + 1}/${COUNT}`);
  }
  console.log(`worn sequence: ${COUNT} frames -> public/worn`);
};

const hero = async () => {
  // Same renderer, oversampled through librsvg then cropped tighter so the
  // product sits larger in frame than it does in the scroll sequence.
  const svg = renderFrame(9, 96);
  const big = await sharp(svg, { density: 108 }).png().toBuffer();
  const vignette = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2400" height="1350">
    <defs>
      <radialGradient id="v" cx="0.5" cy="0.44" r="0.78">
        <stop offset="0.35" stop-color="#000" stop-opacity="0"/>
        <stop offset="1" stop-color="#000" stop-opacity="0.92"/>
      </radialGradient>
      <filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3"/>
        <feColorMatrix type="saturate" values="0"/></filter>
    </defs>
    <rect width="2400" height="1350" fill="url(#v)"/>
    <rect width="2400" height="1350" filter="url(#g)" opacity="0.07"/>
  </svg>`);
  await sharp({ create: { width: 2400, height: 1350, channels: 3, background: '#08080A' } })
    .composite([
      { input: big },
      { input: vignette },
    ])
    .jpeg({ quality: 86, mozjpeg: true })
    .toFile(path.join(process.cwd(), 'public', 'hero.jpg'));
  console.log('hero -> public/hero.jpg');
};

const src = flag('--from');
if (args.includes('--worn')) await worn();
else if (args.includes('--hero')) await hero();
else if (args.includes('--placeholder')) await placeholder();
else if (src && fs.statSync(src).isDirectory()) await fromFolder(src);
else if (src) await fromVideo(src);
else {
  console.error('usage: build-frames.mjs --placeholder [--count N] | --from <video|folder> [--count N] | --hero | --worn');
  process.exit(1);
}
