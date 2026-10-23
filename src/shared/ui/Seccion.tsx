import type { ReactNode } from 'react'

/** Etiqueta de una sección dentro de un modal/dock (mayúsculas espaciadas), con un contador opcional. */
export function Seccion({ children, cantidad, tono = 'neutro' }: { children: ReactNode; cantidad?: number; tono?: 'neutro' | 'alerta' }) {
  return (
    <h3
      className={`mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${
        tono === 'alerta' ? 'text-amber-300/80' : 'text-gray-500'
      }`}
    >
      {children}
      {cantidad !== undefined && (
        <span className="rounded-full bg-white/10 px-1.5 py-px font-mono text-[10px] tracking-normal text-gray-300">{cantidad}</span>
      )}
    </h3>
  )
}
