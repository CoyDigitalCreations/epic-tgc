import { useState } from 'react'
import {
  CartesianGrid,
  Legend,
  ReferenceArea,
  ReferenceLine,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'
import { GraficaBase } from '../componentes/GraficaBase'
import { SinCartas } from '../componentes/SinCartas'
import { TituloVista } from '../componentes/TituloVista'
import { COLOR_MAZO } from '../componentes/colores'
import { CONFIG_V1 } from '../config'
import { evaluarConImpuesto } from '../presupuesto'
import type { MazoId } from '../tipos'
import { MARGEN_GRAFICA, OPACIDAD_BANDA, RADIO_PUNTO } from './constantesUi'
import { NOMBRE_MAZO, veredictoDe } from './formato'
import type { PropsVista } from './props'

const COSTES_CON_BANDA = Object.keys(CONFIG_V1.bandas)
  .map(Number)
  .sort((a, b) => a - b)
const MAZOS: readonly MazoId[] = ['estasis', 'disonancia']

/**
 * Dispersión de ATQ contra RES de los Campeones, un color por mazo. El rectángulo sombreado es el
 * tope individual del coste elegido y las dos diagonales marcan la suma mínima y máxima de su banda.
 */
export function DispersionStats({ cartas, ancho, alto }: PropsVista) {
  const [elegido, setElegido] = useState<number | null>(null)
  const campeones = cartas.filter((c) => c.tipo === 'Campeón' && c.stats !== null)
  if (campeones.length === 0) return <SinCartas mensaje="Sin Campeones con estos filtros" />

  const costeInicial = COSTES_CON_BANDA.find((c) => campeones.some((x) => x.coste === c)) ?? COSTES_CON_BANDA[0]
  const coste = elegido ?? costeInicial
  const banda = CONFIG_V1.bandas[coste]
  const maximo = Math.max(banda.topeAtq, banda.topeRes, ...campeones.map((c) => Math.max(c.stats?.atq ?? 0, c.stats?.res ?? 0))) + 1

  const puntos = (mazo: MazoId) =>
    campeones
      .filter((c) => c.mazo === mazo)
      .map((c) => ({ nombre: c.nombre, atq: c.stats?.atq ?? 0, res: c.stats?.res ?? 0 }))

  const filas = campeones.map((c) => {
    const ev = evaluarConImpuesto(c)
    return [
      c.nombre,
      c.mazo === null ? '—' : NOMBRE_MAZO[c.mazo],
      String(c.coste),
      String(c.stats?.atq ?? 0),
      String(c.stats?.res ?? 0),
      ev === null ? '—' : veredictoDe(ev),
    ]
  })

  return (
    <section>
      <TituloVista
        titulo="Dispersión de ATQ y RES"
        descripcion="Cada punto es un Campeón. Lo ideal es que caiga entre las dos diagonales (la banda de su coste) y dentro del rectángulo (su tope individual)."
      />
      <div className="mb-3 flex flex-col gap-1">
        <label htmlFor="banda-coste" className="font-display text-xs uppercase tracking-wider text-gray-400">
          Banda del coste
        </label>
        <select
          id="banda-coste"
          value={coste}
          onChange={(e) => setElegido(Number(e.target.value))}
          className="w-32 rounded-lg border border-card-border bg-surface px-2 py-1.5 text-sm text-gray-100"
        >
          {COSTES_CON_BANDA.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-500">
          Coste {coste}: suma de {banda.sumaMin} a {banda.sumaMax}, tope de {banda.topeAtq} de ATQ y {banda.topeRes} de RES.
          Las cartas exentas (Únicas y Soberanos) tienen su propio tope y no entran en estas bandas.
        </p>
      </div>
      <GraficaBase
        titulo="Dispersión de ATQ y RES por mazo"
        descripcion="Eje horizontal: ATQ. Eje vertical: RES. Un color por mazo y la banda del coste elegido sombreada."
        ancho={ancho}
        alto={alto}
        tabla={{
          caption: 'Campeones: coste, ATQ, RES y veredicto',
          columnas: ['Carta', 'Mazo', 'Coste', 'ATQ', 'RES', 'Veredicto'],
          filas,
        }}
      >
        {(w, h) => (
          <ScatterChart width={w} height={h} margin={MARGEN_GRAFICA}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" dataKey="atq" name="ATQ" domain={[0, maximo]} allowDecimals={false} stroke="#9ca3af" />
            <YAxis type="number" dataKey="res" name="RES" domain={[0, maximo]} allowDecimals={false} stroke="#9ca3af" />
            <ZAxis range={[RADIO_PUNTO, RADIO_PUNTO]} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <ReferenceArea
              x1={0}
              x2={banda.topeAtq}
              y1={0}
              y2={banda.topeRes}
              fill="#a78bfa"
              fillOpacity={OPACIDAD_BANDA}
              ifOverflow="hidden"
            />
            <ReferenceLine
              segment={[{ x: 0, y: banda.sumaMin }, { x: banda.sumaMin, y: 0 }]}
              stroke="#a78bfa"
              strokeDasharray="4 4"
              ifOverflow="hidden"
            />
            <ReferenceLine
              segment={[{ x: 0, y: banda.sumaMax }, { x: banda.sumaMax, y: 0 }]}
              stroke="#a78bfa"
              strokeDasharray="4 4"
              ifOverflow="hidden"
            />
            {MAZOS.map((m) => (
              <Scatter key={m} name={NOMBRE_MAZO[m]} data={puntos(m)} fill={COLOR_MAZO[m]} />
            ))}
          </ScatterChart>
        )}
      </GraficaBase>
    </section>
  )
}
