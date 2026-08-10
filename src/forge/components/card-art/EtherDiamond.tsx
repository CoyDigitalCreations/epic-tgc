import { useId } from 'react'

interface EtherDiamondProps {
  value: number
  /** Ancho en px (cuadrado) */
  size?: number
}

/**
 * Diamante de Éter central con contorno ornamentado: cuerpo dorado,
 * faceta interior, brazos de luz y el valor numérico centrado.
 */
export function EtherDiamond({ value, size = 90 }: EtherDiamondProps) {
  const gid = useId()

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0px 0px 15px rgba(251, 191, 36, 0.8))',
      }}
    >
      <svg viewBox="0 0 100 100" width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        <defs>
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#b45309" />
          </linearGradient>
        </defs>

        {/* Cuerpo del diamante */}
        <polygon
          points="50,2 98,50 50,98 2,50"
          fill={`url(#${gid})`}
          stroke="#fef08a"
          strokeWidth="4"
          strokeLinejoin="round"
        />
        {/* Contorno interior ornamentado */}
        <polygon
          points="50,10 90,50 50,90 10,50"
          fill="none"
          stroke="#fde68a"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Facetas diagonales */}
        <line x1="50" y1="10" x2="50" y2="90" stroke="#fde68a" strokeOpacity="0.3" strokeWidth="1" />
        <line x1="10" y1="50" x2="90" y2="50" stroke="#fde68a" strokeOpacity="0.3" strokeWidth="1" />
        <line x1="24" y1="24" x2="50" y2="50" stroke="#fde68a" strokeOpacity="0.35" strokeWidth="1" />
        <line x1="76" y1="24" x2="50" y2="50" stroke="#fde68a" strokeOpacity="0.35" strokeWidth="1" />
        <line x1="24" y1="76" x2="50" y2="50" stroke="#fde68a" strokeOpacity="0.35" strokeWidth="1" />
        <line x1="76" y1="76" x2="50" y2="50" stroke="#fde68a" strokeOpacity="0.35" strokeWidth="1" />
        {/* Brazos de luz en los vértices */}
        <path d="M50 2 L46 14 L50 10 L54 14 Z" fill="#fff" opacity="0.5" />
        <path d="M98 50 L86 46 L90 50 L86 54 Z" fill="#fff" opacity="0.5" />
        <path d="M50 98 L46 86 L50 90 L54 86 Z" fill="#fff" opacity="0.5" />
        <path d="M2 50 L14 46 L10 50 L14 54 Z" fill="#fff" opacity="0.5" />
      </svg>
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          width: '100%',
          height: '100%',
        }}
      >
        {/* Estrella decorativa flotando sobre el vértice superior (corona) */}
        <span
          style={{
            position: 'absolute',
            top: '-6%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: '"Cinzel", serif',
            fontSize: size * 0.12,
            fontWeight: 900,
            color: '#fef08a',
            textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.8)',
          }}
        >
          ✦
        </span>
        {/* Número — borde superior pegado al tope del contenedor, centrado horizontalmente */}
        <span
          style={{
            position: 'absolute',
            top: '0%',
            left: '50%',
            transform: 'translateX(-50%)',
            fontFamily: '"Cinzel", serif',
            fontSize: size * 0.49,
            fontWeight: 900,
            color: '#ffffff',
            textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.8)',
          }}
        >
          {value}
        </span>
      </div>
    </div>
  )
}
