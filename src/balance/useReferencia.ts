import { useEffect, useMemo, useState } from 'react'
import type { AnyCard } from '../shared/types'
import { cargarReferencia } from './referencia'
import type { CartaBalance } from './tipos'

export type EstadoReferencia = 'apagada' | 'cargando' | 'error' | 'lista'

export interface Referencia {
  activa: boolean
  setActiva: (activa: boolean) => void
  estado: EstadoReferencia
  /** Cartas de referencia normalizadas (marcadas `esReferencia`); vacío si está apagada. */
  cartas: CartaBalance[]
  /** Las mismas cartas tal como vienen del seed (con el texto de sus efectos), por id. */
  crudas: Map<string, AnyCard>
}

interface Cargada {
  cartas: CartaBalance[]
  crudas: Map<string, AnyCard>
}

const SIN_CARTAS: CartaBalance[] = []
const SIN_CRUDAS = new Map<string, AnyCard>()

/**
 * Interruptor de la referencia (paquete de pruebas, no publicado). Apagado por defecto; el
 * paquete se carga con import dinámico solo al activarlo y se conserva una vez cargado.
 * Estas cartas nunca entran en métricas, pool de letalidad, ajustes ni exportación.
 */
export function useReferencia(): Referencia {
  const [activa, setActiva] = useState(false)
  const [cargada, setCargada] = useState<Cargada | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!activa || cargada !== null) return
    let vigente = true
    import('../../seed/CartasPrueba.json')
      .then((modulo) => {
        if (!vigente) return
        const crudas = modulo.default as unknown as AnyCard[]
        setError(false)
        setCargada({ cartas: cargarReferencia(crudas), crudas: new Map(crudas.map((c) => [c.id, c])) })
      })
      .catch(() => {
        if (vigente) setError(true)
      })
    return () => {
      vigente = false
    }
  }, [activa, cargada])

  return useMemo(() => {
    let estado: EstadoReferencia = 'lista'
    if (!activa) estado = 'apagada'
    else if (error) estado = 'error'
    else if (cargada === null) estado = 'cargando'
    const visible = activa && cargada !== null
    return {
      activa,
      setActiva,
      estado,
      cartas: visible ? cargada.cartas : SIN_CARTAS,
      crudas: visible ? cargada.crudas : SIN_CRUDAS,
    }
  }, [activa, cargada, error])
}
