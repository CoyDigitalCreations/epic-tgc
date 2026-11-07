/**
 * Telemetría de mecánicas: cuántas veces el bot USA lo que define a cada mazo.
 *
 *   npx tsx scripts/bot-telemetria.ts --bot dificil --n 20 --procs 8
 *
 * Juega el espejo (el mismo bot en los dos asientos, Estásis contra Disonancia, ambos asientos por semilla) y cuenta, por mazo,
 * los eventos del motor que el jugador de ESE mazo provoca. Responde «¿el bot juega la mecánica, o ni la toca?» antes de tocar
 * la evaluación. Solo lee los eventos de `applyAction`; no modifica motor ni bot.
 *
 *   --bot    bot a usar en los dos asientos (ver src/bot/registro.ts)
 *   --n      semillas (cada una son 4 partidas: 2 asientos × 2 mazos)
 *   --desde  primera semilla (default 1)
 *   --procs  procesos en paralelo (default: núcleos - 1)
 *   --json   imprime el resumen crudo (lo usan los procesos hijos)
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../src/shared/data/paquetes'
import { actorActual, applyAction, createInitialState } from '../src/online/game'
import type { GameEvent, GameState, PlayerId } from '../src/online/game'
import { resolverBot } from '../src/bot/registro'

function arg(nombre: string, defecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defecto
}

const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))

const MAZOS = { Estasis: expandir(ESTASIS_CARDS), Disonancia: expandir(DISONANCIA_CARDS) }
type Mazo = keyof typeof MAZOS

/** Contadores por mazo. `partidas` y `turnos` sirven para normalizar a «por partida». */
type Cuentas = Record<string, number>
type Resumen = Record<Mazo, Cuentas>

const vacio = (): Resumen => ({ Estasis: {}, Disonancia: {} })
const sumar = (c: Cuentas, k: string, n = 1) => { c[k] = (c[k] ?? 0) + n }

/** Cuenta los eventos de UNA acción. `quien` es el jugador que actuó (el que paga el Peaje al bloquear). */
function contar(evs: readonly GameEvent[], mazoDe: Record<PlayerId, Mazo>, res: Resumen): void {
  const hayBloqueo = evs.some((e) => e.type === 'bloqueo_declarado')
  for (const e of evs) {
    switch (e.type) {
      case 'eter_robado': sumar(res[mazoDe[e.jugador]], 'Éter arrebatado'); break
      case 'carta_exiliada': sumar(res[mazoDe[e.jugador]], 'Cartas exiliadas (de su lado)'); break
      case 'carta_devuelta_a_mano': sumar(res[mazoDe[e.jugador]], 'Cartas devueltas a la mano'); break
      case 'carta_activada': sumar(res[mazoDe[e.jugador]], 'Habilidades/Arcanas activadas'); break
      case 'mazo_mirado': sumar(res[mazoDe[e.jugador]], 'Mazo mirado (scry/tutor)'); break
      case 'carta_descartada': sumar(res[mazoDe[e.jugador]], 'Cartas descartadas (propias)', e.cardInstanceIds.length); break
      case 'campeon_robado': sumar(res[mazoDe[e.jugador]], 'Campeones robados'); break
      // OJO: `jugador` es el DUEÑO del Éter, no quien lo mueve. Contra el rival (DS-006/016/017/027) lo sufre su dueño.
      case 'eter_movido': sumar(res[mazoDe[e.jugador]], `Éter propio movido → ${e.destino} (lo sufre su dueño)`); break
      case 'carta_salida_de_zona':
        if (e.zona === '1G' || e.zona === '2G' || e.zona === '3G') sumar(res[mazoDe[e.jugador]], `Cartas salen de ${e.zona}`)
        break
      case 'eter_pagado':
        // Peaje: el pago ocurre en la misma acción que la declaración del bloqueo
        if (hayBloqueo) sumar(res[mazoDe[e.jugador]], 'Éter pagado en Peaje', e.costo)
        break
      case 'bloqueo_declarado':
        sumar(res[mazoDe[e.jugador]], 'Declaraciones de bloqueo')
        sumar(res[mazoDe[e.jugador]], 'Campeones que bloquean', Object.keys(e.asignaciones).length)
        break
      case 'ataque_declarado': sumar(res[mazoDe[e.jugador]], 'Ataques declarados'); break
      default: break
    }
  }
}

