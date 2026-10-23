import { type CSSProperties, type ReactNode } from 'react'

interface TextScrollProps {
  children: ReactNode
  /** Cabecera fija pegada al borde superior del pergamino (palabras clave). */
  header?: ReactNode
  /** Pie del pergamino (texto de sabor). Va separado del efecto por una cenefa. */
  footer?: ReactNode
  style?: CSSProperties
}

/** Cenefa: línea fina con un rombo al centro. */
function Cenefa() {
  return (
    <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', opacity: 0.85 }}>
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, #a38258)' }} />
      <span style={{ width: 8, height: 8, transform: 'rotate(45deg)', background: '#a38258', boxShadow: '0 0 0 2px #e2dbc1, 0 0 0 3px #a38258' }} />
      <span style={{ flex: 1, height: 1, background: 'linear-gradient(270deg, transparent, #a38258)' }} />
    </div>
  )
}

export function TextScroll({ children, header, footer, style }: TextScrollProps) {
  return (
    <div
      style={{
        ...style,
        position: 'absolute',
        background: 'radial-gradient(ellipse at 50% 35%, #ebe4cb 0%, #e2dbc1 55%, #d6cdae 100%)',
        border: '1px solid #a38258',
        borderRadius: 8,
        padding: '12px 26px 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 0 22px rgba(120, 90, 50, 0.22)',
        zIndex: 10,
        overflow: 'hidden',
      }}
    >
      {/* Remaches de las esquinas */}
      <div style={{ position: 'absolute', top: 6, left: 6, width: 8, height: 8, borderRadius: '50%', background: '#b49969', border: '1px solid #7c6240' }} />
      <div style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, borderRadius: '50%', background: '#b49969', border: '1px solid #7c6240' }} />

      {/* Cabecera: pegada arriba para no desperdiciar el espacio sobre las keywords */}
      {header && <div style={{ position: 'relative', flex: '0 0 auto', marginTop: 2 }}>{header}</div>}

      {/* Efecto: ocupa el espacio disponible; pegado a las keywords si hay, centrado si no */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: header ? 'flex-start' : 'center',
          paddingTop: header ? 10 : 0,
          gap: 8,
        }}
      >
        {children}
      </div>

      {/* Pie: cenefa + texto de sabor. Reserva el alto de los badges de ATQ/RES de las esquinas. */}
      <div
        style={{
          position: 'relative',
          flex: '0 0 auto',
          height: 92,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          paddingTop: 6,
        }}
      >
        <Cenefa />
        {footer}
      </div>
    </div>
  )
}
