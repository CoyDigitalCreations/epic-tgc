import { type CSSProperties, type ReactNode } from 'react'

interface TextScrollProps {
  children: ReactNode
  style?: CSSProperties
}

export function TextScroll({ children, style }: TextScrollProps) {
  return (
    <div
      style={{
        ...style,
        position: 'absolute',
        background: '#e2dbc1', // color base de la carta
        border: '1px solid #a38258',
        borderRadius: 8,
        padding: '16px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        gap: 10,
        boxShadow: '0 4px 8px rgba(0,0,0,0.4)',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {/* Remaches de las esquinas */}
      <div style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: '50%', background: '#b49969', border: '1px solid #7c6240' }} />
      <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#b49969', border: '1px solid #7c6240' }} />
      
      {/* Líneas divisorias tenues */}
      <div style={{ position: 'absolute', top: 20, left: 16, right: 16, height: 1, background: 'rgba(163, 130, 88, 0.2)' }} />
      <div style={{ position: 'absolute', bottom: 20, left: 16, right: 16, height: 1, background: 'rgba(163, 130, 88, 0.2)' }} />

      {/* Contenido */}
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 10, height: '100%', paddingTop: 4 }}>
        {children}
      </div>
    </div>
  )
}
