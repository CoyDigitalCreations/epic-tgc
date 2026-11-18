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
 *   Trig      = trigger_apilado de ella (efectos «al invocar / al atacar / al jugar Mística»: lo que Activ NO cuenta)
 *   Murió     = carta_muerta de una copia suya (combate o efecto; una ruptura NO emite carta_muerta)
 *   VRot      = veces que una copia suya, puesta de Vínculo, fue ROTA (ruptura_realizada; el Vínculo roto se queda boca arriba en su slot)
 *   Neg       = veces por partida que esta carta NEGÓ algo (evento activacion_negada con ella como `fuente`: Silencio, Marcha...).
 *               Si una carta de negación tiene Neg ≈ 0, el bot no la está aprovechando (o nunca se arma a tiempo).
 *   Desc      = veces por partida que una copia suya se DESCARTÓ de la mano (límite de 6 al terminar el turno): explica las cartas que se
 *               vieron, no se jugaron y tampoco quedaron en la mano al final
 *   Mano fin  = partidas en que terminó en la mano (la vio y nunca la bajó)
 *   Pagos     = (solo Éter) veces que se pagó como Éter
 *   WR vista / WR jugada = % de victorias de ese mazo en las partidas donde la vio / donde la jugó. Con pocas partidas es ruido:
 *               solo se imprime con n ≥ 15; no comparar cartas entre sí sin muestra grande.
 *
 *   --bot    bot a usar en los dos asientos (ver src/bot/registro.ts)
 *   --n      semillas (cada una son 4 partidas: 2 asientos × 2 mazos)
 *   --desde  primera semilla (default 1)
 *   --procs  procesos en paralelo (default: núcleos - 1)
 *   --mazos  par de mazos a enfrentar, p. ej. mutacion,estasis (default estasis,disonancia)
 *   --json   imprime el resumen crudo (lo usan los procesos hijos)
 *
 * Además de la tabla por carta imprime un «Panorama de partida» por mazo: cómo termina (Vínculos / mazo vacío), tempo (turnos, primera
 * ruptura), presión (ataques, rupturas hechas, Vínculos que le quedan al terminar) y de qué mueren sus cartas.
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import { ALL_CARDS } from '../src/shared/data/paquetes'
import { mazoPorId, type SetId } from '../src/online/mazos'
import { actorActual, applyAction, createInitialState } from '../src/online/game'
import type { GameState, PlayerId } from '../src/online/game'
import { resolverBot } from '../src/bot/registro'

function arg(nombre: string, defecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defecto
}

/** Los mazos son los OFICIALES (con recortes de copias y set estándar): `Cop` es el número de copias que lleva ESE mazo, no el tope del diseño. */
const NOMBRES: Record<SetId, string> = { estasis: 'Estasis', disonancia: 'Disonancia', purga: 'Purga', mutacion: 'Mutacion' }
const diseñosDe = (id: SetId): { id: string; limiteCopias: number }[] => {
  const copias = new Map<string, number>()
  for (const cid of mazoPorId(id)!.cardIds) copias.set(cid, (copias.get(cid) ?? 0) + 1)
  return [...copias].map(([cid, n]) => ({ ...(ALL_CARDS.find((c) => c.id === cid) as object), id: cid, limiteCopias: n }) as { id: string; limiteCopias: number })
}
const TODOS = Object.fromEntries((Object.keys(NOMBRES) as SetId[]).map((id) => [id, [NOMBRES[id], diseñosDe(id)] as const])) as Record<SetId, readonly [string, { id: string; limiteCopias: number }[]]>
const nombresMazos = arg('mazos', 'estasis,disonancia')
const elegidos = nombresMazos.split(',').map((m) => TODOS[m.trim() as keyof typeof TODOS])
if (elegidos.length !== 2 || elegidos.some((e) => !e)) { console.error(`--mazos inválido. Usa dos de: ${Object.keys(TODOS).join(', ')}`); process.exit(1) }
type Mazo = string
const [NOMBRE_1, NOMBRE_2] = elegidos.map((e) => e[0]) as [Mazo, Mazo]
const CARTAS: Record<Mazo, readonly { id: string; limiteCopias?: string | number }[]> = Object.fromEntries(elegidos.map((e) => [e[0], e[1]]))
const MAZOS: Record<Mazo, string[]> = Object.fromEntries(elegidos.map((e) => [e[0], e[1].flatMap((c) => Array.from({ length: c.limiteCopias }, () => c.id))]))

