/**
 * OffscreenCanvas-based thumbnail generator. Takes an image blob and
 * downscales it to a target maximum width (preserving aspect ratio),
 * encoding the result as JPEG. Works on the main thread or inside a
 * Worker since OffscreenCanvas is available in both.
 */
export async function generateThumbnail(
  blob: Blob,
  maxWidth = 256,
  quality = 0.82,
): Promise<Blob> {
  if (typeof createImageBitmap !== "function") {
    throw new Error("createImageBitmap is not available in this environment");
  }
  if (typeof OffscreenCanvas === "undefined") {
    throw new Error("OffscreenCanvas is not available in this environment");
  }

  const bitmap = await createImageBitmap(blob);
  try {
    const ratio = bitmap.height / bitmap.width;
    const targetWidth = Math.min(maxWidth, bitmap.width);
    const targetHeight = Math.max(1, Math.round(targetWidth * ratio));

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to acquire 2d context for OffscreenCanvas");
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    return await canvas.convertToBlob({ type: "image/jpeg", quality });
  } finally {
    bitmap.close();
  }
}
