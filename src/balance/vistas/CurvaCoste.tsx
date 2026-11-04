import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import { RARITIES, type Rarity } from '../../shared/types/enums'
import { GraficaBase } from '../componentes/GraficaBase'
import { SinCartas } from '../componentes/SinCartas'
import { TituloVista } from '../componentes/TituloVista'
import { curvaCoste } from '../metricas'
import { COLOR_RAREZA, MARGEN_GRAFICA } from './constantesUi'
import type { PropsVista } from './props'

/** Barras apiladas por rareza: cuántas cartas hay en cada coste. */
export function CurvaCoste({ cartas, ancho, alto }: PropsVista) {
  const puntos = curvaCoste(cartas)
  if (cartas.length === 0 || puntos.length === 0) return <SinCartas />
  const rarezas: Rarity[] = RARITIES.filter((r) => puntos.some((p) => (p.porRareza[r] ?? 0) > 0))
  const datos = puntos.map((p) => ({
    coste: `Coste ${p.coste}`,
    ...Object.fromEntries(rarezas.map((r) => [r, p.porRareza[r] ?? 0])),
  }))
  const filas = puntos.map((p) => [String(p.coste), String(p.total), ...rarezas.map((r) => String(p.porRareza[r] ?? 0))])
  return (
    <section>
      <TituloVista
        titulo="Curva de coste"
        descripcion="Cuántas cartas hay en cada coste y de qué rareza son. Una curva muy cargada a un lado deja huecos en la partida."
      />
      <GraficaBase
        titulo="Curva de coste por rareza"
        descripcion="Barras apiladas: una por coste, dividida por rareza."
        ancho={ancho}
        alto={alto}
        tabla={{ caption: 'Cartas por coste y rareza', columnas: ['Coste', 'Total', ...rarezas], filas }}
      >
        {(w, h) => (
          <BarChart width={w} height={h} data={datos} margin={MARGEN_GRAFICA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="coste" stroke="#9ca3af" />
            <YAxis allowDecimals={false} stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            {rarezas.map((r) => (
              <Bar key={r} dataKey={r} stackId="rareza" fill={COLOR_RAREZA[r]} />
            ))}
          </BarChart>
        )}
      </GraficaBase>
    </section>
  )
}
