import { Client, Storage } from "node-appwrite";
import { InputFile } from "node-appwrite/file";
import sharp from "sharp";

/**
 * Homiva image compression function ("edge" compression at upload time).
 *
 * Given a { bucketId, fileId } that was just uploaded, this downloads the file,
 * and — if it is an image larger than the target size — re-encodes it to WebP,
 * shrinking quality/dimensions just enough to land at or under ~1MB while
 * preserving as much visual quality as possible. The compressed result replaces
 * the original file under the SAME fileId (and same permissions) so every
 * reference already stored in the database keeps working.
 *
 * The caller must be an authenticated user (execute = users). Storage access
 * uses the dynamic API key Appwrite injects via `x-appwrite-key`.
 */

const TARGET_BYTES = 1024 * 1024; // 1 MB
const MAX_DIMENSION = 2400; // cap very large images before encoding
const QUALITY_STEPS = [82, 74, 66, 58, 50, 42, 36];

function replaceExtension(name, ext) {
  if (!name) return `image.${ext}`;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  return `${base}.${ext}`;
}

/**
 * Encode `input` to WebP, reducing quality and then dimensions until the
 * result is <= TARGET_BYTES. Returns the smallest buffer we could produce.
 */
async function compressToTarget(input, log) {
  const metadata = await sharp(input, { failOn: "none" }).metadata();
  const hasAlpha = Boolean(metadata.hasAlpha);
  const startWidth =
    metadata.width && metadata.width > MAX_DIMENSION
      ? MAX_DIMENSION
      : metadata.width || null;

  const encode = (width, quality) => {
    let pipeline = sharp(input, { failOn: "none" }).rotate();
    if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
    return pipeline
      .webp({ quality, effort: 4, alphaQuality: hasAlpha ? 90 : 100 })
      .toBuffer();
  };

  let best = null;
  for (const quality of QUALITY_STEPS) {
    best = await encode(startWidth, quality);
    if (best.length <= TARGET_BYTES) {
      log(`Compressed at q=${quality}, width=${startWidth ?? "orig"}.`);
      return best;
    }
  }

  // Still too large at lowest quality — progressively shrink dimensions.
  let width = startWidth || metadata.width || MAX_DIMENSION;
  for (let attempt = 0; attempt < 6 && best && best.length > TARGET_BYTES; attempt++) {
    width = Math.max(320, Math.round(width * 0.8));
    best = await encode(width, 45);
  }
  log(`Compressed with dimension reduction to width=${width}.`);
  return best;
}

export default async ({ req, res, log, error }) => {
  const endpoint =
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    process.env.APPWRITE_ENDPOINT ||
    "https://fra.cloud.appwrite.io/v1";
  const projectId =
    process.env.APPWRITE_FUNCTION_PROJECT_ID || process.env.APPWRITE_PROJECT_ID;
  const apiKey = req.headers["x-appwrite-key"] || process.env.APPWRITE_API_KEY;

  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(projectId)
    .setKey(apiKey);
  const storage = new Storage(client);

  const fail = (message, code = 400) =>
    res.json({ ok: false, error: message }, code);

  let body;
  try {
    body = req.bodyJson ?? JSON.parse(req.body || "{}");
  } catch {
    return fail("Invalid request body.");
  }

  const { bucketId, fileId } = body;
  if (!bucketId || !fileId) {
    return fail("bucketId and fileId are required.");
  }

  try {
    const meta = await storage.getFile({ bucketId, fileId });
    const mimeType = meta.mimeType || "";
    const originalSize = meta.sizeOriginal ?? 0;

    // Only compress raster images. Skip SVG/PDF/etc.
    if (!/^image\/(jpeg|png|webp|jpg|tiff|avif|heic|heif)$/i.test(mimeType)) {
      return res.json({ ok: true, skipped: "not-a-raster-image", mimeType });
    }
    if (originalSize > 0 && originalSize <= TARGET_BYTES) {
      return res.json({ ok: true, skipped: "already-small", bytes: originalSize });
    }

    const download = await storage.getFileDownload({ bucketId, fileId });
    const input = Buffer.from(download);

    const compressed = await compressToTarget(input, log);
    if (!compressed) {
      return fail("Compression produced no output.", 500);
    }
    // If we somehow couldn't beat the original, leave the file untouched.
    if (input.length > 0 && compressed.length >= input.length) {
      return res.json({
        ok: true,
        skipped: "no-gain",
        bytesBefore: input.length,
        bytesAfter: compressed.length,
      });
    }

    const permissions = meta.$permissions || [];
    const newName = replaceExtension(meta.name, "webp");

    // Same fileId is reused so existing DB references stay valid.
    await storage.deleteFile({ bucketId, fileId });
    await storage.createFile({
      bucketId,
      fileId,
      file: InputFile.fromBuffer(compressed, newName),
      permissions,
    });

    return res.json({
      ok: true,
      fileId,
      bytesBefore: input.length,
      bytesAfter: compressed.length,
    });
  } catch (e) {
    error(`Compression failed for ${bucketId}/${fileId}: ${e.message}`);
    return fail(e.message || "Compression failed.", 500);
  }
};
