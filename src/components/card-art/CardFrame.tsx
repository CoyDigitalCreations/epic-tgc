import { useId } from 'react'

interface CardFrameProps {
  accent: string
  rarityColor: string
  variant: string
}

const W = 744
const H = 1038

export function CardFrame({ accent, rarityColor, variant }: CardFrameProps) {
  return (
    <svg
      width={W}
      height={H}
      viewBox={`0 0 ${W} ${H}`}
      style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}
    >
      {/* Outer border */}
      <rect x="4" y="4" width={W - 8} height={H - 8} rx="24" fill="none" stroke={accent} strokeWidth="4" />
      
      {/* Inner border */}
      <rect x="16" y="16" width={W - 32} height={H - 32} rx="16" fill="none" stroke={accent} strokeWidth="2" />
      
      {/* Small diamonds on the inner border */}
      <polygon points={`${W/2},10 ${W/2+4},16 ${W/2},22 ${W/2-4},16`} fill={accent} />
      <polygon points={`${W/2},${H-22} ${W/2+4},${H-16} ${W/2},${H-10} ${W/2-4},${H-16}`} fill={accent} />
      <polygon points={`10,${H/2} 16,${H/2-4} 22,${H/2} 16,${H/2+4}`} fill={accent} />
      <polygon points={`${W-22},${H/2} ${W-16},${H/2-4} ${W-10},${H/2} ${W-16},${H/2+4}`} fill={accent} />
    </svg>
  )
}

