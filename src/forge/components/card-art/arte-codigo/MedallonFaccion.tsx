import { useId, type CSSProperties } from 'react'
import { FiltrosMetal } from './FiltrosMetal'
import { idSvg, tonosEsmalte } from './colores'

interface MedallonFaccionProps {
  /** Color de la facción (`FACCION_COLORS`): se convierte en el esmalte del medallón. */
  color: string
  /** Nombre accesible (la facción). Sin él, el medallón es decorativo. */
  nombre?: string
  size?: number
  style?: CSSProperties
}

/**
 * Medallón de facción dibujado en código: borde de acero desgastado, esmalte moteado del color de la facción y un
 * anillo fino interior. Sustituye a public/facciones_*.png; cualquier color funciona sin generar una imagen nueva.
 */
export function MedallonFaccion({ color, nombre, size, style }: MedallonFaccionProps) {
  const p = idSvg(useId())
  const t = tonosEsmalte(color)
  return (
    <svg
      viewBox="0 0 114 114"
      width={size}
      height={size}
      role={nombre ? 'img' : undefined}
      aria-label={nombre}
      aria-hidden={nombre ? undefined : true}
      data-arte="medallon-faccion"
      style={{ display: 'block', ...style }}
    >
      <defs>
        <FiltrosMetal p={p} />
        <linearGradient id={`${p}-borde`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d9d6cf" />
          <stop offset="0.5" stopColor="#8f8d87" />
          <stop offset="1" stopColor="#5b5a56" />
        </linearGradient>
        <radialGradient id={`${p}-esmalte-g`} cx="0.42" cy="0.38" r="0.75">
          <stop offset="0" stopColor={t.claro} />
          <stop offset="0.65" stopColor={t.medio} />
          <stop offset="1" stopColor={t.oscuro} />
        </radialGradient>
        <filter id={`${p}-mancha`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.16" numOctaves="4" seed="11" />
          <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1.6 0 0 0 -0.55" />
        </filter>
        <filter id={`${p}-claro`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.3" numOctaves="3" seed="4" />
          <feColorMatrix type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 1.7 0 0 -0.75" />
        </filter>
        <clipPath id={`${p}-disco`}>
          <circle cx="57" cy="57" r="50" />
        </clipPath>
        <clipPath id={`${p}-aro`}>
          <circle cx="57" cy="57" r="56" />
        </clipPath>
      </defs>
      <g filter={`url(#${p}-metal)`}>
        <circle cx="57" cy="57" r="55.5" fill={`url(#${p}-borde)`} />
      </g>
      <circle cx="57" cy="57" r="50.8" fill="#1d1c1a" />
      <g filter={`url(#${p}-esmalte)`}>
        <circle cx="57" cy="57" r="49.5" fill={`url(#${p}-esmalte-g)`} />
      </g>
      <g clipPath={`url(#${p}-disco)`}>
        <rect width="114" height="114" filter={`url(#${p}-mancha)`} opacity="0.22" />
        <rect width="114" height="114" filter={`url(#${p}-claro)`} opacity="0.14" />
        <rect width="114" height="114" filter={`url(#${p}-grano)`} opacity="0.3" />
      </g>
      <circle cx="57" cy="57" r="46" fill="none" stroke={t.anillo} strokeOpacity="0.5" strokeWidth="0.9" />
    </svg>
  )
}
