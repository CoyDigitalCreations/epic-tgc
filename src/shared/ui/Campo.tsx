import type { ReactNode } from 'react'

/** Clase común de inputs, selects y textareas de los formularios oscuros. */
export const CLASE_CAMPO =
  'w-full rounded-lg border border-white/10 bg-[#0a0a12] px-3 py-2 text-sm text-gray-100 placeholder-gray-600 transition-colors focus:border-ether-400 focus:outline-none'

/** Campo de formulario: etiqueta arriba, control abajo y una pista opcional. El label envuelve al control (queda asociado). */
export function Campo({ etiqueta, pista, children }: { etiqueta: ReactNode; pista?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wider text-gray-400">{etiqueta}</span>
      {children}
      {pista && <span className="mt-1 block text-[11px] text-gray-600">{pista}</span>}
    </label>
  )
}
