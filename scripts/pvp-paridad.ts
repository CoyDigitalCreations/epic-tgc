/**
 * Simula el modelo de servidor del PvP (supabase/functions/match-engine) y mide dónde se separa de una partida normal.
 *
 *   npx tsx scripts/pvp-paridad.ts --n 10 [--desde 1] [--bot medio]
 *
 * En cada paso reproduce lo que hace la Edge Function:
 *   1. el estado vive como JSON (jsonb): se serializa y se vuelve a leer antes de CADA acción;
 *   2. el generador aleatorio se reconstruye con `createCtxFromDraws(seed, rngDraws)`;
 *   3. el cliente solo ve `visibleState` y calcula sus acciones con `getValidActions` sobre esa vista.
 * Y comprueba:
 *   A. REPETIBILIDAD: la partida «con base de datos» termina igual que la que vive en memoria (mismo estado en cada paso);
 *   B. PARIDAD CLIENTE↔SERVIDOR: las acciones que ofrece el cliente (vista oculta) son las mismas que ve el servidor (estado completo);
 *   C. ACEPTACIÓN: toda acción que el cliente ofrece la acepta el servidor (si no, el jugador vería un botón que falla);
 *   D. ATASCOS: el actor siempre tiene al menos una acción útil, y la partida termina.
 */
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../src/shared/data/paquetes'
import { actorActual, applyAction, createCtxFromDraws, createInitialState, getValidActions, visibleState } from '../src/online/game'
import type { Action, GameState, PlayerId } from '../src/online/game'
import { crearBotNivel } from '../src/bot/niveles'

function arg(nombre: string, defecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defecto
}

const n = Number(arg('n', '10'))
const desde = Number(arg('desde', '1'))
const nivel = arg('bot', 'medio') as 'facil' | 'medio' | 'dificil'
const MAX_PASOS = 4000

const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))
const MAZOS = [
  { nombre: 'Estasis', cartas: expandir(ESTASIS_CARDS) },
  { nombre: 'Disonancia', cartas: expandir(DISONANCIA_CARDS) },
]

const clave = (a: Action) => JSON.stringify(a)

/** JSON con las claves ordenadas: el ORDEN de las claves de un objeto no es información (lo que importa son los valores). */
const canon = (x: unknown): string => JSON.stringify(x, (_k, v) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([p], [q]) => (p < q ? -1 : 1))) : v))

