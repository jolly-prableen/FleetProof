export const MAX_BYTES = 300 * 1024;

const toBlob = (c: HTMLCanvasElement, q: number) =>
  new Promise<Blob | null>((res) => c.toBlob(res, "image/jpeg", q));

/**
 * Shrink a camera photo to a JPEG under 300 KB while keeping text legible.
 * Tries larger sizes first and steps down only as far as needed.
 */
export async function compressImage(file: Blob, maxBytes = MAX_BYTES): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  for (const maxSide of [1600, 1400, 1200, 1000, 900]) {
    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    for (const q of [0.8, 0.7, 0.6, 0.5, 0.4]) {
      const blob = await toBlob(canvas, q);
      if (blob && blob.size <= maxBytes) {
        bmp.close();
        return blob;
      }
    }
  }
  bmp.close();
  throw new Error("Could not make the photo small enough");
}
