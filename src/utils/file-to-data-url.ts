export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsDataURL(file)
  })
}

/** Max art size — matches the card canvas (744×1038) */
const MAX_W = 744
const MAX_H = 1038

/**
 * Reads a File, downscales it to at most 744×1038 (keeping aspect ratio)
 * and re-encodes it as WebP (fallback JPEG) quality 0.85.
 *
 * Why: a raw PNG/photo can be 1-5MB as base64 — enough to blow the
 * localStorage quota. A compressed card-sized image is ~80-200KB.
 *
 * If the compressed result is LARGER than the source (already tiny image),
 * the original is returned untouched.
 */
export async function fileToCompressedDataUrl(file: File): Promise<string> {
  if (typeof document === 'undefined') return fileToDataUrl(file)
  const original = await fileToDataUrl(file)

  const img = await loadImage(original)
  const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height)
  if (scale >= 1) return original

  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.width * scale))
  canvas.height = Math.max(1, Math.round(img.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return original
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const webp = canvas.toDataURL('image/webp', 0.85)
  const jpeg = canvas.toDataURL('image/jpeg', 0.85)
  const best = webp.length <= jpeg.length ? webp : jpeg

  // Prefer the original if compression didn't help (tiny/edge cases)
  return best.length < original.length ? best : original
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('No se pudo procesar la imagen'))
    img.src = src
  })
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
  return validTypes.includes(file.type)
}
