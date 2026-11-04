import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'
import { BotonAnalizar } from '../componentes/BotonAnalizar'
import { GraficaBase } from '../componentes/GraficaBase'
import { Semaforo } from '../componentes/Semaforo'
import { SinCartas } from '../componentes/SinCartas'
import { TituloVista } from '../componentes/TituloVista'
import { rankingPoder } from '../metricas'
import { num } from './formato'
import { ALTO_POR_BARRA, ANCHO_ETIQUETA_BARRA, MARGEN_GRAFICA, TOP_RANKING } from './constantesUi'
import type { PropsConAnalizar, PropsVista } from './props'

const TH = 'border-b border-card-border px-2 py-1 font-display text-xs text-ether-200'
const TD = 'border-b border-card-border/40 px-2 py-1'
const COLUMNAS = ['#', 'Carta', 'Tipo', 'Coste', 'Índice de poder', 'Impuesto', 'Semáforo']

/** Ranking del índice de poder de todas las cartas, con semáforo (color y texto). */
export function RankingPoder({ cartas, ancho, onAnalizar }: PropsVista & PropsConAnalizar) {
  if (cartas.length === 0) return <SinCartas />
  const ranking = rankingPoder(cartas)
  const columnas = onAnalizar === undefined ? COLUMNAS : [...COLUMNAS, 'Analizar']
  const top = ranking.slice(0, TOP_RANKING)
  const datos = top.map((e) => ({ nombre: e.nombre, indice: e.indice }))
  const altoTop = (top.length + 1) * ALTO_POR_BARRA
  return (
    <section>
      <TituloVista
        titulo="Ranking de poder"
        descripcion="El índice de poder suma lo que valen los efectos y las keywords de cada carta. El semáforo dice si la carta se pasa de lo que cuesta."
      />
      <GraficaBase
        titulo="Las diez cartas con mayor índice de poder"
        descripcion="Barras horizontales ordenadas de mayor a menor índice."
        ancho={ancho}
        alto={ancho === undefined ? undefined : altoTop}
        tablaVisible={false}
        tabla={{
          caption: 'Las diez cartas con mayor índice de poder',
          columnas: ['Carta', 'Índice de poder'],
          filas: top.map((e) => [e.nombre, num(e.indice)]),
        }}
      >
        {(w, h) => (
          <BarChart width={w} height={h} data={datos} layout="vertical" margin={MARGEN_GRAFICA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" stroke="#9ca3af" />
            <YAxis type="category" dataKey="nombre" width={ANCHO_ETIQUETA_BARRA} stroke="#9ca3af" />
            <Tooltip />
            <Bar dataKey="indice" fill="#a78bfa" />
          </BarChart>
        )}
      </GraficaBase>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-gray-300">
          <caption className="mb-1 text-left text-xs text-gray-500">Ranking del índice de poder de todas las cartas</caption>
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c} scope="col" className={TH}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranking.map((e, i) => (
              <tr key={e.id} className="odd:bg-surface/50">
                <td className={TD}>{i + 1}</td>
                <td className={TD}>{e.nombre}</td>
                <td className={TD}>{e.tipo}</td>
                <td className={TD}>{e.coste}</td>
                <td className={TD}>{num(e.indice)}</td>
                <td className={TD}>{num(e.impuesto)}</td>
                <td className={TD}><Semaforo valor={e.semaforo} /></td>
                {onAnalizar !== undefined && (
                  <td className={TD}><BotonAnalizar id={e.id} nombre={e.nombre} onAnalizar={onAnalizar} /></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
