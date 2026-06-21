// Generates PNG app icons (192/512) from a tiny pure-Node PNG encoder.
// Run via `npm run icons` (also runs on postinstall). No external deps.
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "icons");

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (~c) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const t = Buffer.from(type, "ascii");
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function roundedRect(x, y, x0, y0, w, h, rad) {
  const x1 = x0 + w,
    y1 = y0 + h;
  if (x < x0 || x >= x1 || y < y0 || y >= y1) return false;
  const cx = x < x0 + rad ? x0 + rad : x > x1 - rad ? x1 - rad : x;
  const cy = y < y0 + rad ? y0 + rad : y > y1 - rad ? y1 - rad : y;
  return (
    (x - cx) ** 2 + (y - cy) ** 2 <= rad * rad ||
    (x >= x0 + rad && x <= x1 - rad) ||
    (y >= y0 + rad && y <= y1 - rad)
  );
}
function png(size) {
  const W = size,
    H = size;
  const bg = [10, 10, 12],
    card = [23, 23, 28],
    pink = [255, 77, 109],
    yellow = [255, 212, 0];
  const r = Math.round(size * 0.22);
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    for (let x = 0; x < W; x++) {
      let col = [...bg, roundedRect(x, y, 0, 0, W, H, r) ? 255 : 0];
      if (col[3]) {
        if (roundedRect(x, y, size * 0.19, size * 0.25, size * 0.62, size * 0.5, size * 0.07))
          col = [...card, 255];
        const tx = size * 0.44,
          ty = size * 0.5,
          tw = size * 0.13,
          th = size * 0.18;
        if (x >= tx && x <= tx + tw) {
          const half = th * (1 - (x - tx) / tw);
          if (Math.abs(y - ty) <= half) col = [...pink, 255];
        }
        const by = size * 0.79,
          bh = size * 0.04;
        if (x >= size * 0.25 && x <= size * 0.75 && y >= by && y <= by + bh)
          col = [...pink, 255];
        if (x >= size * 0.33 && x <= size * 0.45 && y >= by && y <= by + bh)
          col = [...yellow, 255];
      }
      const o = y * (1 + W * 3) + 1 + x * 3;
      raw[o] = col[3] ? col[0] : bg[0];
      raw[o + 1] = col[3] ? col[1] : bg[1];
      raw[o + 2] = col[3] ? col[2] : bg[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "icon-192.png"), png(192));
fs.writeFileSync(path.join(OUT_DIR, "icon-512.png"), png(512));
console.log("✓ Generated public/icons/icon-192.png & icon-512.png");
