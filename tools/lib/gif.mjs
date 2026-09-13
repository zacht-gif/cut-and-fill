/**
 * gif.mjs — a GIF89a encoder in stdlib Node.
 *
 * There is no ffmpeg on this machine, and adding an npm dependency would mean
 * a package.json and node_modules in a repo that deliberately has neither, so
 * the format is written out by hand. It is an old and small format; the only
 * fiddly part is LZW, and that spec fits on a page.
 *
 * Three things keep the file small, which matters because a store-page GIF
 * nobody waits for is a GIF nobody sees:
 *
 *   - One global palette shared by every frame, built by median cut over all
 *     frames at once. Per-frame palettes would cost 768 bytes each and make
 *     colours shimmer between frames.
 *   - Frame differencing: a pixel identical to the previous frame is written
 *     as the transparent index and left showing through.
 *   - Dirty rectangles: each frame stores only the sub-rectangle that actually
 *     changed. On a turn-based board that is usually a few cells.
 */

/* ---------------- palette: median cut ---------------- */

function medianCut(colors, maxColors) {
  // colors: array of packed 0xRRGGBB, already deduplicated.
  let boxes = [colors];
  while (boxes.length < maxColors) {
    // Split the box with the widest channel spread. A box holding one colour
    // cannot be split, so stop when none is splittable rather than spinning.
    let best = -1, bestRange = 0, bestCh = 0;
    for (let i = 0; i < boxes.length; i++) {
      if (boxes[i].length < 2) continue;
      for (let ch = 0; ch < 3; ch++) {
        const shift = 16 - ch * 8;
        let lo = 255, hi = 0;
        for (const c of boxes[i]) {
          const v = (c >> shift) & 0xff;
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
        if (hi - lo > bestRange) { bestRange = hi - lo; best = i; bestCh = ch; }
      }
    }
    if (best < 0) break;
    const shift = 16 - bestCh * 8;
    const sorted = boxes[best].slice().sort((a, b) => ((a >> shift) & 0xff) - ((b >> shift) & 0xff));
    const mid = sorted.length >> 1;
    boxes.splice(best, 1, sorted.slice(0, mid), sorted.slice(mid));
  }
  return boxes.map((box) => {
    let r = 0, g = 0, b = 0;
    for (const c of box) { r += (c >> 16) & 0xff; g += (c >> 8) & 0xff; b += c & 0xff; }
    const n = box.length;
    return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
  });
}

/* ---------------- LZW ---------------- */

function lzwEncode(indices, minCodeSize) {
  const clear = 1 << minCodeSize;
  const eoi = clear + 1;
  let codeSize = minCodeSize + 1;
  let next = eoi + 1;
  let dict = new Map();

  const out = [];
  let cur = 0, curBits = 0;
  const emit = (code) => {
    cur |= code << curBits;
    curBits += codeSize;
    while (curBits >= 8) { out.push(cur & 0xff); cur >>>= 8; curBits -= 8; }
  };

  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 4096 + k;
    const found = dict.get(key);
    if (found !== undefined) { prefix = found; continue; }
    emit(prefix);
    dict.set(key, next++);
    // The decoder widens its codes at exactly these points. Get this wrong and
    // the stream desynchronises a few hundred bytes in, which looks like
    // garbled pixels rather than an error.
    if (next - 1 === (1 << codeSize) && codeSize < 12) codeSize++;
    if (next === 4096) {
      emit(clear);
      dict = new Map();
      next = eoi + 1;
      codeSize = minCodeSize + 1;
    }
    prefix = k;
  }
  emit(prefix);
  emit(eoi);
  if (curBits > 0) out.push(cur & 0xff);

  // Image data travels in sub-blocks of at most 255 bytes, each length-prefixed,
  // terminated by a zero-length block.
  const blocks = [];
  for (let i = 0; i < out.length; i += 255) {
    const chunk = out.slice(i, i + 255);
    blocks.push(Buffer.from([chunk.length, ...chunk]));
  }
  blocks.push(Buffer.from([0]));
  return Buffer.concat(blocks);
}

/* ---------------- encoder ---------------- */

/**
 * frames: [{ data: Buffer RGBA, delay: ms }], all the same width and height.
 */