/** Acciones que BAJAN una carta de la mano (o la usan desde la mano). */
const ACCIONES_JUGAR = new Set(['jugar_campeon', 'jugar_mistica', 'jugar_respuesta', 'colocar_vinculo', 'colocar_arcana', 'equipar_artefacto', 'responder_cadena'])
const ACCIONES_ACTIVAR = new Set(['activar_habilidad', 'activar_arcana', 'usar_transmutar'])

interface Ficha {
  copias: number
  /** Partidas (una vez por partida) */
  vista: number; jugada: number; manoFin: number; vicVista: number; vicJugada: number
  /** Eventos (todas las copias) */
  jugadas: number; activaciones: number; muertes: number; pagos: number
  /** Triggers apilados de la carta y veces que una copia suya fue rota estando de Vínculo. */
  triggers: number; vinculosRotos: number
  /** Copias suyas descartadas de la mano (carta_descartada) */
  descartes: number
  /** Veces que una copia suya negó una activación/jugada (activacion_negada con ella de `fuente`) */
  negaciones: number
}

/** Panorama de partida de un MAZO (todo se suma por partida; se divide por `partidas` al imprimir). */
interface Juego {
  primero: number; victPrimero: number
  victVinculos: number; victMazo: number; derrVinculos: number; derrMazo: number; otros: number
  /** Turnos propios jugados */
  turnos: number
  ataques: number; atacantes: number; bloqueos: number
  /** Vínculos rivales que ROMPIÓ; y el turno propio (1 = su primer turno) de su primera ruptura, solo en partidas donde rompió alguno */
  rupturas: number; primeraRupturaTurno: number; primeraRupturaN: number
  /** Al terminar: Vínculos propios SIN romper y Campeones propios en campo */
  vinculosFin: number; campeonesFin: number
  /** Cartas suyas muertas, por causa */
  muertesCombate: number; muertesEfecto: number
  /**
   * Cuando ME atacan (medido al declararse el ataque): ataques recibidos, sus atacantes, mis Campeones en mesa, cuántos de ellos podían
   * bloquear (un Campeón agotado no bloquea) y en cuántos ataques había MÁS atacantes que defensores disponibles (rompen seguro).
   */
  ataquesRecibidos: number; atacantesRecibidos: number; enMesaAlRecibir: number; disponiblesAlRecibir: number; superadosEnNumero: number
  /** Campeones míos que pasaron de enderezados a agotados por una acción del RIVAL (efectos que cambian o fijan el agotamiento) */
  agotadosPorRival: number
}
interface Resumen {
  cartas: Record<Mazo, Record<string, Ficha>>
  juego: Record<Mazo, Juego>
  partidas: Record<Mazo, number>
  victorias: Record<Mazo, number>
}

const ficha = (): Ficha => ({ copias: 0, vista: 0, jugada: 0, manoFin: 0, vicVista: 0, vicJugada: 0, jugadas: 0, activaciones: 0, muertes: 0, pagos: 0, triggers: 0, vinculosRotos: 0, descartes: 0, negaciones: 0 })
const juegoVacio = (): Juego => ({
  primero: 0, victPrimero: 0, victVinculos: 0, victMazo: 0, derrVinculos: 0, derrMazo: 0, otros: 0, turnos: 0,
  ataques: 0, atacantes: 0, bloqueos: 0, rupturas: 0, primeraRupturaTurno: 0, primeraRupturaN: 0,
  vinculosFin: 0, campeonesFin: 0, muertesCombate: 0, muertesEfecto: 0,
  ataquesRecibidos: 0, atacantesRecibidos: 0, enMesaAlRecibir: 0, disponiblesAlRecibir: 0, superadosEnNumero: 0, agotadosPorRival: 0,
})
const vacio = (): Resumen => ({
  cartas: { [NOMBRE_1]: {}, [NOMBRE_2]: {} },
  juego: { [NOMBRE_1]: juegoVacio(), [NOMBRE_2]: juegoVacio() },
  partidas: { [NOMBRE_1]: 0, [NOMBRE_2]: 0 },
  victorias: { [NOMBRE_1]: 0, [NOMBRE_2]: 0 },
})
const de = (res: Resumen, m: Mazo, id: string): Ficha => (res.cartas[m][id] ??= ficha())

