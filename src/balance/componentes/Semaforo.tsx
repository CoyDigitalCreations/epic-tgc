import type { Semaforo as ValorSemaforo } from '../metricas'

const ETIQUETA: Record<ValorSemaforo, string> = { verde: 'Verde', amarillo: 'Amarillo', rojo: 'Rojo' }

const CLASES: Record<ValorSemaforo, string> = {
  verde: 'border-green-500/50 bg-green-500/15 text-green-300',
  amarillo: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300',
  rojo: 'border-red-500/50 bg-red-500/15 text-red-300',
}

/** Indicador de semáforo: color Y texto, nunca solo color. */
export function Semaforo({ valor }: { valor: ValorSemaforo }) {
  return (
    <span
      aria-label={`Semáforo: ${ETIQUETA[valor]}`}
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-semibold ${CLASES[valor]}`}
    >
      <span aria-hidden="true" className="size-2 rounded-full bg-current" />
      {ETIQUETA[valor]}
    </span>
  )
}
