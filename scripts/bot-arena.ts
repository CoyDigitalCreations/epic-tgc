/**
 * Enfrenta dos bots y reporta el porcentaje de victorias.
 *
 *   npx tsx scripts/bot-arena.ts --x dificil --y base-dificil --n 40 --procs 8
 *
 *   --x / --y   bots (ver src/bot/registro.ts)
 *   --n         semillas (cada una son 4 partidas: 2 asientos × 2 mazos)
 *   --desde     primera semilla (default 1)
 *   --procs     procesos en paralelo (default: núcleos - 1)
 *   --json      imprime el resumen crudo (lo usan los procesos hijos)
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../src/shared/data/paquetes'
import { torneo, unir } from '../src/bot/arena'
import type { ResumenTorneo } from '../src/bot/arena'
import { BOTS, resolverBot } from '../src/bot/registro'

function arg(nombre: string, defecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defecto
}

const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))

const nx = arg('x', 'dificil')
const ny = arg('y', 'base-dificil')
const n = Number(arg('n', '40'))
const desde = Number(arg('desde', '1'))
const procs = Math.max(1, Math.min(n, Number(arg('procs', String(Math.max(1, os.cpus().length - 1))))))
const soloJson = process.argv.includes('--json')

const botX = resolverBot(nx), botY = resolverBot(ny)
if (!botX || !botY) {
  console.error(`Bot desconocido. Disponibles: ${Object.keys(BOTS).join(', ')}`)
  process.exit(1)
}

function correrAqui(d: number, cuantas: number): ResumenTorneo {
  return torneo(botX!, botY!, [
    { nombre: 'Estasis', cartas: expandir(ESTASIS_CARDS) },
    { nombre: 'Disonancia', cartas: expandir(DISONANCIA_CARDS) },
  ], cuantas, d)
}

function correrHijo(d: number, cuantas: number): Promise<ResumenTorneo> {
  return new Promise((ok, mal) => {
    const hijo = spawn(process.execPath, [...process.execArgv, process.argv[1], '--x', nx, '--y', ny, '--n', String(cuantas), '--desde', String(d), '--procs', '1', '--json'], { stdio: ['ignore', 'pipe', 'inherit'] })
    let salida = ''
    hijo.stdout.on('data', (b) => { salida += b })
    hijo.on('close', (code) => {
      try { ok(JSON.parse(salida.trim().split('\n').pop()!)) } catch { mal(new Error(`hijo ${d} salió con ${code}: ${salida.slice(-200)}`)) }
    })
  })
}

const pct = (g: number, j: number) => (j ? `${((100 * g) / j).toFixed(1)}%` : '—')

async function main(): Promise<void> {
  if (soloJson) { console.log(JSON.stringify(correrAqui(desde, n))); return }
  const t0 = Date.now()
  let r: ResumenTorneo
  if (procs === 1) r = correrAqui(desde, n)
  else {
    // Reparte las semillas en `procs` bloques contiguos
    const base = Math.floor(n / procs), extra = n % procs
    const trabajos: Promise<ResumenTorneo>[] = []
    let d = desde
    for (let i = 0; i < procs; i++) {
      const cuantas = base + (i < extra ? 1 : 0)
      if (cuantas > 0) trabajos.push(correrHijo(d, cuantas))
      d += cuantas
    }
    r = unir(await Promise.all(trabajos))
  }
  console.log(`\n${nx} (X)  vs  ${ny} (Y) — ${r.partidas} partidas (${n} semillas × 4 combinaciones), ${((Date.now() - t0) / 1000).toFixed(1)} s, ${procs} proc.`)
  console.log(`  X gana ${r.victoriasX} · Y gana ${r.victoriasY} · empates ${r.empates} · anomalías ${r.anomalias}`)
  console.log(`  VICTORIAS DE X (sobre decididas): ${r.porcentajeX.toFixed(1)}%`)
  console.log(`  X como A: ${pct(r.porAsiento.comoA.ganadas, r.porAsiento.comoA.jugadas)} · X como B: ${pct(r.porAsiento.comoB.ganadas, r.porAsiento.comoB.jugadas)}`)
  console.log(`  X por mazo: ${Object.entries(r.porMazo).map(([k, v]) => `${k} ${pct(v.ganadas, v.jugadas)}`).join(' · ')}`)
  console.log(`  turnos promedio: ${r.promedioTurnos.toFixed(1)} · fin: ${Object.entries(r.motivos).map(([k, v]) => `${k}=${v}`).join(', ')}`)
  for (const d of r.detallesAnomalias) console.log(`  ⚠ ${d}`)
}

main()
