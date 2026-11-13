/** Utilidades de color para el arte dibujado en código (SVG): derivar los tonos de un esmalte a partir del color de la facción. */

/** `#rrggbb` → [matiz 0-360, saturación 0-100, luminosidad 0-100]. Un valor no válido devuelve un gris. */
export function hexAHsl(hex: string): [number, number, number] {
  const limpio = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return [0, 0, 50]
  const r = parseInt(limpio.slice(0, 2), 16) / 255
  const g = parseInt(limpio.slice(2, 4), 16) / 255
  const b = parseInt(limpio.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  const d = max - min
  if (d === 0) return [0, 0, l * 100]
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0)
  else if (max === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return [h * 60, s * 100, l * 100]
}

export const hsl = (h: number, s: number, l: number): string =>
  `hsl(${h.toFixed(0)} ${s.toFixed(0)}% ${Math.max(0, Math.min(100, l)).toFixed(0)}%)`

/** Tonos del esmalte de un medallón: más oscuro y apagado que el color de la facción, como el esmalte del original. */
export function tonosEsmalte(color: string) {
  const [h, s, l] = hexAHsl(color)
  const sat = Math.min(s, 62)
  const base = l > 78 ? 66 : l * 0.52
  return {
    claro: hsl(h, sat, base + 7),
    medio: hsl(h, sat, base),
    oscuro: hsl(h, sat, base * 0.62),
    anillo: hsl(h, sat, Math.min(base + 28, 90)),
  }
}

/** Un id válido para `url(#…)` a partir de `useId()` (que trae `:`). */
export const idSvg = (id: string): string => id.replace(/[^a-zA-Z0-9_-]/g, '')
