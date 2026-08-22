/**
 * Génère les icônes PWA sans dépendance externe (PNG écrit à la main).
 *   node scripts/gen-icons.mjs
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "public", "icons");
mkdirSync(OUT, { recursive: true });

/* ------------------------------ Encodeur PNG ----------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filtre "none"
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // profondeur
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* -------------------------------- Dessin --------------------------------- */

const mix = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Distance signée à un rectangle arrondi centré en (cx, cy). */
function roundedRect(x, y, cx, cy, halfW, halfH, radius) {
  const dx = Math.abs(x - cx) - (halfW - radius);
  const dy = Math.abs(y - cy) - (halfH - radius);
  const ax = Math.max(dx, 0);
  const ay = Math.max(dy, 0);
  return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(dx, dy), 0) - radius;
}

function render(size, { padding = 0, squircle = 0.23 } = {}) {
  const rgba = Buffer.alloc(size * size * 4);
  const s = 1 / size;
  const aa = 1.6 * s;
  const scale = 1 - padding * 2;

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const x = (px + 0.5) * s;
      const y = (py + 0.5) * s;

      // Fond : dégradé rose -> violet en diagonale
      const t = clamp01((x + y) / 2);
      let r = mix(255, 168, t);
      let g = mix(77, 85, t);
      let b = mix(141, 247, t);

      // Halo clair en haut à gauche
      const glow = clamp01(1 - Math.hypot(x - 0.24, y - 0.18) * 1.9);
      r = mix(r, 255, glow * 0.35);
      g = mix(g, 190, glow * 0.35);
      b = mix(b, 210, glow * 0.35);

      // Silhouette d'haltère (coordonnées locales, centrées et remises à l'échelle)
      const lx = (x - 0.5) / scale + 0.5;
      const ly = (y - 0.5) / scale + 0.5;

      const bar = roundedRect(lx, ly, 0.5, 0.5, 0.19, 0.045, 0.03);
      const plateL = roundedRect(lx, ly, 0.27, 0.5, 0.055, 0.19, 0.045);
      const plateR = roundedRect(lx, ly, 0.73, 0.5, 0.055, 0.19, 0.045);
      const capL = roundedRect(lx, ly, 0.175, 0.5, 0.045, 0.115, 0.038);
      const capR = roundedRect(lx, ly, 0.825, 0.5, 0.045, 0.115, 0.038);
      const glyph = Math.min(bar, plateL, plateR, capL, capR);

      const inGlyph = clamp01(0.5 - glyph / aa);
      r = mix(r, 255, inGlyph);
      g = mix(g, 255, inGlyph);
      b = mix(b, 255, inGlyph);

      // Masque extérieur : carré arrondi (squircle)
      const outer = roundedRect(x, y, 0.5, 0.5, 0.5, 0.5, squircle);
      const alpha = clamp01(0.5 - outer / aa) * 255;

      const i = (py * size + px) * 4;
      rgba[i] = Math.round(r);
      rgba[i + 1] = Math.round(g);
      rgba[i + 2] = Math.round(b);
      rgba[i + 3] = Math.round(alpha);
    }
  }
  return encodePng(size, size, rgba);
}

const targets = [
  ["icon-192.png", 192, { padding: 0.14 }],
  ["icon-512.png", 512, { padding: 0.14 }],
  ["apple-touch-icon.png", 180, { padding: 0.16, squircle: 0.0001 }],
  ["maskable-512.png", 512, { padding: 0.24, squircle: 0.0001 }],
  ["favicon-64.png", 64, { padding: 0.1 }],
];

for (const [name, size, options] of targets) {
  writeFileSync(join(OUT, name), render(size, options));
  console.log(`✅  ${name} (${size}×${size})`);
}

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FF4D8D"/>
      <stop offset="100%" stop-color="#A855F7"/>
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="23" fill="url(#g)"/>
  <g fill="#fff">
    <rect x="31" y="45.5" width="38" height="9" rx="3"/>
    <rect x="21.5" y="31" width="11" height="38" rx="4.5"/>
    <rect x="67.5" y="31" width="11" height="38" rx="4.5"/>
    <rect x="13" y="38.5" width="9" height="23" rx="3.8"/>
    <rect x="78" y="38.5" width="9" height="23" rx="3.8"/>
  </g>
</svg>
`;
writeFileSync(join(OUT, "icon.svg"), svg);
console.log("✅  icon.svg");
