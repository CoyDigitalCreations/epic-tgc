/**
 * Telemetría POR CARTA: de cada carta de cada mazo, cuántas veces el bot la ve, la juega, la activa y qué pasa con ella.
 *
 *   npx tsx scripts/bot-telemetria-cartas.ts --bot dificil --n 20 --procs 8
 *
 * Mismo espejo que `bot-telemetria.ts` (Estásis contra Disonancia, ambos asientos por semilla). Responde «¿esta carta se juega o se
 * queda en la mano?» y «¿el mazo gana más cuando la juega?». Solo lee `applyAction`; no modifica motor ni bot.
 *
 *   Vista     = estuvo en la mano después del mulligan (cuenta una vez por partida, aunque haya varias copias)
 *   Jugada    = el jugador la bajó/colocó/respondió con ella (acciones jugar_*, colocar_*, equipar, responder_cadena)
 *   Activ.    = activar_habilidad / activar_arcana / usar_transmutar con ella
 *   Murió     = evento carta_muerta de una copia suya
 *   Mano fin  = partidas en que terminó en la mano (la vio y nunca la bajó)
 *   Pagos     = (solo Éter) veces que se pagó como Éter
 *   WR vista / WR jugada = % de victorias de ese mazo en las partidas donde la vio / donde la jugó. Con pocas partidas es ruido:
 *               solo se imprime con n ≥ 15; no comparar cartas entre sí sin muestra grande.
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
import type { GameState, PlayerId } from '../src/online/game'
import { resolverBot } from '../src/bot/registro'

function arg(nombre: string, defecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defecto
}

const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))

const CARTAS = { Estasis: ESTASIS_CARDS, Disonancia: DISONANCIA_CARDS }
const MAZOS = { Estasis: expandir(ESTASIS_CARDS), Disonancia: expandir(DISONANCIA_CARDS) }
type Mazo = keyof typeof MAZOS

/** Acciones que BAJAN una carta de la mano (o la usan desde la mano). */
const ACCIONES_JUGAR = new Set(['jugar_campeon', 'jugar_mistica', 'jugar_respuesta', 'colocar_vinculo', 'colocar_arcana', 'equipar_artefacto', 'responder_cadena'])
const ACCIONES_ACTIVAR = new Set(['activar_habilidad', 'activar_arcana', 'usar_transmutar'])

interface Ficha {
  copias: number
  /** Partidas (una vez por partida) */
  vista: number; jugada: number; manoFin: number; vicVista: number; vicJugada: number
  /** Eventos (todas las copias) */
  jugadas: number; activaciones: number; muertes: number; pagos: number
}
type Resumen = Record<Mazo, Record<string, Ficha>> & { partidas: Record<Mazo, number>; victorias: Record<Mazo, number> }

const ficha = (): Ficha => ({ copias: 0, vista: 0, jugada: 0, manoFin: 0, vicVista: 0, vicJugada: 0, jugadas: 0, activaciones: 0, muertes: 0, pagos: 0 })
const vacio = (): Resumen => ({ Estasis: {}, Disonancia: {}, partidas: { Estasis: 0, Disonancia: 0 }, victorias: { Estasis: 0, Disonancia: 0 } })
const de = (res: Resumen, m: Mazo, id: string): Ficha => (res[m][id] ??= ficha())

function jugar(nombreBot: string, seed: number, mazoA: Mazo, res: Resumen): void {
  const crearBot = () => resolverBot(nombreBot)!
  const botA = crearBot(), botB = crearBot()
  const mazoB: Mazo = mazoA === 'Estasis' ? 'Disonancia' : 'Estasis'
  const mazoDe = { A: mazoA, B: mazoB } as Record<PlayerId, Mazo>
  const { state, ctx } = createInitialState(MAZOS[mazoA], MAZOS[mazoB], seed)
  let estado: GameState = state
  // Por jugador: instancias vistas / jugadas en ESTA partida (para contar una vez por partida)
  const vistas: Record<PlayerId, Set<string>> = { A: new Set(), B: new Set() }
  const jugadas: Record<PlayerId, Set<string>> = { A: new Set(), B: new Set() }
  const cardIdDe = (id: string) => estado.instances[id]?.cardId as string | undefined
  let it = 0
  while (estado.fase !== 'terminada' && it < 6000) {
    const actor: PlayerId = actorActual(estado) ?? estado.turno
    const accion = (actor === 'A' ? botA : botB)(estado, actor)
    if (!accion) break
    const r = applyAction(estado, accion, ctx)
    if (!r.ok) break
    // «Vista»: en la mano ya terminado el mulligan (pre_partida)
    if (r.state.fase !== 'pre_partida') for (const j of ['A', 'B'] as PlayerId[]) for (const id of r.state.players[j].mano) vistas[j].add(id)
    const id = (accion as { cardInstanceId?: string }).cardInstanceId
    if (id) {
      const cid = r.state.instances[id]?.cardId as string | undefined
      if (cid) {
        if (ACCIONES_JUGAR.has(accion.type)) { de(res, mazoDe[actor], cid).jugadas++; jugadas[actor].add(id) }
        if (ACCIONES_ACTIVAR.has(accion.type)) de(res, mazoDe[actor], cid).activaciones++
      }
    }
    for (const e of r.events) {
      if (e.type === 'carta_muerta') {
        const cid = r.state.instances[e.cardInstanceId]?.cardId as string | undefined
        if (cid) de(res, mazoDe[e.jugador], cid).muertes++
      }
      // Un pago se atribuye al DUEÑO de la carta Éter: el Éter arrebatado (steal_ether) paga costes del rival pero sigue siendo del otro mazo
      if (e.type === 'eter_pagado') for (const eid of e.eterIds) {
        const inst = r.state.instances[eid]
        if (inst?.cardId) de(res, mazoDe[inst.owner as PlayerId], inst.cardId as string).pagos++
      }
    }
    estado = r.state
    it++
  }
  // Cierre de partida: una vez por partida y por carta (varias copias cuentan como una)
  for (const j of ['A', 'B'] as PlayerId[]) {
    const m = mazoDe[j]
    const gano = estado.ganador === j
    const porCarta = new Map<string, { vista: boolean; jugada: boolean; manoFin: boolean }>()
    for (const id of vistas[j]) {
      const cid = cardIdDe(id); if (!cid) continue
      const f = porCarta.get(cid) ?? { vista: false, jugada: false, manoFin: false }
      f.vista = true
      if (jugadas[j].has(id)) f.jugada = true
      if (estado.players[j].mano.includes(id)) f.manoFin = true
      porCarta.set(cid, f)
    }
    for (const [cid, f] of porCarta) {
      const fi = de(res, m, cid)
      if (f.vista) { fi.vista++; if (gano) fi.vicVista++ }
      if (f.jugada) { fi.jugada++; if (gano) fi.vicJugada++ }
      if (f.manoFin) fi.manoFin++
    }
    res.partidas[m]++
    if (gano) res.victorias[m]++
  }
}

