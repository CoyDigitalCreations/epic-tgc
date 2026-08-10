interface NamePlateProps {
  name: string
  accent: string
  marginLeft: number
  paddingLeft: number
  hasHexagon?: boolean
}

export function NamePlate({ name, marginLeft, paddingLeft, hasHexagon }: NamePlateProps) {
  const actualPaddingLeft = hasHexagon ? 120 : paddingLeft;

  const fluidNameSize = (text: string, hasHex: boolean) => {
    const len = (text || '').length
    if (hasHex) {
      if (len <= 15) return 24
      if (len >= 35) return 12
      const t = (len - 15) / (35 - 15)
      return 24 - t * (24 - 12)
    } else {
      if (len <= 22) return 24
      if (len >= 45) return 12
      const t = (len - 22) / (45 - 22)
      return 24 - t * (24 - 12)
    }
  }

  const fontSize = fluidNameSize(name, !!hasHexagon);

  return (
    <div
      style={{
        marginLeft,
        flex: 1,
        height: 80,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        paddingLeft: actualPaddingLeft,
        paddingRight: 16,
      }}
    >
      {/* Cuadro del título — imagen public/titulo_carta.png */}
      <img
        src="/titulo_carta.png"
        alt=""
        draggable={false}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'fill',
          userSelect: 'none',
        }}
      />
      <span
        style={{
          position: 'relative',
          zIndex: 2,
          fontFamily: '"Cinzel", serif',
          fontSize,
          fontWeight: 800,
          color: '#fef08a',
          letterSpacing: '1px',
          textTransform: 'uppercase',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          textShadow: '0 2px 4px rgba(0,0,0,0.9)',
        }}
      >
        {name || 'Sin Nombre'}
      </span>
    </div>
  )
}
