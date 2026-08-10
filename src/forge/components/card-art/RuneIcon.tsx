import type { Faccion } from '../../../shared/types'
import { FACCION_RUNES } from '../../../shared/types'

interface RuneIconProps {
  faccion: Faccion
  /** Tamaño en px del SVG (viewBox 24x24) */
  size?: number
  /** Color del trazo de la runa */
  color?: string
  strokeWidth?: number
}

/** Glifo rúnico de una facción (paths en FACCION_RUNES, types/enums.ts) */
export function RuneIcon({
  faccion,
  size = 24,
  color = '#ffffff',
  strokeWidth = 2,
}: RuneIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-testid={`rune-${faccion}`}
    >
      <path d={FACCION_RUNES[faccion]} />
    </svg>
  )
}