function jugar(nombreBot: string, seed: number, mazoA: Mazo, res: Resumen): void {
  const crearBot = () => resolverBot(nombreBot)!
  const botA = crearBot(), botB = crearBot()
  const mazoB: Mazo = mazoA === NOMBRE_1 ? NOMBRE_2 : NOMBRE_1
  const mazoDe = { A: mazoA, B: mazoB } as Record<PlayerId, Mazo>
  const { state, ctx } = createInitialState(MAZOS[mazoA], MAZOS[mazoB], seed)
  let estado: GameState = state
  // Por jugador: instancias vistas / jugadas en ESTA partida (para contar una vez por partida)
  const vistas: Record<PlayerId, Set<string>> = { A: new Set(), B: new Set() }
  const jugadas: Record<PlayerId, Set<string>> = { A: new Set(), B: new Set() }
  const cardIdDe = (id: string) => estado.instances[id]?.cardId as string | undefined
  const turnosPropios: Record<PlayerId, number> = { A: 0, B: 0 }
  const primeraRuptura: Record<PlayerId, number | null> = { A: null, B: null }
  const jg = (j: PlayerId): Juego => res.juego[mazoDe[j]]
  let it = 0
  while (estado.fase !== 'terminada' && it < 6000) {
    const actor: PlayerId = actorActual(estado) ?? estado.turno
    const accion = (actor === 'A' ? botA : botB)(estado, actor)
    if (!accion) break
    // Campeones del RIVAL del que actúa que ahora están enderezados: si tras la acción están agotados, lo causó el que actuó
    const victima: PlayerId = actor === 'A' ? 'B' : 'A'
    const enderezados = new Set(estado.players[victima].campo.campeones.filter((c): c is string => !!c && !estado.instances[c]?.agotado))
    const r = applyAction(estado, accion, ctx)
    if (!r.ok) break
    for (const c of r.state.players[victima].campo.campeones) if (c && enderezados.has(c) && r.state.instances[c]?.agotado) jg(victima).agotadosPorRival++
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
        const g = jg(e.jugador)
        if (e.causa === 'combate') g.muertesCombate++
        else g.muertesEfecto++
        if (cid) de(res, mazoDe[e.jugador], cid).muertes++
      }
      if (e.type === 'carta_descartada') {
        for (const did of e.cardInstanceIds) {
          const cid = r.state.instances[did]?.cardId as string | undefined
          if (cid) de(res, mazoDe[e.jugador], cid).descartes++
        }
      }
      if (e.type === 'trigger_apilado') {
        const cid = r.state.instances[e.cardInstanceId]?.cardId as string | undefined
        if (cid) de(res, mazoDe[e.jugador], cid).triggers++
      }
      // `jugador` = quien niega y `fuente` = la carta que niega: se atribuye a la ficha de ESA carta en el mazo de quien niega
      if (e.type === 'activacion_negada') {
        const cid = r.state.instances[e.fuente]?.cardId as string | undefined
        if (cid) de(res, mazoDe[e.jugador], cid).negaciones++
      }
      if (e.type === 'turno_iniciado') turnosPropios[e.jugador]++
      if (e.type === 'ataque_declarado') {
        const g = jg(e.jugador); g.ataques++; g.atacantes += e.atacanteIds.length
        // El que defiende: cuántos Campeones tiene en mesa y cuántos pueden bloquear (los agotados no)
        const defensor: PlayerId = e.jugador === 'A' ? 'B' : 'A'
        const mesa = r.state.players[defensor].campo.campeones.filter((c): c is string => !!c)
        const disponibles = mesa.filter((c) => !r.state.instances[c]?.agotado).length
        const d = jg(defensor)
        d.ataquesRecibidos++; d.atacantesRecibidos += e.atacanteIds.length; d.enMesaAlRecibir += mesa.length; d.disponiblesAlRecibir += disponibles
        if (e.atacanteIds.length > disponibles) d.superadosEnNumero++
      }
      if (e.type === 'bloqueo_declarado') jg(e.jugador).bloqueos++
      // La ruptura la hace quien tiene el turno (el rival del dueño del Vínculo)
      if (e.type === 'ruptura_realizada') {
        jg(estado.turno).rupturas++
        primeraRuptura[estado.turno] ??= turnosPropios[estado.turno]
        // La víctima es el rival del que ataca; el Vínculo roto sigue en su slot (boca arriba), así que su cardId se lee del estado
        const rival: PlayerId = estado.turno === 'A' ? 'B' : 'A'
        const cid = r.state.instances[e.vinculoId]?.cardId as string | undefined
        if (cid) de(res, mazoDe[rival], cid).vinculosRotos++
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
    // Panorama de partida
    const g = res.juego[m]
    const perdio = estado.ganador != null && !gano
    if (j === estado.primerJugador) { g.primero++; if (gano) g.victPrimero++ }
    if (estado.motivo === 'vinculos' && gano) g.victVinculos++
    else if (estado.motivo === 'vinculos' && perdio) g.derrVinculos++
    else if (estado.motivo === 'mazo_vacio' && gano) g.victMazo++
    else if (estado.motivo === 'mazo_vacio' && perdio) g.derrMazo++
    else g.otros++
    g.turnos += turnosPropios[j]
    if (primeraRuptura[j] != null) { g.primeraRupturaTurno += primeraRuptura[j]!; g.primeraRupturaN++ }
    g.vinculosFin += estado.players[j].vinculos.filter((id) => id && !estado.instances[id]?.bocaArriba).length
    g.campeonesFin += estado.players[j].campo.campeones.filter(Boolean).length
  }
}

