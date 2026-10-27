/**
 * Enfrenta dos bots y reporta el porcentaje de victorias.
 *
 *   npx tsx scripts/bot-arena.ts --x base-dificil --y base-facil --n 50
 *
 * Bots: base-facil | base-medio | base-dificil (los originales del motor). Los del módulo nuevo se registran en src/bot/registro.ts.
 */
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../src/shared/data/paquetes'
import { torneo } from '../src/bot/arena'
import { BOTS } from '../src/bot/registro'

function arg(nombre: string, defecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defecto
}

const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))

const nx = arg('x', 'base-dificil')
const ny = arg('y', 'base-facil')
const n = Number(arg('n', '50'))
const desde = Number(arg('desde', '1'))
if (!BOTS[nx] || !BOTS[ny]) {
  console.error(`Bot desconocido. Disponibles: ${Object.keys(BOTS).join(', ')}`)
  process.exit(1)
}

const t0 = Date.now()
const r = torneo(BOTS[nx], BOTS[ny], [
  { nombre: 'Estasis', cartas: expandir(ESTASIS_CARDS) },
  { nombre: 'Disonancia', cartas: expandir(DISONANCIA_CARDS) },
], n, desde)

const pct = (g: number, j: number) => (j ? `${((100 * g) / j).toFixed(1)}%` : '—')
console.log(`\n${nx} (X)  vs  ${ny} (Y) — ${r.partidas} partidas (${n} semillas × 4 combinaciones), ${((Date.now() - t0) / 1000).toFixed(1)} s`)
console.log(`  X gana ${r.victoriasX} · Y gana ${r.victoriasY} · empates ${r.empates} · anomalías ${r.anomalias}`)
console.log(`  VICTORIAS DE X (sobre decididas): ${r.porcentajeX.toFixed(1)}%`)
console.log(`  X como A: ${pct(r.porAsiento.comoA.ganadas, r.porAsiento.comoA.jugadas)} · X como B: ${pct(r.porAsiento.comoB.ganadas, r.porAsiento.comoB.jugadas)}`)
console.log(`  X por mazo: ${Object.entries(r.porMazo).map(([k, v]) => `${k} ${pct(v.ganadas, v.jugadas)}`).join(' · ')}`)
console.log(`  turnos promedio: ${r.promedioTurnos.toFixed(1)} · fin: ${Object.entries(r.motivos).map(([k, v]) => `${k}=${v}`).join(', ')}`)
for (const d of r.detallesAnomalias) console.log(`  ⚠ ${d}`)
