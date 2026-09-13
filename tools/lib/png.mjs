/**
 * png.mjs — just enough PNG to read back what Chrome hands us.
 *
 * Page.captureScreenshot returns PNG, and the GIF encoder needs raw pixels.
 * Node already ships the hard part (zlib inflate), so decoding is a chunk walk
 * plus the five scanline filters from the spec — no dependency required, which
 * is the same bargain the rest of tools/ makes.
 *
 * Scope is deliberately narrow: 8-bit, non-interlaced, which is everything
 * Chrome emits. Anything else throws rather than guessing.
 */

import zlib from "node:zlib";

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

export function decodePNG(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error("not a PNG");

  let p = 8, width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idat = [];
  let plte = null, trns = null;

  while (p < buf.length) {
    const len = buf.readUInt32BE(p);
    const type = buf.toString("ascii", p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      if (data[12] !== 0) throw new Error("interlaced PNG is not supported");
    } else if (type === "PLTE") plte = data;
    else if (type === "tRNS") trns = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    p += 12 + len;
  }

  if (bitDepth !== 8) throw new Error("only 8-bit PNG is supported, got " + bitDepth);
  const ch = CHANNELS[colorType];
  if (!ch) throw new Error("unsupported colour type " + colorType);

  const raw = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * ch;
  const out = Buffer.alloc(height * stride);

  // Undo the per-scanline filter. Each line's filter byte says how it was
  // predicted from the pixel to the left (a), the one above (b) and the one
  // above-left (c); reconstruction has to run in order because every line
  // depends on the one already rebuilt.
  let rp = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[rp++];
    const line = raw.subarray(rp, rp + stride);
    rp += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const prev = y ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let x = 0; x < stride; x++) {
      const a = x >= ch ? cur[x - ch] : 0;
      const b = prev ? prev[x] : 0;
      const c = prev && x >= ch ? prev[x - ch] : 0;
      let v = line[x];
      if (filter === 1) v += a;
      else if (filter === 2) v += b;
      else if (filter === 3) v += (a + b) >> 1;
      else if (filter === 4) {
        const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c);
        v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      }
      cur[x] = v & 0xff;
    }
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    let r, g, b, a = 255;
    if (colorType === 2) { r = out[i * 3]; g = out[i * 3 + 1]; b = out[i * 3 + 2]; }
    else if (colorType === 6) { r = out[i * 4]; g = out[i * 4 + 1]; b = out[i * 4 + 2]; a = out[i * 4 + 3]; }
    else if (colorType === 0) { r = g = b = out[i]; }
    else if (colorType === 4) { r = g = b = out[i * 2]; a = out[i * 2 + 1]; }
    else {
      const ix = out[i];
      r = plte[ix * 3]; g = plte[ix * 3 + 1]; b = plte[ix * 3 + 2];
      if (trns && ix < trns.length) a = trns[ix];
    }
    rgba[i * 4] = r; rgba[i * 4 + 1] = g; rgba[i * 4 + 2] = b; rgba[i * 4 + 3] = a;
  }

  return { width, height, data: rgba };
}
