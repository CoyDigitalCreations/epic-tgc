interface NamePlateProps {
  name: string
  accent: string
  marginLeft: number
  paddingLeft: number
}

export function NamePlate({ name, marginLeft, paddingLeft }: NamePlateProps) {
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
        paddingLeft,
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
          fontSize: 24,
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
