import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface TileCartaProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Estado de selección (se pinta con anillo, destello y ✓). Si es undefined, el tile no es de selección. */
  seleccionada?: boolean
  /** Texto bajo la carta (aporte, nombre, estado…). */
  pie?: ReactNode
  /** La carta que se muestra. */
  children: ReactNode
}

/**
 * Carta seleccionable de las galerías de decisión (Éter a pagar, Campeón a sacrificar,
 * objetivo a elegir…). Seleccionada: anillo luminoso, leve elevación y ✓. Deshabilitada: apagada.
 */
export function TileCarta({ seleccionada, pie, className = '', children, type = 'button', ...resto }: TileCartaProps) {
  const esDeSeleccion = seleccionada !== undefined
  return (
    <button
      type={type}
      aria-pressed={esDeSeleccion ? seleccionada : undefined}
      className={`group relative flex cursor-pointer flex-col items-center gap-1 rounded-xl border p-1.5 text-left transition duration-150 disabled:cursor-not-allowed disabled:opacity-35 disabled:grayscale ${
        seleccionada
          ? '-translate-y-0.5 border-ether-300 bg-ether-500/15 shadow-[0_0_20px_rgba(112,112,255,0.45)]'
          : 'border-transparent hover:border-white/15 hover:bg-white/5'
      } ${className}`}
      {...resto}
    >
      {children}
      {seleccionada && (
        <span
          aria-hidden="true"
          className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-ether-400 text-[11px] font-bold text-white shadow-[0_0_10px_rgba(112,112,255,0.7)]"
        >
          ✓
        </span>
      )}
      {pie !== undefined && <span className="max-w-full truncate text-[10px] font-mono text-gray-400">{pie}</span>}
    </button>
  )
}
