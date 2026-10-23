import type { ReactNode } from 'react'
import { COLOR_TONO } from './tonos'
import type { Tono } from './tonos'

export interface DockProps {
  /** Nombre accesible de la región (el título puede ser un nodo). */
  etiquetaAria: string
  titulo?: ReactNode
  subtitulo?: ReactNode
  tono?: Tono
  /** Si se pasa, muestra "Cerrar" en la cabecera (paneles informativos). */
  onCerrar?: () => void
  /** Acciones a la derecha de la cabecera. */
  acciones?: ReactNode
  /** Pie con los botones de decisión. */
  pie?: ReactNode
  children?: ReactNode
}

/**
 * Panel flotante en el borde inferior de la pantalla, para las decisiones que se toman
 * MIRANDO la mesa (pagar con Éter, elegir casilla, ver una pila): no tapa el tablero con
 * un fondo oscuro como el Modal. Misma estética que el Modal (filo luminoso, Cinzel).
 * Capa z-40: por debajo de los modales (50).
 */
export function Dock({ etiquetaAria, titulo, subtitulo, tono = 'ether', onCerrar, acciones, pie, children }: DockProps) {
  const color = COLOR_TONO[tono]
  const hayCabecera = titulo !== undefined || acciones !== undefined || onCerrar !== undefined
  return (
    <section
      aria-label={etiquetaAria}
      className="anim-dock fixed inset-x-3 bottom-3 z-40 mx-auto max-w-6xl rounded-2xl border bg-gradient-to-b from-[#161626]/97 to-[#0d0d17]/97 shadow-[0_-12px_60px_-12px_rgba(0,0,0,0.75)] backdrop-blur"
      style={{ borderColor: `${color}40` }}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-8 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
      />
      {hayCabecera && (
        <header className="flex items-center gap-3 px-4 pt-3 pb-2">
          <div className="min-w-0 flex-1">
            {titulo !== undefined && (
              <h2 className="font-display text-base font-bold leading-tight tracking-wide text-gray-50">{titulo}</h2>
            )}
            {subtitulo && <p className="mt-0.5 text-xs text-gray-400">{subtitulo}</p>}
          </div>
          {acciones}
          {onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              className="cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-200 transition-colors hover:border-white/20 hover:bg-white/10"
            >
              Cerrar
            </button>
          )}
        </header>
      )}
      {/* pt-2: deja lugar al ✓ y a la elevación de los tiles seleccionados (el scroll vertical también recorta lo que sobresale) */}
      {children !== undefined && <div className="max-h-[46vh] overflow-y-auto px-4 pb-3 pt-2">{children}</div>}
      {pie && (
        <footer className="flex flex-wrap items-center gap-3 rounded-b-2xl border-t border-white/5 bg-black/20 px-4 py-2.5">
          {pie}
        </footer>
      )}
    </section>
  )
}
