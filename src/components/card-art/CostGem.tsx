interface CostGemProps {
  cost: number
  size?: number
}

export function CostGem({ cost, size = 64 }: CostGemProps) {
  // Proporción real de public/hexagono_eter.png (242x308)
  const height = size * (308 / 242)
  return (
    <div
      style={{
        width: size,
        height,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: 'drop-shadow(0px 2px 4px rgba(0, 0, 0, 0.8))',
      }}
    >
      <img
        src="/hexagono_eter.png"
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
          fontSize: size * 0.55,
          fontWeight: 900,
          color: '#ffffff',
          marginTop: -(size * 0.16),
          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
        }}
      >
        {cost}
      </span>
    </div>
  )
}
