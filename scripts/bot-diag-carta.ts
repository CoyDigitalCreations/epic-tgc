/**
 * Diagnóstico de UNA carta: ¿por qué el bot no la juega?
 *
 *   npx tsx scripts/bot-diag-carta.ts --carta MU-010 --mazos mutacion,disonancia --n 4 [--desde 1] [--bot dificil]
 *
 * Cada vez que el bot decide en Forja con la carta en la mano registra:
 *   - si la jugada ERA LEGAL (existe la acción en getValidActions) y, si no, por qué (Éter insuficiente / sin Campeón que sacrificar / otro);
 *   - si era legal: a quién sacrificaría (el generador de acciones elige el PRIMERO por slot, el bot no escoge) y cuánto valdría jugarla
 *     frente a la mejor alternativa (misma función de valor que usa el bot: `valorDe`).
 * Es solo lectura: no toca motor ni bot. Cuesta ~2 búsquedas extra por decisión con la carta legal.
 */
import { ESTASIS_CARDS, DISONANCIA_CARDS, PURGA_CARDS, MUTACION_CARDS } from '../src/shared/data/paquetes'
import { actorActual, applyAction, createInitialState, getCardMeta, getValidActions, statsDe } from '../src/online/game'
import type { Action, GameState, PlayerId } from '../src/online/game'
import { resolverBot } from '../src/bot/registro'
import { CONFIG, esUtil, sinRepetidos, valorDe } from '../src/bot/busqueda'

function arg(nombre: string, defecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defecto
}
const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))

const TODOS = { estasis: ESTASIS_CARDS, disonancia: DISONANCIA_CARDS, purga: PURGA_CARDS, mutacion: MUTACION_CARDS } as const
const nombres = arg('mazos', 'mutacion,disonancia').split(',').map((m) => m.trim()) as (keyof typeof TODOS)[]
if (nombres.length !== 2 || nombres.some((m) => !TODOS[m])) { console.error(`--mazos inválido. Usa dos de: ${Object.keys(TODOS).join(', ')}`); process.exit(1) }
const MAZOS = nombres.map((m) => expandir(TODOS[m]))
const CARTA = arg('carta', 'MU-010')
const nombreBot = arg('bot', 'dificil')
const n = Number(arg('n', '4'))
const desde = Number(arg('desde', '1'))
const duenio = MAZOS.findIndex((m) => m.includes(CARTA))
if (duenio === -1) { console.error(`${CARTA} no está en ninguno de los dos mazos`); process.exit(1) }
if (!resolverBot(nombreBot)) { console.error(`Bot desconocido: ${nombreBot}`); process.exit(1) }

const meta = getCardMeta(CARTA) as { name?: string; stats?: { cost?: number; poder?: number; resistencia?: number }; roles?: string[] } | null
const coste = meta?.stats?.cost ?? 0
const requeridos = meta?.roles?.includes('Soberano') ? 1 : meta?.roles?.includes('Emperador') ? 2 : 0

interface PorSacrificado { decisiones: number; sumaDelta: number; mejoraba: number }
const d = {
  partidas: 0, partidasConCarta: 0, jugada: 0,
  decisiones: 0, turnos: new Set<string>(), turnosLegal: new Set<string>(),
  legales: 0, sinEter: 0, sinSacrificio: 0, otro: 0,
  porSacrificado: {} as Record<string, PorSacrificado>,
}

function jugar(seed: number, mazoDeA: number): void {
  const bots = { A: resolverBot(nombreBot)!, B: resolverBot(nombreBot)! }
  const mazoDe: Record<PlayerId, number> = { A: mazoDeA, B: 1 - mazoDeA }
  const { state, ctx } = createInitialState(MAZOS[mazoDeA], MAZOS[1 - mazoDeA], seed)
  let estado: GameState = state
  const turnosPropios: Record<PlayerId, number> = { A: 0, B: 0 }
  let vioCarta = false
  let it = 0
  while (estado.fase !== 'terminada' && it < 6000) {
    const actor: PlayerId = actorActual(estado) ?? estado.turno
    if (mazoDe[actor] === duenio && estado.fase === 'forja') {
      const inst = estado.players[actor].mano.find((id) => estado.instances[id]?.cardId === CARTA)
      if (inst) diagnosticar(estado, actor, inst, turnosPropios[actor])
    }
    if (mazoDe[actor] === duenio && estado.players[actor].mano.some((id) => estado.instances[id]?.cardId === CARTA)) vioCarta = true
    const accion = bots[actor](estado, actor)
    if (!accion) break
    const r = applyAction(estado, accion, ctx)
    if (!r.ok) break
    if (accion.type === 'jugar_campeon' && mazoDe[actor] === duenio && estado.instances[accion.cardInstanceId]?.cardId === CARTA) d.jugada++
    for (const e of r.events) if (e.type === 'turno_iniciado') turnosPropios[e.jugador]++
    estado = r.state
    it++
  }
  d.partidas++
  if (vioCarta) d.partidasConCarta++
}

