import { useId, useMemo } from 'react'
import { rankingReferencia } from '../referencia'
import { useReferencia, type Referencia } from '../useReferencia'
import { num } from '../vistas/formato'
import { TablaAlternativa } from './TablaAlternativa'

export const ETIQUETA_REFERENCIA = 'Referencia (no publicadas)'

/**
 * Interruptor opcional para comparar contra el paquete de pruebas. Está apagado por defecto y el
 * paquete se carga con import dinámico solo al activarlo. Estas cartas viven aquí y en ningún otro
 * lado: no entran en métricas, promedios, pool de letalidad, ajustes ni exportación.
 * Acepta el estado levantado (`referencia`) para compartirlo con otras vistas; sin él usa el suyo.
 */
export function PanelReferencia({ referencia }: { referencia?: Referencia }) {
  const id = useId()
  const propia = useReferencia()
  const { activa, setActiva, estado, cartas } = referencia ?? propia
  const filas = useMemo(() => rankingReferencia(cartas), [cartas])

  return (
    <section aria-labelledby={id} className="rounded-2xl border border-card-border bg-surface p-4">
      <label className="flex cursor-pointer items-center gap-3">
        <input
          type="checkbox"
          role="switch"
          checked={activa}
          onChange={(e) => setActiva(e.target.checked)}
          className="size-4 accent-ether-400"
        />
        <span id={id} className="text-sm font-semibold text-gray-100">
          Incluir cartas de referencia (paquete de pruebas, no publicado)
        </span>
      </label>
      <p className="mt-2 text-xs text-gray-500">
        Son cartas de prueba para comparar formas de efectos. No cuentan en las métricas, los promedios, la letalidad, los
        ajustes ni la exportación.
      </p>
      {estado === 'error' && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          No se pudieron cargar las cartas de referencia.
        </p>
      )}
      {estado === 'cargando' && (
        <p role="status" className="mt-3 text-sm text-gray-400">
          Cargando cartas de referencia…
        </p>
      )}
      {estado === 'lista' && (
        <TablaAlternativa
          caption="Cartas de referencia ordenadas por índice de poder"
          columnas={['Carta', 'Tipo', 'Coste', 'Índice de poder', 'Origen']}
          filas={filas.map((f) => [f.nombre, f.tipo, String(f.coste), num(f.indice), ETIQUETA_REFERENCIA])}
        />
      )}
    </section>
  )
}