/** Primera ruta donde dos valores (ya pasados por JSON) difieren, para saber QUÉ no sobrevive al viaje por la base de datos. */
function primeraDiferencia(a: unknown, b: unknown, ruta = ''): string | null {
  if (canon(a) === canon(b)) return null
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return `${ruta}: ${JSON.stringify(a)} ≠ ${JSON.stringify(b)}`
  const ka = Object.keys(a as object), kb = Object.keys(b as object)
  for (const k of new Set([...ka, ...kb])) {
    const d = primeraDiferencia((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${ruta}.${k}`)
    if (d) return d
  }
  return `${ruta}: difieren`
}
const viaJson = <T>(x: T): T => JSON.parse(JSON.stringify(x))

interface Hallazgo { tipo: string; detalle: string }
const hallazgos = new Map<string, { cuenta: number; ejemplos: string[] }>()
function anotar(tipo: string, detalle: string): void {
  const h = hallazgos.get(tipo) ?? { cuenta: 0, ejemplos: [] }
  h.cuenta++
  if (h.ejemplos.length < Number(arg('ejemplos', '3'))) h.ejemplos.push(detalle)
  hallazgos.set(tipo, h)
}

let partidas = 0, terminadas = 0, pasos = 0, accionesCliente = 0

function jugar(seed: number, ia: number, ib: number): void {
  const etiqueta = `seed ${seed} A=${MAZOS[ia].nombre} B=${MAZOS[ib].nombre}`
  partidas++
  const ini = createInitialState(MAZOS[ia].cartas, MAZOS[ib].cartas, seed)
  // Referencia en memoria (como el modo contra el bot) y réplica «servidor» (JSON + ctx reconstruido)
  let ref: GameState = ini.state
  const refCtx = ini.ctx
  let persistido = JSON.stringify({ state: ini.state, rngDraws: ini.ctx.draws })
  const ultimas: string[] = []
  let pendVisto = false
  const bots: Record<PlayerId, ReturnType<typeof crearBotNivel>> = { A: crearBotNivel(nivel), B: crearBotNivel(nivel) }

  for (let paso = 0; paso < MAX_PASOS; paso++) {
    const srv: { state: GameState; rngDraws: number } = JSON.parse(persistido)
    const actor = actorActual(srv.state)
    if (!actor) { terminadas++; return }
    pasos++
    if (actorActual(ref) !== actor) { anotar('actor-distinto', `${etiqueta} paso ${paso}: servidor=${actor} memoria=${actorActual(ref)}`); return }

    // B. paridad de acciones cliente↔servidor
    let delCliente: Action[] = []
    try {
      delCliente = getValidActions(visibleState(srv.state, actor), actor)
    } catch (e) {
      anotar('cliente-revienta', `${etiqueta} paso ${paso} fase ${srv.state.fase}: ${(e as Error).message}`)
    }
    const delServidor = getValidActions(structuredClone(srv.state), actor)
    const sc = new Set(delCliente.map(clave)), ss = new Set(delServidor.map(clave))
    const sobran = [...sc].filter((k) => !ss.has(k)), faltan = [...ss].filter((k) => !sc.has(k))
    if (sobran.length) anotar('cliente-ofrece-de-mas', `${etiqueta} paso ${paso} fase ${srv.state.fase}: ${sobran[0].slice(0, 160)}`)
    if (faltan.length) anotar('cliente-no-ofrece', `${etiqueta} paso ${paso} fase ${srv.state.fase}: ${faltan[0].slice(0, 160)}`)

    // C. el servidor acepta lo que ofrece el cliente (solo acciones que no terminan la partida)
    for (const a of delCliente) {
      if (a.type === 'rendirse') continue
      accionesCliente++
      const r = applyAction(structuredClone(srv.state), a, createCtxFromDraws(seed, srv.rngDraws))
      if (!r.ok) anotar('servidor-rechaza-oferta', `${etiqueta} paso ${paso} fase ${srv.state.fase}: ${clave(a).slice(0, 140)} → ${r.error}`)
    }

    // D. el actor tiene qué hacer
    // getValidActions limpia pendientes obsoletos EN el estado que recibe: el bot trabaja sobre una copia para no alterar lo persistido
    const elegida = bots[actor](structuredClone(srv.state), actor)
    if (!elegida) { {
      const s = srv.state as unknown as Record<string, unknown>
      const pendientes = ['equiparPendiente', 'objetivosPendientes', 'opcionesPendientes', 'preventivosPendientes', 'declaracionEnEleccion', 'cadena', 'combate', 'scry'].filter((k) => { const v = s[k]; return Array.isArray(v) ? v.length > 0 : !!v }).join(',')
      const enMemoria = getValidActions(structuredClone(ref), actorActual(ref) ?? actor).map((x) => x.type).join(',')
      const ep = srv.state.equiparPendiente
      const inst = ep ? srv.state.instances[ep.artefactoId] : undefined
      const detalle = ep
        ? ` | equip: ${inst?.cardId} de ${ep.jugador} (${ep.contexto}), equipadoA=${inst?.equipadoA ?? '—'}, campeones de ${ep.jugador}=${srv.state.players[ep.jugador].campo.campeones.filter(Boolean).length}, zonaMist=${srv.state.players[ep.jugador].campo.misticasTacticas.includes(ep.artefactoId)} zonaArc=${srv.state.players[ep.jugador].campo.arcanasCombate.includes(ep.artefactoId)}`
        : ''
      anotar('atasco', `${etiqueta} paso ${paso} fase ${srv.state.fase} actor ${actor}: sin acción útil (servidor ofrece ${delServidor.map((x) => x.type).join(',')}; en memoria ofrece ${enMemoria}; pendientes: ${pendientes || 'ninguno'})${detalle}
        últimas jugadas: ${ultimas.slice(Math.max(0, ultimas.lastIndexOf(ultimas.filter((u) => u.startsWith('###')).pop() ?? '') - 3)).join(' || ')}`)
    }; return }

    ultimas.push(`${actor}:${clave(elegida).slice(0, 110)}`)
    if (ultimas.length > 40) ultimas.shift()
    if (srv.state.equiparPendiente && !pendVisto) { pendVisto = true; ultimas.push(`### aparece equiparPendiente (paso ${paso})`) }
    if (!srv.state.equiparPendiente) pendVisto = false
    if (process.argv.includes('--traza') && etiqueta.startsWith(arg('traza-de', 'seed 1 A=Disonancia'))) {
      const ep = srv.state.equiparPendiente
      const art = ep ? srv.state.instances[ep.artefactoId] : undefined
      const donde = ep ? (['campeones', 'misticasTacticas', 'arcanasCombate'] as const).flatMap((z) => (['A', 'B'] as const).filter((p) => (srv.state.players[p].campo[z] as (string | null)[]).includes(ep.artefactoId)).map((p) => `${p}.${z}`)).join('+') || 'FUERA DEL CAMPO' : ''
      console.log(`  [${paso}] ${actor} ${srv.state.fase}${srv.state.cadena ? ' CADENA' : ''}: ${clave(elegida).slice(0, 150)}${ep ? `   << pend ${art?.cardId} ${ep.contexto} de ${ep.jugador}, en ${donde}, boca arriba=${art?.bocaArriba}` : ''}`)
    }
    // Paso del servidor: estado leído de la BD, ctx reconstruido por draws
    const ctx = createCtxFromDraws(seed, srv.rngDraws)
    const rs = applyAction(srv.state, elegida, ctx)
    const rm = applyAction(ref, elegida, refCtx)
    if (rs.ok !== rm.ok) { anotar('ok-distinto', `${etiqueta} paso ${paso}: servidor ${rs.ok} vs memoria ${rm.ok} (${clave(elegida).slice(0, 120)})`); return }
    if (!rs.ok) { anotar('accion-propia-rechazada', `${etiqueta} paso ${paso}: ${clave(elegida).slice(0, 140)} → ${(rs as { error?: string }).error}`); return }
    // A. repetibilidad: mismo estado con JSON + ctx reconstruido que en memoria
    ref = rm.state
    const dif = primeraDiferencia(rs.state, viaJson(ref))
    if (dif) {
      anotar('estado-diverge', `${etiqueta} paso ${paso} tras ${clave(elegida).slice(0, 80)} → ${dif}`)
      return
    }
    persistido = JSON.stringify({ state: rs.state, rngDraws: ctx.draws })
    if (ctx.draws !== refCtx.draws) { anotar('draws-distintos', `${etiqueta} paso ${paso}: servidor ${ctx.draws} memoria ${refCtx.draws}`); return }
  }
  anotar('sin-fin', `${etiqueta}: pasó de ${MAX_PASOS} pasos`)
}

const t0 = Date.now()
for (let seed = desde; seed < desde + n; seed++) {
  for (const [ia, ib] of [[0, 1], [1, 0]] as const) jugar(seed, ia, ib)
}
const seg = ((Date.now() - t0) / 1000).toFixed(1)
console.log(`PvP simulado: ${partidas} partidas (${terminadas} terminaron), ${pasos} pasos, ${accionesCliente} acciones del cliente comprobadas, ${seg} s, bot ${nivel}`)
if (hallazgos.size === 0) console.log('  ✔ sin hallazgos: repetibilidad, paridad y aceptación en orden')
for (const [tipo, h] of hallazgos) {
  console.log(`  ⚠ ${tipo}: ${h.cuenta}`)
  for (const e of h.ejemplos) console.log(`      ${e}`)
}
process.exit(hallazgos.size === 0 ? 0 : 1)
