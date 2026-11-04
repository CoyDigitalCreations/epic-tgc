import { Bar, BarChart, CartesianGrid, Legend, Tooltip, XAxis, YAxis } from 'recharts'
import { aplicarAjustes, simularAjustes } from '../ajuste'
import { GraficaBase } from '../componentes/GraficaBase'
import { SinCartas } from '../componentes/SinCartas'
import { TablaAlternativa } from '../componentes/TablaAlternativa'
import { TituloVista } from '../componentes/TituloVista'
import { CONFIG_V1 } from '../config'
import { espejo, promedioPorCoste } from '../metricas'
import { MARGEN_GRAFICA } from './constantesUi'
import { num } from './formato'
import type { PropsVistaConPool } from './props'

/**
 * Antes y después de los ajustes de stats propuestos, más el espejo Estásis contra Disonancia.
 * La simulación usa todo el conjunto publicado (el pool de letalidad no depende de los filtros) y
 * solo se muestran las cartas visibles. Es exploratoria: no escribe nada.
 */
export function Comparador({ cartas, publicadas, ancho, alto }: PropsVistaConPool) {
  if (cartas.length === 0) return <SinCartas />

  const simulacion = simularAjustes(publicadas ?? cartas)
  const visibles = new Set(cartas.map((c) => c.id))
  const ajustes = simulacion.ajustes.filter((a) => visibles.has(a.id))
  const despues = aplicarAjustes(cartas, ajustes)

  const avisos = ajustes.flatMap((a) => a.avisos.map((texto) => `${a.id}: ${texto}`))

  const antesPorCoste = promedioPorCoste(cartas)
  const despuesPorCoste = promedioPorCoste(despues)
  const costes = [...new Set([...antesPorCoste, ...despuesPorCoste].map((p) => p.coste))].sort((a, b) => a - b)
  const porCoste = costes.map((coste) => ({
    coste,
    antes: antesPorCoste.find((p) => p.coste === coste)?.sumaMedia ?? null,
    despues: despuesPorCoste.find((p) => p.coste === coste)?.sumaMedia ?? null,
    banda: CONFIG_V1.bandas[coste] === undefined ? '—' : `${CONFIG_V1.bandas[coste].sumaMin} a ${CONFIG_V1.bandas[coste].sumaMax}`,
  }))
  const datos = porCoste.map((p) => ({
    coste: `Coste ${p.coste}`,
    Antes: p.antes ?? undefined,
    Después: p.despues ?? undefined,
  }))

  const antes = espejo(cartas)
  const tras = espejo(despues)
  const filaEspejo = (metrica: string, valor: (e: typeof antes.estasis) => string) => [
    metrica,
    valor(antes.estasis),
    valor(tras.estasis),
    valor(antes.disonancia),
    valor(tras.disonancia),
  ]

  return (
    <section>
      <TituloVista
        titulo="Comparador antes y después"
        descripcion="Qué pasaría con los stats de los Campeones fuera de banda si se aplicaran los ajustes propuestos."
      />
      <p role="note" className="mb-4 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
        Ajuste exploratorio: es solo una propuesta para decidir. Esto no cambia las cartas publicadas ni el seed; los
        valores finales se definen después de revisarlos contigo.
      </p>

      {avisos.length > 0 ? (
        <ul aria-label="Avisos del ajuste" className="mb-4 space-y-1 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
          {avisos.map((a) => (
            <li key={a}>
              <strong>Aviso</strong> {a}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-4 text-sm text-gray-500">Sin avisos del ajuste para estas cartas.</p>
      )}

      <TablaAlternativa
        caption="Ajustes propuestos para los Campeones fuera de banda"
        columnas={['Carta', 'Antes (ATQ / RES)', 'Después (ATQ / RES)', 'Mata a (antes → después)', 'Aviso', 'Motivo']}
        filas={ajustes.map((a) => [
          a.nombre,
          `${a.antes.poder} / ${a.antes.resistencia}`,
          `${a.despues.poder} / ${a.despues.resistencia}`,
          a.letalidadAntes === null || a.letalidadDespues === null
            ? '—'
            : `${a.letalidadAntes.mata} → ${a.letalidadDespues.mata} de ${a.letalidadDespues.total}`,
          a.superaTecho ? 'Supera el techo del pool' : '—',
          a.motivo,
        ])}
      />

      <div className="mt-6">
        <GraficaBase
          titulo="Suma media por coste, antes y después"
          descripcion="Barras agrupadas: la suma media de ATQ y RES de los Campeones por coste, sin ajustar y ajustada."
          ancho={ancho}
          alto={alto}
          tabla={{
            caption: 'Suma media por coste, antes y después de los ajustes',
            columnas: ['Coste', 'Antes', 'Después', 'Banda'],
            filas: porCoste.map((p) => [String(p.coste), num(p.antes), num(p.despues), p.banda]),
          }}
        >
          {(w, h) => (
            <BarChart width={w} height={h} data={datos} margin={MARGEN_GRAFICA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="coste" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Legend />
              <Bar dataKey="Antes" fill="#9ca3af" />
              <Bar dataKey="Después" fill="#a78bfa" />
            </BarChart>
          )}
        </GraficaBase>
      </div>

      <div className="mt-6">
        <TablaAlternativa
          caption="Espejo Estásis y Disonancia, antes y después de los ajustes"
          columnas={['Métrica', 'Estásis (antes)', 'Estásis (después)', 'Disonancia (antes)', 'Disonancia (después)']}
          filas={[
            filaEspejo('Cartas', (e) => String(e.conteo)),
            filaEspejo('Suma media', (e) => num(e.sumaMedia)),
            filaEspejo('Poder medio', (e) => num(e.poderMedio)),
            filaEspejo('Identidad (%)', (e) => String(e.porcentajeIdentidad)),
          ]}
        />
      </div>
    </section>
  )
}
