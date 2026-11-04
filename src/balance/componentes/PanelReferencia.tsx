import { useEffect, useId, useState } from 'react'
import type { AnyCard } from '../../shared/types'
import { cargarReferencia, rankingReferencia, type FilaRanking } from '../referencia'
import { num } from '../vistas/formato'
import { TablaAlternativa } from './TablaAlternativa'

export const ETIQUETA_REFERENCIA = 'Referencia (no publicadas)'

/**
 * Interruptor opcional para comparar contra el paquete de pruebas. Está apagado por defecto y el
 * paquete se carga con import dinámico solo al activarlo. Estas cartas viven aquí y en ningún otro
 * lado: no entran en métricas, promedios, pool de letalidad, ajustes ni exportación.
 */
export function PanelReferencia() {
  const id = useId()
  const [activa, setActiva] = useState(false)
  const [filas, setFilas] = useState<FilaRanking[] | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!activa || filas !== null) return
    let vigente = true
    import('../../../seed/CartasPrueba.json')
      .then((modulo) => {
        if (!vigente) return
        setError(false)
        setFilas(rankingReferencia(cargarReferencia(modulo.default as unknown as AnyCard[])))
      })
      .catch(() => {
        if (vigente) setError(true)
      })
    return () => {
      vigente = false
    }
  }, [activa, filas])

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
      {activa && error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          No se pudieron cargar las cartas de referencia.
        </p>
      )}
      {activa && filas === null && !error && (
        <p role="status" className="mt-3 text-sm text-gray-400">
          Cargando cartas de referencia…
        </p>
      )}
      {activa && filas !== null && (
        <TablaAlternativa
          caption="Cartas de referencia ordenadas por índice de poder"
          columnas={['Carta', 'Tipo', 'Coste', 'Índice de poder', 'Origen']}
          filas={filas.map((f) => [f.nombre, f.tipo, String(f.coste), num(f.indice), ETIQUETA_REFERENCIA])}
        />
      )}
    </section>
  )
}