export function encodeGIF(frames, width, height, { loop = 0 } = {}) {
  // Distinct colours across every frame. The game is flat-shaded, so this set
  // stays modest; antialiased text is what pushes it past 256.
  const seen = new Set();
  for (const f of frames) {
    for (let i = 0; i < f.data.length; i += 4) {
      seen.add((f.data[i] << 16) | (f.data[i + 1] << 8) | f.data[i + 2]);
    }
  }
  // 255 real colours: index 255 is reserved for transparency, so unchanged
  // pixels can show through from the frame before.
  const palette = medianCut(Array.from(seen), 255);
  const TRANSPARENT = 255;

  const cache = new Map();
  const indexOf = (rgb) => {
    const hit = cache.get(rgb);
    if (hit !== undefined) return hit;
    const r = (rgb >> 16) & 0xff, g = (rgb >> 8) & 0xff, b = rgb & 0xff;
    let bi = 0, bd = Infinity;
    for (let i = 0; i < palette.length; i++) {
      const dr = r - palette[i][0], dg = g - palette[i][1], db = b - palette[i][2];
      const d = dr * dr + dg * dg + db * db;
      if (d < bd) { bd = d; bi = i; }
    }
    cache.set(rgb, bi);
    return bi;
  };

  const parts = [];

  const header = Buffer.alloc(13);
  header.write("GIF89a", 0, "ascii");
  header.writeUInt16LE(width, 6);
  header.writeUInt16LE(height, 8);
  header[10] = 0xf0 | 7;   // global colour table present, 256 entries
  header[11] = 0;
  header[12] = 0;
  parts.push(header);

  const gct = Buffer.alloc(256 * 3);
  palette.forEach(([r, g, b], i) => { gct[i * 3] = r; gct[i * 3 + 1] = g; gct[i * 3 + 2] = b; });
  parts.push(gct);

  parts.push(Buffer.from([
    0x21, 0xff, 0x0b, ...Buffer.from("NETSCAPE2.0", "ascii"),
    0x03, 0x01, loop & 0xff, (loop >> 8) & 0xff, 0x00,
  ]));

  let prev = null;
  for (const frame of frames) {
    let x0 = 0, y0 = 0, x1 = width - 1, y1 = height - 1;
    if (prev) {
      x0 = width; y0 = height; x1 = -1; y1 = -1;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const i = (y * width + x) * 4;
          if (frame.data[i] !== prev[i] ||
              frame.data[i + 1] !== prev[i + 1] ||
              frame.data[i + 2] !== prev[i + 2]) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      // Nothing moved at all. A zero-area image descriptor is illegal, so emit
      // the smallest legal frame — one transparent pixel — to carry the delay.
      if (x1 < 0) { x0 = 0; y0 = 0; x1 = 0; y1 = 0; }
    }
    const fw = x1 - x0 + 1, fh = y1 - y0 + 1;

    const indices = new Uint8Array(fw * fh);
    for (let y = 0; y < fh; y++) {
      for (let x = 0; x < fw; x++) {
        const i = ((y + y0) * width + (x + x0)) * 4;
        const same = prev &&
          frame.data[i] === prev[i] &&
          frame.data[i + 1] === prev[i + 1] &&
          frame.data[i + 2] === prev[i + 2];
        indices[y * fw + x] = same
          ? TRANSPARENT
          : indexOf((frame.data[i] << 16) | (frame.data[i + 1] << 8) | frame.data[i + 2]);
      }
    }

    // GIF delays are centiseconds. Browsers clamp anything under 2cs up to
    // 10cs, so never ask for less than 2.
    const delayCs = Math.max(2, Math.round(frame.delay / 10));
    parts.push(Buffer.from([
      0x21, 0xf9, 0x04,
      0x05,                                  // disposal 1 (leave in place) + transparency
      delayCs & 0xff, (delayCs >> 8) & 0xff,
      TRANSPARENT, 0x00,
    ]));

    const desc = Buffer.alloc(10);
    desc[0] = 0x2c;
    desc.writeUInt16LE(x0, 1);
    desc.writeUInt16LE(y0, 3);
    desc.writeUInt16LE(fw, 5);
    desc.writeUInt16LE(fh, 7);
    desc[9] = 0;                             // no local table, not interlaced
    parts.push(desc);

    parts.push(Buffer.from([8]));            // LZW minimum code size
    parts.push(lzwEncode(indices, 8));

    prev = frame.data;
  }

  parts.push(Buffer.from([0x3b]));
  return Buffer.concat(parts);
}
