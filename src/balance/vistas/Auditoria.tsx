import { simularAjustes } from '../ajuste'
import { Semaforo } from '../componentes/Semaforo'
import { SinCartas } from '../componentes/SinCartas'
import { TituloVista } from '../componentes/TituloVista'
import { aJson } from '../exportacion'
import { evaluarCarta } from '../metricas'
import type { CartaBalance } from '../tipos'
import { num, veredictoDe } from './formato'
import type { PropsVistaConPool } from './props'

const COLUMNAS = [
  'ID', 'Carta', 'Tipo', 'Rareza', 'Coste', 'ATQ', 'RES', 'Suma', 'Suma objetivo', 'Impuesto', 'Índice', 'Estado', 'Semáforo',
]
const TH = 'whitespace-nowrap border-b border-card-border px-2 py-1 font-display text-xs text-ether-200'
const TD = 'border-b border-card-border/40 px-2 py-1'
const ARCHIVO = 'ajustes-balance.json'

/** Descarga el JSON de ajustes sin escribir nada en el seed: Blob, enlace temporal y limpieza. */
function descargarAjustes(publicadas: readonly CartaBalance[]) {
  const { ajustes } = simularAjustes(publicadas)
  const blob = new Blob([aJson(ajustes)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const enlace = document.createElement('a')
  enlace.href = url
  enlace.download = ARCHIVO
  document.body.appendChild(enlace)
  enlace.click()
  enlace.remove()
  URL.revokeObjectURL(url)
}

/** Tabla completa de indicadores, avisos del cargador y exportación de los ajustes propuestos. */
export function Auditoria({ cartas, publicadas, avisos = [] }: PropsVistaConPool & { avisos?: string[] }) {
  const evaluaciones = cartas.map((c) => ({ carta: c, ev: evaluarCarta(c) }))
  return (
    <section>
      <TituloVista
        titulo="Auditoría"
        descripcion="Todos los indicadores de cada carta en una sola tabla, los avisos al leer el seed y la exportación de los ajustes propuestos."
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => descargarAjustes(publicadas ?? cartas)}
          className="rounded-lg border border-ether-400/60 bg-ether-500/10 px-3 py-1.5 text-sm font-semibold text-ether-200 transition-colors hover:bg-ether-500/20"
        >
          Exportar JSON
        </button>
        <p className="text-xs text-gray-500">
          Descarga los ajustes de todas las cartas publicadas (sin importar los filtros). No modifica el seed.
        </p>
      </div>

      {avisos.length > 0 ? (
        <ul aria-label="Avisos del cargador" className="mb-4 space-y-1 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          {avisos.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-gray-500">Sin avisos del cargador</p>
      )}

      {cartas.length === 0 ? (
        <SinCartas />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm text-gray-300">
            <caption className="mb-1 text-left text-xs text-gray-500">Auditoría de las cartas con todos sus indicadores</caption>
            <thead>
              <tr>
                {COLUMNAS.map((c) => (
                  <th key={c} scope="col" className={TH}>{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {evaluaciones.map(({ carta, ev }) => (
                <tr key={carta.id} className="odd:bg-surface/50">
                  <td className={`${TD} font-mono`}>{carta.id}</td>
                  <td className={TD}>{carta.nombre}</td>
                  <td className={TD}>{carta.tipo}</td>
                  <td className={TD}>{carta.rareza}</td>
                  <td className={TD}>{carta.coste}</td>
                  <td className={TD}>{num(carta.stats?.atq ?? null)}</td>
                  <td className={TD}>{num(carta.stats?.res ?? null)}</td>
                  <td className={TD}>{num(ev.presupuesto?.suma ?? null)}</td>
                  <td className={TD}>{num(ev.presupuesto?.objetivoSuma ?? null)}</td>
                  <td className={TD}>{num(ev.impuesto)}</td>
                  <td className={TD}>{num(ev.indice)}</td>
                  <td className={TD}>{ev.presupuesto === null ? '—' : veredictoDe(ev.presupuesto)}</td>
                  <td className={TD}><Semaforo valor={ev.semaforo} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
