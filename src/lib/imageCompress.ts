/**
 * Browser-side, visually-lossless image pre-compression.
 *
 * The server (Laravel ImageOptimizer) is the authoritative optimizer, but PHP's
 * upload_max_filesize (often 2 MB) can reject the large phone photos that most
 * need shrinking. Downscaling oversized images to the web maximum before upload
 * keeps them under that ceiling and cuts upload time — while staying visually
 * lossless (a pure downscale + high-quality re-encode).
 *
 * Safety:
 * - Animated images (GIF, animated WebP, APNG) are returned untouched — a canvas
 *   would flatten them to a single frame.
 * - EXIF orientation is read directly and baked into the pixels via a canvas
 *   transform, so a re-encoded photo (which drops EXIF) is never left sideways,
 *   regardless of the browser's createImageBitmap orientation support.
 * - The original File is returned unchanged on no-benefit or any failure — the
 *   server still optimizes (and still has the original's EXIF) in that case.
 */

export type ClientCompressOptions = {
  maxEdge?: number;
  jpegQuality?: number;
  webpQuality?: number;
  // Skip work entirely below this size unless the image is over-large.
  sizeThreshold?: number;
};

const DEFAULTS: Required<ClientCompressOptions> = {
  maxEdge: 2048,
  jpegQuality: 0.92,
  webpQuality: 0.92,
  sizeThreshold: 1_500_000,
};

const RECODABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

function asLatin1(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) out += String.fromCharCode(bytes[i]);
  return out;
}

/** Detect animated PNG (acTL) / WebP (ANIM/ANMF) from the file header. */
async function isAnimated(file: File): Promise<boolean> {
  if (file.type !== "image/png" && file.type !== "image/webp") return false;
  try {
    const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
    const text = asLatin1(head);
    return file.type === "image/png"
      ? text.includes("acTL")
      : text.includes("ANIM") || text.includes("ANMF");
  } catch {
    return false;
  }
}

/** Read the EXIF Orientation tag (1–8) from a JPEG; 1 for anything else. */
async function readJpegOrientation(file: File): Promise<number> {
  if (file.type !== "image/jpeg") return 1;
  try {
    const view = new DataView(await file.slice(0, 131072).arrayBuffer());
    if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return 1;

    let offset = 2;
    const len = view.byteLength;
    while (offset + 4 <= len) {
      const marker = view.getUint16(offset);
      offset += 2;
      if ((marker & 0xff00) !== 0xff00) break;
      const size = view.getUint16(offset);
      if (marker === 0xffe1) {
        const exif = offset + 2;
        // 'Exif\0\0'
        if (exif + 8 > len || view.getUint32(exif) !== 0x45786966 || view.getUint16(exif + 4) !== 0) {
          return 1;
        }
        const tiff = exif + 6;
        const little = view.getUint16(tiff) === 0x4949;
        const u16 = (o: number) => view.getUint16(o, little);
        const u32 = (o: number) => view.getUint32(o, little);
        if (u16(tiff + 2) !== 0x002a) return 1;
        const ifd0 = tiff + u32(tiff + 4);
        if (ifd0 + 2 > len) return 1;
        const count = u16(ifd0);
        for (let i = 0; i < count; i += 1) {
          const entry = ifd0 + 2 + i * 12;
          if (entry + 12 > len) break;
          if (u16(entry) === 0x0112) {
            const v = u16(entry + 8);
            return v >= 1 && v <= 8 ? v : 1;
          }
        }
        return 1;
      }
      offset += size;
    }
  } catch {
    return 1;
  }
  return 1;
}

async function decode(file: File): Promise<ImageBitmap | null> {
  if (typeof createImageBitmap !== "function") return null;
  try {
    // Force no auto-orientation; we bake EXIF orientation ourselves so behaviour
    // is identical across browsers.
    return await createImageBitmap(file, { imageOrientation: "none" });
  } catch {
    try {
      // Browsers without the options bag default to "none" too, so our manual
      // orientation stays correct.
      return await createImageBitmap(file);
    } catch {
      return null;
    }
  }
}

/** Canvas transform that maps the raw bitmap into an upright, oriented canvas. */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  orientation: number,
  w: number,
  h: number,
): void {
  switch (orientation) {
    case 2: ctx.setTransform(-1, 0, 0, 1, w, 0); break;
    case 3: ctx.setTransform(-1, 0, 0, -1, w, h); break;
    case 4: ctx.setTransform(1, 0, 0, -1, 0, h); break;
    case 5: ctx.setTransform(0, 1, 1, 0, 0, 0); break;
    case 6: ctx.setTransform(0, 1, -1, 0, w, 0); break;
    case 7: ctx.setTransform(0, -1, -1, 0, w, h); break;
    case 8: ctx.setTransform(0, -1, 1, 0, 0, h); break;
    default: ctx.setTransform(1, 0, 0, 1, 0, 0); break;
  }
}

export async function compressImageFile(
  file: File,
  options: ClientCompressOptions = {},
): Promise<File> {
  const opts = { ...DEFAULTS, ...options };

  if (
    typeof document === "undefined" ||
    typeof HTMLCanvasElement === "undefined" ||
    !RECODABLE.has(file.type)
  ) {
    return file;
  }

  // Never re-encode animation — it would be flattened to one frame.
  if (await isAnimated(file)) return file;

  const orientation = await readJpegOrientation(file);
  const bitmap = await decode(file);
  if (!bitmap) return file;

  try {
    const { width: bw, height: bh } = bitmap;
    const swap = orientation >= 5 && orientation <= 8;
    const dispLongest = Math.max(bw, bh); // longest edge is orientation-invariant
    const oversized = dispLongest > opts.maxEdge;

    // Nothing to gain: within bounds and small. The original keeps its EXIF, so
    // the server will orient it correctly.
    if (!oversized && file.size < opts.sizeThreshold) {
      bitmap.close?.();
      return file;
    }

    const scale = oversized ? opts.maxEdge / dispLongest : 1;
    const sw = Math.max(1, Math.round(bw * scale));
    const sh = Math.max(1, Math.round(bh * scale));
    const targetW = swap ? sh : sw;
    const targetH = swap ? sw : sh;

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close?.();
      return file;
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    applyOrientation(ctx, orientation, targetW, targetH);
    ctx.drawImage(bitmap, 0, 0, sw, sh);
    bitmap.close?.();

    const quality = file.type === "image/webp" ? opts.webpQuality : opts.jpegQuality;
    const blob = await new Promise<Blob | null>((resolve) => {
      // PNG ignores the quality arg and stays lossless.
      canvas.toBlob((b) => resolve(b), file.type, quality);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    return new File([blob], file.name, {
      type: file.type,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
