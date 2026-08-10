interface CardFrameProps {
  accent: string
  rarityColor: string
  variant: string
}

const W = 744
const H = 1038

/** Hash determinístico (djb2): deriva el patrón de runas de cada variante */
function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0
  }
  return h >>> 0
}

/** PRNG determinístico (mulberry32) — nunca usa Math.random */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

interface Runa {
  points: string
  fill: string
}

/** Patrón rúnico del marco: determinístico por variante (misma variante → mismas runas) */
function generarRunas(variant: string, accent: string, rarityColor: string): Runa[] {
  const rand = mulberry32(hashStr(variant))
  const runas: Runa[] = []
  const n = 12
  const x0 = 21
  const y0 = 21
  const x1 = W - 21
  const y1 = H - 21

  for (let i = 0; i < n; i++) {
    // Posición sobre el perímetro del borde interior
    const lado = Math.floor(rand() * 4)
    const t = 0.08 + rand() * 0.84
    let cx: number
    let cy: number
    let rot: number
    if (lado === 0) {
      cx = x0 + (x1 - x0) * t
      cy = y0
      rot = 0
    } else if (lado === 1) {
      cx = x1
      cy = y0 + (y1 - y0) * t
      rot = Math.PI / 2
    } else if (lado === 2) {
      cx = x0 + (x1 - x0) * t
      cy = y1
      rot = Math.PI
    } else {
      cx = x0
      cy = y0 + (y1 - y0) * t
      rot = -Math.PI / 2
    }

    // Tamaño y orientación de la runa (derivados del hash)
    const s = 3.5 + rand() * 3
    const dx = s * 0.6
    const dy = s * 1.4
    const cos = Math.cos(rot)
    const sin = Math.sin(rot)
    const pts = [
      [0, -dy],
      [dx, 0],
      [0, dy],
      [-dx, 0],
    ].map(([px, py]) => {
      const rx = cx + (px * cos - py * sin)
      const ry = cy + (px * sin + py * cos)
      return `${rx.toFixed(1)},${ry.toFixed(1)}`
    })

    runas.push({
      points: pts.join(' '),
      fill: rand() > 0.5 ? accent : rarityColor,
    })
  }
  return runas
}

export function CardFrame({ accent, rarityColor, variant }: CardFrameProps) {
  const runas = generarRunas(variant, accent, rarityColor)
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}
    >
      {/* Outer border */}
      <rect x="4" y="4" width={W - 8} height={H - 8} rx="24" fill="none" stroke={accent} strokeWidth="4" />

      {/* Mid border */}
      <rect x="10" y="10" width={W - 20} height={H - 20} rx="20" fill="none" stroke={accent} strokeWidth="1" opacity="0.55" />

      {/* Inner border */}
      <rect x="16" y="16" width={W - 32} height={H - 32} rx="16" fill="none" stroke={accent} strokeWidth="2" />

      {/* Corner filigree (volutas) */}
      <path d="M 0 20 C 0 8, 8 0, 20 0" transform="translate(16 16)" fill="none" stroke={accent} strokeWidth="2" />
      <path d="M 0 20 C 0 8, 8 0, 20 0" transform={`translate(${W - 16} 16) rotate(90)`} fill="none" stroke={accent} strokeWidth="2" />
      <path d="M 0 20 C 0 8, 8 0, 20 0" transform={`translate(${W - 16} ${H - 16}) rotate(180)`} fill="none" stroke={accent} strokeWidth="2" />
      <path d="M 0 20 C 0 8, 8 0, 20 0" transform={`translate(16 ${H - 16}) rotate(270)`} fill="none" stroke={accent} strokeWidth="2" />

      {/* Small diamonds on the inner border (cardinal points) */}
      <polygon points={`${W/2},10 ${W/2+4},16 ${W/2},22 ${W/2-4},16`} fill={accent} />
      <polygon points={`${W/2},${H-22} ${W/2+4},${H-16} ${W/2},${H-10} ${W/2-4},${H-16}`} fill={accent} />
      <polygon points={`10,${H/2} 16,${H/2-4} 22,${H/2} 16,${H/2+4}`} fill={accent} />
      <polygon points={`${W-22},${H/2} ${W-16},${H/2-4} ${W-10},${H/2} ${W-16},${H/2+4}`} fill={accent} />

      {/* Rune pattern (deterministic per variant) */}
      {runas.map((r, i) => (
        <polygon key={i} points={r.points} fill={r.fill} opacity="0.85" />
      ))}
    </svg>
  )
}
