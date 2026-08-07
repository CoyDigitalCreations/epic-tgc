interface EtherHexagonProps {
  value: number
  /** Ancho en px */
  size?: number
}

/**
 * Hexágono de Éter central para cartas de tipo Éter.
 * Usa el asset public/eter_solo.png (369x438) escalado a `size` px de ancho,
 * con el valor numérico centrado y sin decoraciones.
 */
export function EtherHexagon({ value, size = 90 }: EtherHexagonProps) {
  // Proporción real de public/eter_solo.png (369x438)
  const height = size * (438 / 369)
  return (
    <div
      style={{
        width: size,
        height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0px 2px 6px rgba(0, 0, 0, 0.8))',
      }}
    >
      <img
        src="/eter_solo.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          userSelect: 'none',
        }}
      />
      <span
        style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: '"Cinzel", serif',
          fontSize: size * 0.5,
          fontWeight: 900,
          color: '#ffffff',
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
        }}
      >
        {value}
      </span>
    </div>
  )
}
