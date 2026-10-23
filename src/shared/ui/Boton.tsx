import type { ComponentProps } from 'react'

type Variante = 'primario' | 'secundario' | 'alerta' | 'peligro' | 'fantasma'
type Tamano = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario:
    'text-white bg-gradient-to-b from-ether-500 to-ether-600 shadow-[0_0_0_1px_rgba(144,144,255,0.45),0_6px_18px_-4px_rgba(32,32,255,0.55)] hover:brightness-110 active:brightness-95 disabled:shadow-none disabled:hover:brightness-100',
  secundario: 'text-gray-200 bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20',
  alerta:
    'text-amber-50 bg-gradient-to-b from-amber-500/80 to-amber-600/80 shadow-[0_0_0_1px_rgba(251,191,36,0.4)] hover:brightness-110',
  peligro:
    'text-rose-100 bg-gradient-to-b from-rose-600/80 to-rose-700/80 shadow-[0_0_0_1px_rgba(251,113,133,0.4)] hover:brightness-110',
  fantasma: 'text-gray-400 hover:text-gray-100 hover:bg-white/5',
}

const TAMANOS: Record<Tamano, string> = {
  sm: 'text-[11px] px-2.5 py-1 rounded-md',
  md: 'text-xs px-4 py-2 rounded-lg',
  lg: 'font-display text-sm tracking-wider px-8 py-3 rounded-xl',
}

interface BotonProps extends ComponentProps<'button'> {
  variante?: Variante
  tam?: Tamano
  /** Atajo de teclado que se muestra como pista (p. ej. "↵"). Decorativo: no cambia el nombre accesible. */
  atajo?: string
}

/** Botón del sistema de modales del juego. Solo estilo: el comportamiento lo pone quien lo usa. */
export function Boton({ variante = 'secundario', tam = 'md', atajo, className = '', children, type = 'button', ...resto }: BotonProps) {
  return (
    <button
      type={type}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${TAMANOS[tam]} ${VARIANTES[variante]} ${className}`}
      {...resto}
    >
      {children}
      {atajo && (
        <kbd aria-hidden="true" className="text-[10px] font-sans opacity-60">
          {atajo}
        </kbd>
      )}
    </button>
  )
}
