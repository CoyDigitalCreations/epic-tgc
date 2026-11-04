import { useState } from 'react'
import { Bar, CartesianGrid, ComposedChart, Legend, Line, Tooltip, XAxis, YAxis } from 'recharts'
import { GraficaBase } from '../componentes/GraficaBase'
import { SinCartas } from '../componentes/SinCartas'
import { TituloVista } from '../componentes/TituloVista'
import { CONFIG_V1 } from '../config'
import { agruparPor, promedioPorCoste } from '../metricas'
import type { MazoId } from '../tipos'
import { MARGEN_GRAFICA } from './constantesUi'
import { NOMBRE_MAZO, num } from './formato'
import type { PropsVista } from './props'

type Criterio = 'coste' | 'mazo' | 'rareza'

const OPCIONES: readonly { valor: Criterio; etiqueta: string }[] = [
  { valor: 'coste', etiqueta: 'Coste' },
  { valor: 'mazo', etiqueta: 'Mazo' },
  { valor: 'rareza', etiqueta: 'Rareza' },
]

interface Grupo {
  grupo: string
  campeones: number
  suma: number | null
  min: number | null
  max: number | null
}

/**
 * Suma media de ATQ y RES por coste, mazo o rareza. Por coste se compara con la banda; los exentos
 * (Únicas y Soberanos) quedan fuera de esa cuenta porque viven con su propio tope.
 */
export function PresupuestoCoste({ cartas, ancho, alto }: PropsVista) {
  const [criterio, setCriterio] = useState<Criterio>('coste')
  const campeones = cartas.filter((c) => c.tipo === 'Campeón' && c.stats !== null)
  if (campeones.length === 0) return <SinCartas mensaje="Sin Campeones con estos filtros" />

  const grupos: Grupo[] =
    criterio === 'coste'
      ? promedioPorCoste(cartas).map((p) => ({
          grupo: `Coste ${p.coste}`,
          campeones: p.conteo,
          suma: p.sumaMedia,
          min: CONFIG_V1.bandas[p.coste]?.sumaMin ?? null,
          max: CONFIG_V1.bandas[p.coste]?.sumaMax ?? null,
        }))
      : agruparPor(campeones, criterio).map((g) => ({
          grupo: criterio === 'mazo' ? NOMBRE_MAZO[g.clave as MazoId] : g.clave,
          campeones: g.conteo,
          suma: g.promedioSuma,
          min: null,
          max: null,
        }))

  const datos = grupos.map((g) => ({
    grupo: g.grupo,
    suma: g.suma ?? undefined,
    min: g.min ?? undefined,
    max: g.max ?? undefined,
  }))

  return (
    <section>
      <TituloVista
        titulo="Presupuesto de stats"
        descripcion="La suma media de ATQ y RES de los Campeones frente a lo que permite la banda de su coste. Una barra por encima de la línea de máximo indica Campeones demasiado fuertes."
      />
      <div className="mb-3 flex flex-col gap-1">
        <label htmlFor="agrupar-por" className="font-display text-xs uppercase tracking-wider text-gray-400">
          Agrupar por
        </label>
        <select
          id="agrupar-por"
          value={criterio}
          onChange={(e) => setCriterio(e.target.value as Criterio)}
          className="w-40 rounded-lg border border-card-border bg-surface px-2 py-1.5 text-sm text-gray-100"
        >
          {OPCIONES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </div>
      <GraficaBase
        titulo="Suma de ATQ y RES por grupo"
        descripcion="Barras con la suma media por grupo; en el agrupado por coste, dos líneas marcan el mínimo y el máximo de la banda."
        ancho={ancho}
        alto={alto}
        tabla={{
          caption: 'Suma de ATQ y RES por grupo, con la banda del coste cuando aplica',
          columnas: ['Grupo', 'Campeones', 'Suma media', 'Banda mínima', 'Banda máxima'],
          filas: grupos.map((g) => [g.grupo, String(g.campeones), num(g.suma), num(g.min), num(g.max)]),
        }}
      >
        {(w, h) => (
          <ComposedChart width={w} height={h} data={datos} margin={MARGEN_GRAFICA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="grupo" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" />
            <Tooltip />
            <Legend />
            <Bar dataKey="suma" name="Suma media" fill="#a78bfa" />
            <Line dataKey="min" name="Banda mínima" stroke="#22c55e" strokeDasharray="4 4" dot={false} connectNulls />
            <Line dataKey="max" name="Banda máxima" stroke="#ef4444" strokeDasharray="4 4" dot={false} connectNulls />
          </ComposedChart>
        )}
      </GraficaBase>
    </section>
  )
}
