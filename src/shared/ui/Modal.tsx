import { useId } from 'react'
import type { ReactNode } from 'react'
import { COLOR_TONO } from './tonos'
import type { Tono } from './tonos'

const ANCHOS = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
} as const

export interface ModalProps {
  titulo: ReactNode
  subtitulo?: ReactNode
  /** Glifo de la cabecera (emoji o texto corto). Decorativo: no se lee. */
  icono?: ReactNode
  tono?: Tono
  ancho?: keyof typeof ANCHOS
  /** Si se pasa, muestra la ✕ de cerrar. Los modales de DECISIÓN no la usan: se cierran eligiendo. */
  onCerrar?: () => void
  /** Acciones del pie (botones). */
  pie?: ReactNode
  children: ReactNode
}

/**
 * Modal del juego: fondo con desenfoque, panel oscuro con filo luminoso del color
 * del tono, cabecera (ícono + título en Cinzel + subtítulo), cuerpo con scroll y pie
 * de acciones. Es solo la CÁSCARA: no decide nada ni intercepta el teclado
 * (cada modal maneja sus atajos). Capa z-50: por encima de los docks (40) y por
 * debajo del zoom de carta (60).
 */
export function Modal({ titulo, subtitulo, icono, tono = 'ether', ancho = 'md', onCerrar, pie, children }: ModalProps) {
  const idTitulo = useId()
  const color = COLOR_TONO[tono]
  return (
    <div className="anim-modal-fondo fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#04040a]/75 backdrop-blur-[3px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`anim-modal-panel relative flex w-full ${ANCHOS[ancho]} max-h-[88vh] flex-col rounded-2xl border bg-gradient-to-b from-[#181829] via-[#13131f] to-[#0e0e18] shadow-[0_30px_90px_-10px_rgba(0,0,0,0.8)]`}
        style={{ borderColor: `${color}40` }}
      >
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px"
          style={{ background: `linear-gradient(90deg, transparent, ${color}, transparent)` }}
        />
        <header className="flex items-start gap-3 px-5 pt-4 pb-3">
          {icono && (
            <span
              aria-hidden="true"
              className="grid size-9 shrink-0 place-items-center rounded-xl text-base"
              style={{ background: `${color}1f`, boxShadow: `inset 0 0 0 1px ${color}40` }}
            >
              {icono}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <h2 id={idTitulo} className="font-display text-lg font-bold leading-tight tracking-wide text-gray-50">
              {titulo}
            </h2>
            {subtitulo && <p className="mt-0.5 text-xs text-gray-400">{subtitulo}</p>}
          </div>
          {onCerrar && (
            <button
              type="button"
              aria-label="Cerrar"
              onClick={onCerrar}
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-lg text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-100"
            >
              ✕
            </button>
          )}
        </header>
        <div className="overflow-y-auto px-5 pb-4">{children}</div>
        {pie && (
          <footer className="flex items-center justify-end gap-2 rounded-b-2xl border-t border-white/5 bg-black/25 px-5 py-3">
            {pie}
          </footer>
        )}
      </div>
    </div>
  )
}
