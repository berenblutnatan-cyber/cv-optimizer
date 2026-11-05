// The CV photo: a small square JPEG kept inside the document as a data URL, so
// versions and exports carry it. Small enough for one editor operation.

export const PHOTO_MAX_CHARS = 22_000;
export const PHOTO_SOURCE_MAX_BYTES = 10 * 1024 * 1024;

/** Only an inline image we made ourselves: never a remote URL (it would load from a third party). */
export function isPhotoDataUrl(v: unknown): v is string {
  return typeof v === "string" && v.length <= PHOTO_MAX_CHARS && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(v);
}

/**
 * Where to cut the square from a w×h picture. Portraits keep the top: a face
 * sits in the upper part of a headshot, so a centred cut would crop the head.
 */
export function squareCrop(w: number, h: number): { sx: number; sy: number; side: number } {
  const side = Math.min(w, h);
  return { sx: Math.round((w - side) / 2), sy: h > w ? Math.round((h - side) * 0.2) : 0, side };
}

/** Browser only: read an image file, cut a square, shrink it until it fits. */
export async function photoFromFile(file: File): Promise<string> {
  if (file.size > PHOTO_SOURCE_MAX_BYTES) throw new Error("too_big");
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("unreadable");
  });
  const { sx, sy, side } = squareCrop(bitmap.width, bitmap.height);
  for (const size of [320, 256, 200, 160]) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) break;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
    for (const q of [0.86, 0.78, 0.7]) {
      const url = canvas.toDataURL("image/jpeg", q);
      if (isPhotoDataUrl(url)) return url;
    }
  }
  throw new Error("unreadable");
}
