import { useId } from 'react'
import { hashStr, mulberry32 } from '../../../shared/rng'

interface CardFrameProps {
  accent: string
  rarityColor: string
  variant: string
}

const W = 744
const H = 1038
/** Distancia del contorno interior (achaflanado) al borde de la carta */
const INSET = 19
/** Lado del chaflán de las esquinas del contorno interior */
const CHAFLAN = 24

interface Runa {
  points: string
  fill: string
}

/** Mezcla un color #rgb / #rrggbb con blanco (t > 0) o con negro (t < 0). Si no es hex, lo devuelve igual. */
function tono(color: string, t: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!m) return color
  const hex = m[1].length === 3 ? m[1].replace(/(.)/g, '$1$1') : m[1]
  const base = t >= 0 ? 255 : 0
  const k = Math.abs(t)
  const canal = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16)
    return Math.round(v + (base - v) * k)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${canal(0)}${canal(2)}${canal(4)}`
}

/** Patrón rúnico del marco: determinístico por variante (misma variante → mismas runas) */
function generarRunas(variant: string, accent: string, rarityColor: string): Runa[] {
  const rand = mulberry32(hashStr(variant))
  const runas: Runa[] = []
  const n = 12
  const x0 = INSET
  const y0 = INSET
  const x1 = W - INSET
  const y1 = H - INSET

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

/** Contorno de esquinas achaflanadas a `d` px del borde, con chaflán de lado `c`. */
function contorno(d: number, c: number): string {
  const x1 = W - d
  const y1 = H - d
  return `M ${d + c} ${d} L ${x1 - c} ${d} L ${x1} ${d + c} L ${x1} ${y1 - c} L ${x1 - c} ${y1} L ${d + c} ${y1} L ${d} ${y1 - c} L ${d} ${d + c} Z`
}

/** Una esquina del marco, en coordenadas locales (origen = vértice virtual del contorno interior). */
function Esquina({ transform, metal, luz, acento }: { transform: string; metal: string; luz: string; acento: string }) {
  return (
    <g transform={transform}>
      {/* Escuadra gruesa que abraza el chaflán y se alarga por los dos bordes */}
      <path d="M 0 74 L 0 31 L 31 0 L 74 0" fill="none" stroke={metal} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Filo de luz paralelo a la escuadra */}
      <path d="M 6 58 L 6 34 L 34 6 L 58 6" fill="none" stroke={luz} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.65" />
      {/* Remates en voluta de los extremos */}
      <path d="M 74 0 Q 88 0 90 11" fill="none" stroke={metal} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M 0 74 Q 0 88 11 90" fill="none" stroke={metal} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="90" cy="14" r="2.6" fill={luz} />
      <circle cx="14" cy="90" r="2.6" fill={luz} />
      {/* Espina diagonal hacia el interior de la carta */}
      <path d="M 16 16 L 40 40" fill="none" stroke={metal} strokeWidth="3" strokeLinecap="round" />
      <polygon points="42,33 51,42 42,51 33,42" fill={acento} stroke={luz} strokeWidth="1.2" />
      {/* Gema del chaflán */}
      <polygon points="11,3 19,11 11,19 3,11" fill={luz} stroke={metal} strokeWidth="1.3" />
    </g>
  )
}

export function CardFrame({ accent, rarityColor, variant }: CardFrameProps) {
  const runas = generarRunas(variant, accent, rarityColor)
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const idMetal = `metal${uid}`
  const idMetalInv = `metalInv${uid}`

  // Todos los tonos derivan del color del tipo de carta (los colores del marco no cambian)
  const luz = tono(accent, 0.3)
  const brillo = tono(accent, 0.15)
  const sombra = tono(accent, -0.4)
  const metal = `url(#${idMetal})`
  const cx = W / 2
  const cy = H / 2

  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}
    >
      <defs>
        {/* Metal: brillo → color → sombra → color → brillo, en diagonal */}
        <linearGradient id={idMetal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={luz} />
          <stop offset="22%" stopColor={accent} />
          <stop offset="50%" stopColor={sombra} />
          <stop offset="78%" stopColor={accent} />
          <stop offset="100%" stopColor={luz} />
        </linearGradient>
        <linearGradient id={idMetalInv} x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={brillo} />
          <stop offset="50%" stopColor={accent} />
          <stop offset="100%" stopColor={brillo} />
        </linearGradient>
      </defs>

      {/* Resplandor exterior (el color del tipo, muy suave) */}
      <rect x="2" y="2" width={W - 4} height={H - 4} rx="26" fill="none" stroke={accent} strokeWidth="9" opacity="0.14" />

      {/* Banda exterior metálica sólida, con filo oscuro de definición */}
      <rect x="5.5" y="5.5" width={W - 11} height={H - 11} rx="23" fill="none" stroke={metal} strokeWidth="8" />
      <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="27" fill="none" stroke="#000" strokeWidth="1" opacity="0.6" />

      {/* Hilo de luz entre la banda y el contorno interior */}
      <rect x="11.5" y="11.5" width={W - 23} height={H - 23} rx="19" fill="none" stroke={luz} strokeWidth="0.9" opacity="0.7" />

      {/* Contorno interior de esquinas achaflanadas: sombra, metal y filo de luz (bisel) */}
      <path d={contorno(INSET + 0.5, CHAFLAN)} fill="none" stroke="#000" strokeWidth="6" opacity="0.42" strokeLinejoin="round" />
      <path d={contorno(INSET, CHAFLAN)} fill="none" stroke={`url(#${idMetalInv})`} strokeWidth="3" strokeLinejoin="round" />
      <path d={contorno(INSET + 4, CHAFLAN - 2)} fill="none" stroke={luz} strokeWidth="0.8" opacity="0.4" strokeLinejoin="round" />

      {/* Escuadras, espinas y gemas de las cuatro esquinas */}
      <Esquina transform={`translate(${INSET} ${INSET})`} metal={metal} luz={luz} acento={accent} />
      <Esquina transform={`translate(${W - INSET} ${INSET}) scale(-1 1)`} metal={metal} luz={luz} acento={accent} />
      <Esquina transform={`translate(${W - INSET} ${H - INSET}) scale(-1 -1)`} metal={metal} luz={luz} acento={accent} />
      <Esquina transform={`translate(${INSET} ${H - INSET}) scale(1 -1)`} metal={metal} luz={luz} acento={accent} />

      {/* Remates de los centros superior e inferior: rombo alto con alas y flechas */}
      {[INSET, H - INSET].map((y, i) => {
        const dir = i === 0 ? 1 : -1
        return (
          <g key={y}>
            <path d={`M ${cx - 16} ${y} L ${cx - 104} ${y}`} stroke={luz} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            <path d={`M ${cx + 16} ${y} L ${cx + 104} ${y}`} stroke={luz} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            <path d={`M ${cx - 16} ${y + 5 * dir} L ${cx - 72} ${y + 5 * dir}`} stroke={accent} strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
            <path d={`M ${cx + 16} ${y + 5 * dir} L ${cx + 72} ${y + 5 * dir}`} stroke={accent} strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
            {/* Puntas de flecha hacia afuera y rombos menores */}
            <polygon points={`${cx - 104},${y - 4} ${cx - 116},${y} ${cx - 104},${y + 4}`} fill={luz} />
            <polygon points={`${cx + 104},${y - 4} ${cx + 116},${y} ${cx + 104},${y + 4}`} fill={luz} />
            <polygon points={`${cx - 46},${y - 5} ${cx - 41},${y} ${cx - 46},${y + 5} ${cx - 51},${y}`} fill={accent} stroke={luz} strokeWidth="0.9" />
            <polygon points={`${cx + 46},${y - 5} ${cx + 51},${y} ${cx + 46},${y + 5} ${cx + 41},${y}`} fill={accent} stroke={luz} strokeWidth="0.9" />
            {/* Rombo central alto */}
            <polygon points={`${cx},${y - 14} ${cx + 12},${y} ${cx},${y + 14} ${cx - 12},${y}`} fill={accent} stroke={luz} strokeWidth="1.5" />
            <polygon points={`${cx},${y - 6} ${cx + 5},${y} ${cx},${y + 6} ${cx - 5},${y}`} fill={luz} />
          </g>
        )
      })}

      {/* Remates laterales: gema del color de la rareza entre dos rombos menores */}
      {[INSET, W - INSET].map((x, i) => {
        const dir = i === 0 ? 1 : -1
        return (
          <g key={x}>
            <path d={`M ${x} ${cy - 22} L ${x} ${cy - 84}`} stroke={luz} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            <path d={`M ${x} ${cy + 22} L ${x} ${cy + 84}`} stroke={luz} strokeWidth="1.8" strokeLinecap="round" opacity="0.9" />
            <path d={`M ${x + 5 * dir} ${cy - 22} L ${x + 5 * dir} ${cy - 56}`} stroke={accent} strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
            <path d={`M ${x + 5 * dir} ${cy + 22} L ${x + 5 * dir} ${cy + 56}`} stroke={accent} strokeWidth="1.1" strokeLinecap="round" opacity="0.75" />
            <polygon points={`${x},${cy - 52} ${x + 5},${cy - 47} ${x},${cy - 42} ${x - 5},${cy - 47}`} fill={accent} stroke={luz} strokeWidth="0.9" />
            <polygon points={`${x},${cy + 42} ${x + 5},${cy + 47} ${x},${cy + 52} ${x - 5},${cy + 47}`} fill={accent} stroke={luz} strokeWidth="0.9" />
            <polygon points={`${x - 11},${cy} ${x},${cy - 22} ${x + 11},${cy} ${x},${cy + 22}`} fill={rarityColor} stroke={luz} strokeWidth="1.5" />
            <polygon points={`${x - 4},${cy} ${x},${cy - 9} ${x + 4},${cy} ${x},${cy + 9}`} fill="#fff" opacity="0.4" />
          </g>
        )
      })}

      {/* Rune pattern (deterministic per variant) */}
      {runas.map((r, i) => (
        <polygon key={i} points={r.points} fill={r.fill} opacity="0.85" />
      ))}
    </svg>
  )
}
