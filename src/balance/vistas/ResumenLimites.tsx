import { resumenDeLimites } from '../limitesCarta'
import type { EstadoLimite, LimiteCarta } from '../limitesCarta'
import { num } from './formato'

/** El texto del estado siempre va escrito: el color nunca es lo único que lo dice. */
const TEXTO_ESTADO: Record<EstadoLimite, string> = {
  dentro: 'Dentro',
  limite: 'Al límite',
  excede: 'Rebasa',
  bajo: 'Por debajo del mínimo',
  'sin-limite': 'No aplica',
}

const COLOR_ESTADO: Record<EstadoLimite, string> = {
  dentro: 'border-green-500/50 bg-green-500/15 text-green-300',
  limite: 'border-yellow-500/50 bg-yellow-500/15 text-yellow-300',
  excede: 'border-red-500/50 bg-red-500/15 text-red-300',
  bajo: 'border-sky-500/50 bg-sky-500/15 text-sky-300',
  'sin-limite': 'border-card-border bg-surface-2 text-gray-300',
}

const TH = 'whitespace-nowrap border-b border-card-border px-2 py-1 text-left font-display text-xs text-ether-200'
const TD = 'border-b border-card-border/40 px-2 py-1 align-top'

const plural = (n: number, singular: string, pluralizado: string): string => (n === 1 ? singular : pluralizado)

/** La frase que contesta lo único que importa al diseñar: ¿qué estoy rebasando? */
export function fraseDeLimites(limites: readonly LimiteCarta[]): string {
  const { rebasados, bajoMinimo, enLimite } = resumenDeLimites(limites)
  const partes: string[] = []
  if (rebasados.length > 0) {
    partes.push(`Rebasa ${rebasados.length} ${plural(rebasados.length, 'límite', 'límites')}: ${rebasados.map((l) => l.etiqueta.toLowerCase()).join(', ')}.`)
  }
  if (bajoMinimo.length > 0) partes.push(`Queda por debajo del mínimo de stats: la carta está regalada para su coste.`)
  if (rebasados.length === 0 && bajoMinimo.length === 0) {
    partes.push(
      enLimite.length > 0
        ? `No rebasa ningún límite, pero usa casi por completo ${enLimite.length} ${plural(enLimite.length, 'presupuesto', 'presupuestos')}: ${enLimite.map((l) => l.etiqueta.toLowerCase()).join(', ')}.`
        : 'No rebasa ningún límite.',
    )
  }
  return partes.join(' ')
}

/** Cada presupuesto e índice de la carta: cuánto usa, cuánto puede y si lo rebasa. Solo lectura. */
export function ResumenLimites({ limites }: { limites: readonly LimiteCarta[] }) {
  const hayRebase = resumenDeLimites(limites).rebasados.length > 0
  return (
    <section aria-label="Límites de la carta" className="rounded-2xl border border-card-border bg-surface p-4">
      <h4 className="mb-2 font-display text-sm font-bold uppercase tracking-wider text-ether-200">Límites de la carta</h4>
      <p role="status" className={`mb-3 text-sm font-semibold ${hayRebase ? 'text-red-300' : 'text-gray-100'}`}>
        {fraseDeLimites(limites)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-gray-300">
          <caption className="sr-only">Presupuestos e índices de la carta contra sus límites</caption>
          <thead>
            <tr>
              <th scope="col" className={TH}>Límite</th>
              <th scope="col" className={TH}>Usa</th>
              <th scope="col" className={TH}>Máximo</th>
              <th scope="col" className={TH}>Estado</th>
              <th scope="col" className={TH}>De dónde sale</th>
            </tr>
          </thead>
          <tbody>
            {limites.map((l) => (
              <tr key={l.id} className="odd:bg-surface/50">
                <th scope="row" className={`${TD} text-left font-semibold text-gray-100`}>{l.etiqueta}</th>
                <td className={TD}>{num(l.usado)}</td>
                <td className={TD}>{l.limite === null ? '—' : num(l.limite)}</td>
                <td className={TD}>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${COLOR_ESTADO[l.estado]}`}>{TEXTO_ESTADO[l.estado]}</span>
                </td>
                <td className={`${TD} text-gray-400`}>{l.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
