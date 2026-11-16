import { useId } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { idSvg } from '../../forge/components/card-art/arte-codigo/colores'
import { FACCIONES, FACCION_LORE, FACCION_RUNES } from '../../shared/types'
import { normalizarDorso } from './dorsos'
import type { DorsoId } from './dorsos'

/** Mismo lienzo que la carta (744×1038): el dorso llena su contenedor sin cambiar el tamaño de la carta. */
const W = 744
const H = 1038
const CX = W / 2
const CY = H / 2

/** Monocromo: la paleta de la estrella de siempre (#4b4b7a), en tonos de un solo matiz. */
const TRAZO = '#6a6aa6'
const SUAVE = '#4b4b7a'
const TENUE = '#3b3b5c'
const PATRON = '#363665'

/** Ángulo (grados, en sentido horario desde arriba) de cada punto cardinal del mapa del Eje. */
const ANGULO: Record<string, number> = { Norte: 0, Noreste: 45, Este: 90, Sudeste: 135, Sur: 180, Sudoeste: 225, Oeste: 270, Noroeste: 315 }

const R_ANILLO = 250
const R_MEDALLON = 62
const R_ESTRELLA = 152

const punto = (grados: number, radio: number): [number, number] => {
  const a = (grados * Math.PI) / 180
  return [CX + radio * Math.sin(a), CY - radio * Math.cos(a)]
}
const n = (v: number) => v.toFixed(1)

/** Estrella de cuatro puntas con lados cóncavos (el «✦»): `h` = largo de la punta, `k` = cuánto se ensancha el cuerpo. */
const estrella = (cx: number, cy: number, h: number, k: number) =>
  `M${n(cx)} ${n(cy - h)}Q${n(cx + k)} ${n(cy - k)} ${n(cx + h)} ${n(cy)}Q${n(cx + k)} ${n(cy + k)} ${n(cx)} ${n(cy + h)}` +
  `Q${n(cx - k)} ${n(cy + k)} ${n(cx - h)} ${n(cy)}Q${n(cx - k)} ${n(cy - k)} ${n(cx)} ${n(cy - h)}Z`

/** Las 8 facciones con su posición en el Eje, para el anillo. */
const ANILLO = FACCIONES.map((f) => ({ faccion: f, angulo: ANGULO[FACCION_LORE[f].posicion] ?? 0 }))

/** Los 5 patrones de fondo: baldosas SVG de un solo trazo, tenues para que el emblema mande. */
function patron(tipo: DorsoId, id: string): ReactNode {
  const trazo = { fill: 'none', stroke: PATRON, strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  const escala = 'scale(1.7)'
  switch (tipo) {
    case 1: // Escamas
      return (
        <pattern id={id} width="40" height="20" patternUnits="userSpaceOnUse" patternTransform={escala}>
          {[[0, 0], [40, 0], [20, 10], [0, 20], [40, 20]].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r="20" {...trazo} />
          ))}
        </pattern>
      )
    case 2: // Marea
      return (
        <pattern id={id} width="60" height="24" patternUnits="userSpaceOnUse" patternTransform={escala}>
          <path d="M0 12Q15 0 30 12T60 12" {...trazo} />
        </pattern>
      )
    case 3: // Cielo estrellado
      return (
        <pattern id={id} width="70" height="70" patternUnits="userSpaceOnUse" patternTransform={escala}>
          <path d={estrella(17, 17, 7.5, 1.6)} fill={PATRON} />
          <path d={estrella(52, 52, 5, 1.1)} fill={PATRON} />
          <circle cx="52" cy="17" r="1.3" fill={PATRON} />
          <circle cx="17" cy="52" r="1.3" fill={PATRON} />
        </pattern>
      )
    case 4: // Panal
      return (
        <pattern id={id} width="52" height="90" patternUnits="userSpaceOnUse" patternTransform="scale(1.1)">
          <path d="M26 0L52 15V45L26 60L0 45V15ZM26 60V90" {...trazo} />
        </pattern>
      )
    default: // 0 · Retícula del Eje
      return (
        <pattern id={id} width="40" height="40" patternUnits="userSpaceOnUse" patternTransform={escala}>
          <path d="M0 20L20 0L40 20L20 40Z" {...trazo} />
        </pattern>
      )
  }
}

interface DorsoCartaProps {
  /** Índice del reverso (0-4); cualquier otro valor cae al inicial. */
  id: DorsoId
  style?: CSSProperties
}