function correrAqui(nombreBot: string, desde: number, cuantas: number): Resumen {
  const res = vacio()
  for (let seed = desde; seed < desde + cuantas; seed++) {
    jugar(nombreBot, seed, NOMBRE_1, res)
    jugar(nombreBot, seed, NOMBRE_2, res)
  }
  return res
}

const unir = (partes: Resumen[]): Resumen => {
  const r = vacio()
  for (const p of partes) for (const m of [NOMBRE_1, NOMBRE_2]) {
    r.partidas[m] += p.partidas[m]; r.victorias[m] += p.victorias[m]
    for (const [cid, f] of Object.entries(p.cartas[m])) {
      const t = de(r, m, cid)
      for (const k of Object.keys(t) as (keyof Ficha)[]) t[k] += f[k]
    }
    for (const k of Object.keys(r.juego[m]) as (keyof Juego)[]) r.juego[m][k] += p.juego[m][k]
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
    const hijo = spawn(process.execPath, [...process.execArgv, process.argv[1], '--bot', nombreBot, '--mazos', nombresMazos, '--n', String(cuantas), '--desde', String(d), '--procs', '1', '--json'], { stdio: ['ignore', 'pipe', 'inherit'] })
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
  const filas = Object.entries(r.cartas[m]).map(([cid, f]) => ({ cid, f, c: meta.get(cid) }))
  const noEter = filas.filter((x) => x.c?.type !== 'Éter')
  const eter = filas.filter((x) => x.c?.type === 'Éter')
  console.log(`\n=== ${m} · ${partidas} partidas · victorias ${pct(r.victorias[m], partidas)} ===`)
  console.log('Carta (id · tipo)'.padEnd(46), 'Cop', 'Vista', 'Jugada', '%Jug', 'Activ', ' Trig', 'Murió', ' VRot', ' Desc', '  Neg', 'ManoFin', 'WRvista', 'WRjug')
  // Las que menos se juegan primero: ahí está el hallazgo
  noEter.sort((a, b) => a.f.jugada / Math.max(1, a.f.vista) - b.f.jugada / Math.max(1, b.f.vista))
  for (const { cid, f, c } of noEter) {
    const etiqueta = `${c?.name ?? cid} (${cid} · ${c?.type ?? '?'})`.slice(0, 45)
    console.log(
      etiqueta.padEnd(46),
      String(c?.limiteCopias ?? 1).padStart(3), String(f.vista).padStart(5), String(f.jugada).padStart(6), pct(f.jugada, f.vista).padStart(4),
      (f.activaciones / Math.max(1, partidas)).toFixed(2).padStart(5), (f.triggers / Math.max(1, partidas)).toFixed(2).padStart(5),
      (f.muertes / Math.max(1, partidas)).toFixed(2).padStart(5), (f.vinculosRotos / Math.max(1, partidas)).toFixed(2).padStart(5), (f.descartes / Math.max(1, partidas)).toFixed(2).padStart(5), (f.negaciones / Math.max(1, partidas)).toFixed(2).padStart(5), pct(f.manoFin, f.vista).padStart(7),
      wr(f.vicVista, f.vista).padStart(7), wr(f.vicJugada, f.jugada).padStart(5),
    )
  }
  console.log(`\nÉteres (pagos por partida; la mano no los cuenta: salen de la Reserva)`)
  eter.sort((a, b) => b.f.pagos - a.f.pagos)
  for (const { cid, f, c } of eter) console.log(`  ${(`${c?.name ?? cid} (${cid})`).padEnd(44)} pagos/partida ${(f.pagos / Math.max(1, partidas)).toFixed(2)}`)

  const g = r.juego[m]
  const por = (x: number) => (x / Math.max(1, partidas)).toFixed(2)
  const segundo = partidas - g.primero
  console.log(`\nPanorama de partida (promedios por partida)`)
  console.log(`  Victorias yendo primero ${pct(g.victPrimero, g.primero)} (${g.primero} partidas) · yendo segundo ${pct(r.victorias[m] - g.victPrimero, segundo)} (${segundo} partidas)`)
  console.log(`  Gana por: Vínculos ${g.victVinculos} · mazo vacío ${g.victMazo}   |   Pierde por: Vínculos ${g.derrVinculos} · mazo vacío ${g.derrMazo}   |   otros/empate ${g.otros}`)
  console.log(`  Turnos propios ${por(g.turnos)} · ataques ${por(g.ataques)} (${(g.atacantes / Math.max(1, g.ataques)).toFixed(2)} atacantes c/u) · bloqueos ${por(g.bloqueos)}`)
  console.log(`  Rupturas hechas ${por(g.rupturas)} · 1ª ruptura en su turno ${(g.primeraRupturaTurno / Math.max(1, g.primeraRupturaN)).toFixed(1)} (en ${g.primeraRupturaN} partidas)`)
  console.log(`  Al terminar: Vínculos propios sin romper ${por(g.vinculosFin)} · Campeones en campo ${por(g.campeonesFin)}`)
  console.log(`  Campeones propios muertos: combate ${por(g.muertesCombate)} · efecto ${por(g.muertesEfecto)}`)
  const rec = Math.max(1, g.ataquesRecibidos)
  console.log(`  Cuando me atacan (${por(g.ataquesRecibidos)} ataques por partida): atacantes ${(g.atacantesRecibidos / rec).toFixed(2)} · mis Campeones en mesa ${(g.enMesaAlRecibir / rec).toFixed(2)} · pueden bloquear ${(g.disponiblesAlRecibir / rec).toFixed(2)}`)
  console.log(`  Ataques con MÁS atacantes que defensores disponibles (rompen seguro): ${pct(g.superadosEnNumero, g.ataquesRecibidos)} · Campeones míos agotados por acciones del rival: ${por(g.agotadosPorRival)} por partida`)
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
  imprimir(r, NOMBRE_1)
  imprimir(r, NOMBRE_2)
}

main()
