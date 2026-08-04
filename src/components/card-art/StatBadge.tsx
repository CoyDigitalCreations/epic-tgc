interface StatBadgeProps {
  kind: 'atk' | 'res'
  value: number
}

/**
 * Medallón de estadística de combate (solo Campeón):
 * ATK (naranja, hacha) a la izquierda y RES (cian, escudo) a la derecha.
 */
export function StatBadge({ kind, value }: StatBadgeProps) {
  const isAtk = kind === 'atk'

  const plateBg = isAtk
    ? 'linear-gradient(180deg, #3a2218 0%, #1c0e08 100%)'
    : 'linear-gradient(180deg, #0f2942 0%, #081420 100%)'
  const plateBorder = isAtk ? '#b45309' : '#0284c7'
  const glow = isAtk ? '0 0 10px rgba(180, 83, 9, 0.4)' : '0 0 10px rgba(2, 132, 199, 0.4)'
  const iconBg = isAtk
    ? 'radial-gradient(circle, #ea580c 0%, #7c2d12 100%)'
    : 'radial-gradient(circle, #0284c7 0%, #0c4a6e 100%)'
  const iconBorder = isAtk ? '#fef08a' : '#bae6fd'
  const labelColor = isAtk ? '#f97316' : '#38bdf8'

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: plateBg,
        border: `3px solid ${plateBorder}`,
        borderRadius: 45,
        padding: isAtk ? '5px 27px 5px 9px' : '5px 9px 5px 27px',
        boxShadow: `0 9px 18px rgba(0,0,0,0.8), ${glow}`,
      }}
    >
      {isAtk ? (
        <>
          {/* Ícono Círculo Hacha */}
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: '50%',
              background: iconBg,
              border: `3px solid ${iconBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              boxShadow: '0 3px 6px rgba(0,0,0,0.5)',
            }}
          >
            <svg viewBox="0 0 24 24" width="39" height="39" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
              <path d="M13 19l6-6" />
              <path d="M16 16l4 4" />
              <path d="M19 21l2-2" />
            </svg>
          </div>

          {/* Valor Numérico y Etiqueta ATK */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
            <span
              style={{
                fontFamily: '"Cinzel", serif',
                fontSize: 42,
                fontWeight: 900,
                color: '#ffffff',
                textShadow: '0 3px 6px rgba(0,0,0,0.9)',
              }}
            >
              {value}
            </span>
            <span
              style={{
                fontFamily: '"Cinzel", serif',
                fontSize: 18,
                fontWeight: 800,
                color: labelColor,
                letterSpacing: '1.5px',
              }}
            >
              ATQ
            </span>
          </div>
        </>
      ) : (
        <>
          {/* Valor Numérico y Etiqueta DEF */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginRight: 12 }}>
            <span
              style={{
                fontFamily: '"Cinzel", serif',
                fontSize: 18,
                fontWeight: 800,
                color: labelColor,
                letterSpacing: '1.5px',
              }}
            >
              RES
            </span>
            <span
              style={{
                fontFamily: '"Cinzel", serif',
                fontSize: 42,
                fontWeight: 900,
                color: '#ffffff',
                textShadow: '0 3px 6px rgba(0,0,0,0.9)',
              }}
            >
              {value}
            </span>
          </div>

          {/* Ícono Círculo Escudo */}
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: '50%',
              background: iconBg,
              border: `3px solid ${iconBorder}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 3px 6px rgba(0,0,0,0.5)',
            }}
          >
            <svg viewBox="0 0 24 24" width="39" height="39" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.15)" />
            </svg>
          </div>
        </>
      )}
    </div>
  )
}