function correrAqui(nombreBot: string, desde: number, cuantas: number): Resumen {
  const res = vacio()
  for (let seed = desde; seed < desde + cuantas; seed++) {
    jugar(nombreBot, seed, 'Estasis', res)
    jugar(nombreBot, seed, 'Disonancia', res)
  }
  return res
}

const unir = (partes: Resumen[]): Resumen => {
  const r = vacio()
  for (const p of partes) for (const m of ['Estasis', 'Disonancia'] as Mazo[]) {
    r.partidas[m] += p.partidas[m]; r.victorias[m] += p.victorias[m]
    for (const [cid, f] of Object.entries(p[m])) {
      const t = de(r, m, cid)
      for (const k of Object.keys(t) as (keyof Ficha)[]) t[k] += f[k]
    }
  }
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

const pct = (a: number, b: number) => (b > 0 ? `${((100 * a) / b).toFixed(0)}%` : '—')
/** El WR solo se imprime con muestra mínima: por debajo es ruido y engaña. */
const MIN_WR = 15
const wr = (v: number, p: number) => (p >= MIN_WR ? pct(v, p) : '—')

function imprimir(r: Resumen, m: Mazo): void {
  const partidas = r.partidas[m]
  const meta = new Map(CARTAS[m].map((c) => [c.id, c as unknown as { id: string; name: string; type: string; limiteCopias?: string | number }]))
  const filas = Object.entries(r[m]).map(([cid, f]) => ({ cid, f, c: meta.get(cid) }))
  const noEter = filas.filter((x) => x.c?.type !== 'Éter')
  const eter = filas.filter((x) => x.c?.type === 'Éter')
  console.log(`\n=== ${m} · ${partidas} partidas · victorias ${pct(r.victorias[m], partidas)} ===`)
  console.log('Carta (id · tipo)'.padEnd(46), 'Cop', 'Vista', 'Jugada', '%Jug', 'Activ', 'Murió', 'ManoFin', 'WRvista', 'WRjug')
  // Las que menos se juegan primero: ahí está el hallazgo
  noEter.sort((a, b) => a.f.jugada / Math.max(1, a.f.vista) - b.f.jugada / Math.max(1, b.f.vista))
  for (const { cid, f, c } of noEter) {
    const etiqueta = `${c?.name ?? cid} (${cid} · ${c?.type ?? '?'})`.slice(0, 45)
    console.log(
      etiqueta.padEnd(46),
      String(c?.limiteCopias ?? 1).padStart(3), String(f.vista).padStart(5), String(f.jugada).padStart(6), pct(f.jugada, f.vista).padStart(4),
      (f.activaciones / Math.max(1, partidas)).toFixed(2).padStart(5), (f.muertes / Math.max(1, partidas)).toFixed(2).padStart(5), pct(f.manoFin, f.vista).padStart(7),
      wr(f.vicVista, f.vista).padStart(7), wr(f.vicJugada, f.jugada).padStart(5),
    )
  }
  console.log(`\nÉteres (pagos por partida; la mano no los cuenta: salen de la Reserva)`)
  eter.sort((a, b) => b.f.pagos - a.f.pagos)
  for (const { cid, f, c } of eter) console.log(`  ${(`${c?.name ?? cid} (${cid})`).padEnd(44)} pagos/partida ${(f.pagos / Math.max(1, partidas)).toFixed(2)}`)
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
  console.log(`\nTelemetría por carta · bot ${nombreBot} · espejo · ${((Date.now() - t0) / 1000).toFixed(1)} s`)
  console.log(`WR = victorias del mazo en esas partidas (solo con ≥ ${MIN_WR} partidas; es correlación, no causa)`)
  imprimir(r, 'Estasis')
  imprimir(r, 'Disonancia')
}

main()
