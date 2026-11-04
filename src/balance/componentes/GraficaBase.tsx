import type { ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'
import { TablaAlternativa, type DatosTabla } from './TablaAlternativa'

interface Props {
  titulo: string
  descripcion: string
  tabla: DatosTabla
  /** Tamaño fijo; si faltan, la gráfica se adapta con ResponsiveContainer. */
  ancho?: number
  alto?: number
  /** Si es false la tabla alternativa queda solo para lectores de pantalla. */
  tablaVisible?: boolean
  children: (ancho?: number, alto?: number) => ReactElement
}

/** Marco común de las gráficas: título, role=img con etiqueta y tabla alternativa. */
export function GraficaBase({ titulo, descripcion, tabla, ancho, alto, tablaVisible = true, children }: Props) {
  const fija = ancho !== undefined && alto !== undefined
  return (
    <section className="rounded-2xl border border-card-border bg-surface p-4">
      <h3 className="font-display text-base font-bold tracking-wider text-ether-200">{titulo}</h3>
      <div role="img" aria-label={`${titulo}. ${descripcion}`} className="mt-2 font-body">
        {fija ? (
          children(ancho, alto)
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            {children()}
          </ResponsiveContainer>
        )}
      </div>
      <TablaAlternativa {...tabla} visible={tablaVisible} />
    </section>
  )
}
