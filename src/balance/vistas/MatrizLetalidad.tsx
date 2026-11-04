import { SinCartas } from '../componentes/SinCartas'
import { TablaAlternativa } from '../componentes/TablaAlternativa'
import { TituloVista } from '../componentes/TituloVista'
import { letalidad, matrizLetalidad, poolLetalidad, umbralesPorStat } from '../letalidad'
import type { PropsVistaConPool } from './props'

const TH = 'border-b border-card-border px-2 py-1 font-display text-xs text-ether-200'
const TD = 'border-b border-card-border/40 px-1 py-1 text-center'

/** «Igual que X n-1» cuando un escalón no cambia respecto al valor anterior. */
function equivalencia(etiqueta: string, valores: readonly { valor: number; cuenta: number }[]) {
  return valores.map((v, i) => (i > 0 && valores[i - 1].cuenta === v.cuenta ? `Igual que ${etiqueta} ${valores[i - 1].valor}` : '—'))
}

/**
 * Quién mata a quién entre los Campeones no exentos (un Campeón muere si el daño recibido es mayor o
 * igual a su RES). Los filtros solo recortan las filas de la primera tabla: el pool siempre es completo.
 */
export function MatrizLetalidad({ cartas, publicadas }: PropsVistaConPool) {
  const pool = poolLetalidad(publicadas ?? cartas)
  const visibles = new Set(cartas.map((c) => c.id))
  const filas = pool.filter((c) => visibles.has(c.id))
  if (pool.length === 0 || filas.length === 0) return <SinCartas mensaje="Sin Campeones con estos filtros" />

  const matriz = matrizLetalidad(pool)
  const umbrales = umbralesPorStat(pool)
  const eqRes = equivalencia('RES', umbrales.res.map((u) => ({ valor: u.valor, cuenta: u.loMatan })))
  const eqAtq = equivalencia('ATQ', umbrales.atq.map((u) => ({ valor: u.valor, cuenta: u.mata })))

  return (
    <section>
      <TituloVista
        titulo="Matriz de letalidad"
        descripcion="Quién mata a quién. Un Campeón muere cuando el ATQ que recibe es mayor o igual a su RES, y el daño es simultáneo."
      />
      <p className="mb-4 text-xs text-gray-500">
        El pool son los {pool.length} Campeones publicados que no están exentos. No cambia con los filtros: ellos solo
        recortan las filas de la primera tabla.
      </p>

      <TablaAlternativa
        caption="Letalidad por Campeón del pool"
        columnas={['Carta', 'Stats (ATQ / RES)', 'Mata a', 'Lo matan', '% mata', '% lo matan', 'Etiqueta']}
        filas={filas.map((c) => {
          const l = letalidad(c, pool)
          if (l === null || c.stats === null) return [c.nombre, '—', '—', '—', '—', '—', '—']
          const etiqueta = l.dominante ? 'Dominante' : l.loMatan === 0 ? 'Invulnerable' : '—'
          return [
            c.nombre,
            `${c.stats.atq} / ${c.stats.res}`,
            `${l.mata} de ${l.total}`,
            `${l.loMatan} de ${l.total}`,
            String(l.pctMata),
            String(l.pctLoMatan),
            etiqueta,
          ]
        })}
      />

      <div className="mt-6 overflow-x-auto">
        <table className="border-collapse text-sm text-gray-300">
          <caption className="mb-1 text-left text-xs text-gray-500">
            Quién mata a quién: cada fila ataca y cada columna defiende
          </caption>
          <thead>
            <tr>
              <th scope="col" className={`${TH} text-left`}>Ataca / defiende</th>
              {pool.map((c) => (
                <th key={c.id} scope="col" aria-label={c.nombre} title={c.nombre} className={`${TH} font-mono`}>
                  {c.id}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pool.map((atacante, i) => (
              <tr key={atacante.id}>
                <th scope="row" className={`${TH} whitespace-nowrap text-left`}>{atacante.nombre}</th>
                {matriz.celdas[i].map((mata, j) =>
                  i === j ? (
                    <td key={pool[j].id} className={`${TD} bg-surface-2/60`}>
                      <span aria-hidden="true">—</span>
                      <span className="sr-only">Misma carta</span>
                    </td>
                  ) : mata ? (
                    <td key={pool[j].id} className={`${TD} bg-red-500/25 text-red-200`}>
                      <span aria-hidden="true">●</span>
                      <span className="sr-only">Mata</span>
                    </td>
                  ) : (
                    <td key={pool[j].id} className={`${TD} text-gray-600`}>
                      <span aria-hidden="true">·</span>
                      <span className="sr-only">No mata</span>
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <TablaAlternativa
          caption="Escalones por RES: cuántos Campeones del pool matan a un Campeón con esa RES"
          columnas={['RES', 'Lo matan', '% del pool', 'Equivalencia']}
          filas={umbrales.res.map((u, i) => [String(u.valor), String(u.loMatan), String(u.pct), eqRes[i]])}
        />
        <TablaAlternativa
          caption="Escalones por ATQ: a cuántos Campeones del pool mata un Campeón con ese ATQ"
          columnas={['ATQ', 'Mata a', '% del pool', 'Equivalencia']}
          filas={umbrales.atq.map((u, i) => [String(u.valor), String(u.mata), String(u.pct), eqAtq[i]])}
        />
      </div>
    </section>
  )
}