/**
 * Reverso de la carta, dibujado en código: un patrón de fondo a elegir y, al centro, la estrella (✦) rodeada por las 8 facciones
 * en círculos, cada una con su runa, todo en un solo color. Es un SVG que llena a su contenedor (que ya fija la proporción de la
 * carta), así que no cambia el tamaño de ninguna carta.
 */
export function DorsoCarta({ id, style }: DorsoCartaProps) {
  const tipo = normalizarDorso(id)
  const p = idSvg(useId())
  const ids = { fondo: `${p}-fondo`, halo: `${p}-halo`, patron: `${p}-patron` }
  const escalaRuna = 66 / 24

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      data-dorso={tipo}
      style={{ display: 'block', width: '100%', height: '100%', ...style }}
    >
      <defs>
        <linearGradient id={ids.fondo} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#14142b" />
          <stop offset="0.6" stopColor="#1e1e3a" />
          <stop offset="1" stopColor="#2a2a4e" />
        </linearGradient>
        <radialGradient id={ids.halo} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#7878c0" stopOpacity="0.28" />
          <stop offset="1" stopColor="#7878c0" stopOpacity="0" />
        </radialGradient>
        {patron(tipo, ids.patron)}
      </defs>

      <rect width={W} height={H} fill={`url(#${ids.fondo})`} />
      <rect width={W} height={H} fill={`url(#${ids.patron})`} />
      {/* El patrón se atenúa detrás del emblema para que el anillo y la estrella se lean */}
      <circle cx={CX} cy={CY} r="345" fill="#14142b" opacity="0.62" />
      <circle cx={CX} cy={CY} r="345" fill={`url(#${ids.halo})`} />

      {/* Marco doble */}
      <rect x="22" y="22" width={W - 44} height={H - 44} rx="26" fill="none" stroke={TENUE} strokeWidth="3" />
      <rect x="38" y="38" width={W - 76} height={H - 76} rx="16" fill="none" stroke={TENUE} strokeOpacity="0.55" strokeWidth="1.6" />

      {/* Anillos y radios que ordenan el emblema */}
      <circle cx={CX} cy={CY} r={R_ANILLO + R_MEDALLON + 10} fill="none" stroke={TENUE} strokeWidth="1.6" strokeOpacity="0.7" />
      <circle cx={CX} cy={CY} r={R_ANILLO} fill="none" stroke={TENUE} strokeWidth="2" strokeDasharray="2 10" strokeLinecap="round" />
      <circle cx={CX} cy={CY} r={R_ESTRELLA} fill="none" stroke={TENUE} strokeWidth="2.4" />
      {ANILLO.map(({ faccion, angulo }) => {
        const [x1, y1] = punto(angulo, R_ESTRELLA)
        const [x2, y2] = punto(angulo, R_ANILLO - R_MEDALLON)
        return <line key={`radio-${faccion}`} x1={n(x1)} y1={n(y1)} x2={n(x2)} y2={n(y2)} stroke={TENUE} strokeWidth="2" />
      })}
      {ANILLO.map(({ faccion, angulo }) => {
        const [x, y] = punto(angulo + 22.5, R_ANILLO)
        return <circle key={`punto-${faccion}`} cx={n(x)} cy={n(y)} r="4.5" fill={SUAVE} />
      })}

      {/* Las 8 facciones: medallón liso y su runa, del mismo color que la estrella */}
      {ANILLO.map(({ faccion, angulo }) => {
        const [x, y] = punto(angulo, R_ANILLO)
        return (
          <g key={faccion} data-faccion={faccion} transform={`translate(${n(x)} ${n(y)})`}>
            <circle r={R_MEDALLON} fill="#16162e" stroke={TRAZO} strokeWidth="4.5" />
            <circle r={R_MEDALLON - 9} fill="none" stroke={SUAVE} strokeWidth="1.8" />
            <g transform={`translate(${n(-12 * escalaRuna)} ${n(-12 * escalaRuna)}) scale(${n(escalaRuna)})`}>
              <path d={FACCION_RUNES[faccion]} fill="none" stroke={TRAZO} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        )
      })}

      {/* La estrella: la de siempre, completada con una segunda más pequeña girada 45° y un núcleo */}
      <g transform={`rotate(45 ${CX} ${CY})`}>
        <path d={estrella(CX, CY, 98, 12)} fill={SUAVE} />
      </g>
      <path d={estrella(CX, CY, 118, 24)} fill={TRAZO} />
      <circle cx={CX} cy={CY} r="9" fill="#16162e" stroke={TRAZO} strokeWidth="2.5" />
    </svg>
  )
}