function jugar(nombreBot: string, seed: number, mazoA: Mazo, res: Resumen): void {
  const crearBot = () => resolverBot(nombreBot)!
  const botA = crearBot(), botB = crearBot()
  const mazoB: Mazo = mazoA === 'Estasis' ? 'Disonancia' : 'Estasis'
  const mazoDe = { A: mazoA, B: mazoB } as Record<PlayerId, Mazo>
  const { state, ctx } = createInitialState(MAZOS[mazoA], MAZOS[mazoB], seed)
  let estado: GameState = state
  let it = 0
  let turnos = 0
  while (estado.fase !== 'terminada' && it < 6000) {
    const actor: PlayerId = actorActual(estado) ?? estado.turno
    const accion = (actor === 'A' ? botA : botB)(estado, actor)
    if (!accion) break
    const r = applyAction(estado, accion, ctx)
    if (!r.ok) break
    contar(r.events, mazoDe, res)
    turnos += r.events.filter((e) => e.type === 'turno_iniciado').length
    estado = r.state
    it++
  }
  for (const m of [mazoA, mazoB]) sumar(res[m], 'partidas')
  sumar(res[mazoA], 'turnos', turnos)
  sumar(res[mazoB], 'turnos', turnos)
  if (estado.ganador) sumar(res[mazoDe[estado.ganador]], 'victorias')
}

function correrAqui(nombreBot: string, desde: number, cuantas: number): Resumen {
  const res = vacio()
  for (let seed = desde; seed < desde + cuantas; seed++) {
    jugar(nombreBot, seed, 'Estasis', res) // Estásis en A
    jugar(nombreBot, seed, 'Disonancia', res) // Disonancia en A
  }
  return res
}

const unir = (partes: Resumen[]): Resumen => {
  const r = vacio()
  for (const p of partes) for (const m of Object.keys(r) as Mazo[]) for (const [k, v] of Object.entries(p[m])) sumar(r[m], k, v)
  return r
}

const nombreBot = arg('bot', 'dificil')
const n = Number(arg('n', '20'))
const desde = Number(arg('desde', '1'))
const procs = Math.max(1, Math.min(n, Number(arg('procs', String(Math.max(1, os.cpus().length - 1))))))

if (!resolverBot(nombreBot)) { console.error(`Bot desconocido: ${nombreBot}`); process.exit(1) }

function correrHijo(d: number, cuantas: number): Promise<Resumen> {
  return new Promise((ok, mal) => {
    const hijo = spawn(process.execPath, [...process.execArgv, process.argv[1], '--bot', nombreBot, '--n', String(cuantas), '--desde', String(d), '--procs', '1', '--json'], { stdio: ['ignore', 'pipe', 'inherit'] })
    let salida = ''
    hijo.stdout.on('data', (b) => { salida += b })
    hijo.on('close', (code) => {
      try { ok(JSON.parse(salida.trim().split('\n').pop()!)) } catch { mal(new Error(`hijo ${d} salió con ${code}: ${salida.slice(-200)}`)) }
    })
  })
}

async function main(): Promise<void> {
  if (process.argv.includes('--json')) { console.log(JSON.stringify(correrAqui(nombreBot, desde, n))); return }
  const t0 = Date.now()
  let r: Resumen
  if (procs === 1) r = correrAqui(nombreBot, desde, n)
  else {
    const base = Math.floor(n / procs), extra = n % procs
    const trabajos: Promise<Resumen>[] = []
    let d = desde
    for (let i = 0; i < procs; i++) {
      const cuantas = base + (i < extra ? 1 : 0)
      if (cuantas > 0) trabajos.push(correrHijo(d, cuantas))
      d += cuantas
    }
    r = unir(await Promise.all(trabajos))
  }
  const partidas = r.Estasis.partidas ?? 0
  console.log(`\nTelemetría de mecánicas · bot ${nombreBot} · espejo · ${partidas} partidas por mazo · ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  console.log(`Victorias: Estásis ${r.Estasis.victorias ?? 0} · Disonancia ${r.Disonancia.victorias ?? 0} · turnos promedio ${((r.Estasis.turnos ?? 0) / Math.max(1, partidas)).toFixed(1)}`)
  const claves = [...new Set([...Object.keys(r.Estasis), ...Object.keys(r.Disonancia)])].filter((k) => !['partidas', 'turnos', 'victorias'].includes(k)).sort()
  const por = (m: Mazo, k: string) => ((r[m][k] ?? 0) / Math.max(1, partidas)).toFixed(2)
  const ancho = Math.max(...claves.map((k) => k.length))
  console.log(`\n${'Por partida'.padEnd(ancho)}  Estásis  Disonancia`)
  for (const k of claves) console.log(`${k.padEnd(ancho)}  ${por('Estasis', k).padStart(7)}  ${por('Disonancia', k).padStart(10)}`)
}

main()
