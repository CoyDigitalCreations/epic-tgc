import { useCallback, useEffect, useState } from 'react'
import type { EstadoAdmin } from './adminApi'

export type EstadoSesion = EstadoAdmin | 'cargando'

/**
 * Estado de la sesión respecto a la administración, para pantallas que solo muestran u ocultan cosas (la landing).
 * `adminApi` se carga bajo demanda para que `supabase-js` no entre en el paquete inicial de la página. Mostrar u ocultar es solo
 * comodidad: quien protege el Card-Maker y el Tablero es `AdminGate` (y la RLS en la base), no esta lectura.
 */
export function useEstadoAdmin(): { estado: EstadoSesion; refrescar: () => Promise<void> } {
  const [estado, setEstado] = useState<EstadoSesion>('cargando')

  const refrescar = useCallback(async () => {
    try {
      const { estadoAdmin } = await import('./adminApi')
      setEstado(await estadoAdmin())
    } catch {
      setEstado('no-sesion')
    }
  }, [])

  useEffect(() => {
    void refrescar()
  }, [refrescar])

  return { estado, refrescar }
}