function diagnosticar(s: GameState, yo: PlayerId, inst: string, turnoPropio: number): void {
  d.decisiones++
  d.turnos.add(`${s.seed}|${yo}|${turnoPropio}`)
  const acciones = sinRepetidos(getValidActions(s, yo).filter(esUtil))
  const carta = acciones.find((a): a is Extract<Action, { type: 'jugar_campeon' }> => a.type === 'jugar_campeon' && a.cardInstanceId === inst)
  if (!carta) {
    const eter = s.players[yo].eterReserva.length
    const campeones = s.players[yo].campo.campeones.filter(Boolean).length
    if (eter < coste) d.sinEter++
    else if (campeones < requeridos) d.sinSacrificio++
    else d.otro++
    return
  }
  d.legales++
  d.turnosLegal.add(`${s.seed}|${yo}|${turnoPropio}`)
  const vCarta = valorDe(s, carta, yo, CONFIG, acciones.length)
  let mejor = -Infinity
  for (const a of acciones) if (a !== carta) mejor = Math.max(mejor, valorDe(s, a, yo, CONFIG, acciones.length))
  const idSac = carta.sacrificios?.[0]
  const cid = idSac ? (s.instances[idSac]?.cardId as string | undefined) : undefined
  const st = idSac ? statsDe(s, idSac) : null
  const etiqueta = cid ? `${(getCardMeta(cid) as { name?: string } | null)?.name ?? cid} (${st?.poder}/${st?.resistencia})` : '(sin sacrificio)'
  const f = (d.porSacrificado[etiqueta] ??= { decisiones: 0, sumaDelta: 0, mejoraba: 0 })
  f.decisiones++
  f.sumaDelta += vCarta - mejor
  if (vCarta > mejor) f.mejoraba++
}

for (let seed = desde; seed < desde + n; seed++) {
  jugar(seed, 0)
  jugar(seed, 1)
}

const pct = (a: number, b: number) => (b > 0 ? `${((100 * a) / b).toFixed(0)}%` : '—')
console.log(`\nDiagnóstico de ${meta?.name ?? CARTA} (${CARTA}) · coste ${coste} · ${meta?.stats?.poder}/${meta?.stats?.resistencia} · sacrificios exigidos ${requeridos}`)
console.log(`Bot ${nombreBot} · mazos ${nombres.join(' vs ')} · semillas ${desde}..${desde + n - 1} · ${d.partidas} partidas (la carta estuvo en la mano en ${d.partidasConCarta})`)
console.log(`Veces que se JUGÓ: ${d.jugada}`)
console.log(`Decisiones en Forja con la carta en la mano: ${d.decisiones} (en ${d.turnos.size} turnos distintos)`)
console.log(`  jugada NO legal por Éter insuficiente: ${d.sinEter} (${pct(d.sinEter, d.decisiones)})`)
console.log(`  jugada NO legal por falta de Campeón que sacrificar: ${d.sinSacrificio} (${pct(d.sinSacrificio, d.decisiones)})`)
console.log(`  jugada NO legal por otra causa: ${d.otro} (${pct(d.otro, d.decisiones)})`)
console.log(`  jugada LEGAL: ${d.legales} (${pct(d.legales, d.decisiones)}) en ${d.turnosLegal.size} turnos distintos`)
if (d.legales > 0) {
  console.log(`\nCuando era legal: a quién sacrificaría (el primero por slot) y valor de jugarla MENOS el de la mejor alternativa (>0 = el bot la elegiría)`)
  for (const [k, f] of Object.entries(d.porSacrificado).sort((a, b) => b[1].decisiones - a[1].decisiones)) {
    console.log(`  ${k.padEnd(40)} ${String(f.decisiones).padStart(4)} decisiones · delta medio ${(f.sumaDelta / f.decisiones).toFixed(1).padStart(7)} · mejoraba en ${pct(f.mejoraba, f.decisiones)}`)
  }
}
