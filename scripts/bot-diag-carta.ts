/**
 * Diagnóstico de cartas: ¿por qué el bot no las juega?
 *
 *   npx tsx scripts/bot-diag-carta.ts --cartas PU-010,PU-021 --mazos purga,disonancia --n 2 [--desde 1] [--bot dificil] [--json]
 *
 * Cada vez que el bot decide (en Forja o ante una respuesta en cadena) con una de esas cartas en la mano registra:
 *   - si jugarla ERA LEGAL (hay una acción suya en getValidActions) y, si no, por qué (Éter insuficiente / otra causa, con la ventana);
 *   - si era legal: cuánto valdría jugarla frente a la mejor alternativa (misma función de valor que usa el bot: `valorDe`) y, para
 *     un Soberano, a quién sacrificaría (el generador de acciones elige el PRIMERO por slot, el bot no escoge).
 * El delta es (mejor valor jugando la carta) − (mejor valor de cualquier otra acción, pasar incluido): > 0 = el bot la elegiría.
 * Es solo lectura: no toca motor ni bot. Cuesta una búsqueda extra por decisión con alguna de las cartas en la mano.
 * Acepta también `--carta ID` (una sola).
 */
import { ESTASIS_CARDS, DISONANCIA_CARDS, PURGA_CARDS, MUTACION_CARDS } from '../src/shared/data/paquetes'
import { actorActual, applyAction, createInitialState, getCardMeta, getValidActions, statsDe } from '../src/online/game'
import type { Action, GameState, PlayerId } from '../src/online/game'
import { resolverBot } from '../src/bot/registro'
import { atacantesRelevantes, CONFIG, CONFIG_CONTINUO, esUtil, sinRepetidos, valorDe } from '../src/bot/busqueda'

function arg(nombre: string, defecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : defecto
}
const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))

const TODOS = { estasis: ESTASIS_CARDS, disonancia: DISONANCIA_CARDS, purga: PURGA_CARDS, mutacion: MUTACION_CARDS } as const
const nombres = arg('mazos', 'purga,disonancia').split(',').map((m) => m.trim()) as (keyof typeof TODOS)[]
if (nombres.length !== 2 || nombres.some((m) => !TODOS[m])) { console.error(`--mazos inválido. Usa dos de: ${Object.keys(TODOS).join(', ')}`); process.exit(1) }
const MAZOS = nombres.map((m) => expandir(TODOS[m]))
const CARTAS = (arg('cartas', arg('carta', 'PU-010'))).split(',').map((c) => c.trim())
const nombreBot = arg('bot', 'dificil')
const n = Number(arg('n', '2'))
const desde = Number(arg('desde', '1'))
const soloJson = process.argv.includes('--json')
/** Los deltas se calculan con la MISMA configuración que usa el bot que juega (para el Difícil de siempre, CONFIG). */
const CFG = nombreBot === 'dificil-continuo' ? CONFIG_CONTINUO : CONFIG
for (const c of CARTAS) if (!MAZOS.some((m) => m.includes(c))) { console.error(`${c} no está en ninguno de los dos mazos`); process.exit(1) }
if (!resolverBot(nombreBot)) { console.error(`Bot desconocido: ${nombreBot}`); process.exit(1) }

/** Acciones que BAJAN/usan una carta desde la mano o la responden. */
const ACCIONES_DE_CARTA = new Set<Action['type']>(['jugar_campeon', 'jugar_mistica', 'jugar_respuesta', 'colocar_arcana', 'colocar_vinculo', 'responder_cadena', 'activar_arcana', 'equipar_artefacto'])
const idDe = (a: Action) => (a as { cardInstanceId?: string }).cardInstanceId

interface Acum { n: number; sumaDelta: number; mejoraba: number; deltas: number[] }
interface Ficha {
  nombre: string; tipo: string; coste: number
  decisiones: number; turnos: string[]; legales: number; turnosLegal: string[]; sinEter: number; otra: number; jugadas: number
  contextoIlegal: Record<string, number>
  porAccion: Record<string, Acum>
  sacrificado: Record<string, Acum>
}
const meta = (c: string) => getCardMeta(c) as { name?: string; type?: string; stats?: { cost?: number } } | null
const fichas: Record<string, Ficha> = Object.fromEntries(
  CARTAS.map((c) => [c, { nombre: meta(c)?.name ?? c, tipo: meta(c)?.type ?? '?', coste: meta(c)?.stats?.cost ?? 0, decisiones: 0, turnos: [], legales: 0, turnosLegal: [], sinEter: 0, otra: 0, jugadas: 0, contextoIlegal: {}, porAccion: {}, sacrificado: {} }]),
)
let partidas = 0

/** La media la arrastra un solo estado terminal (±1e6): la mediana dice qué pasa en una decisión típica. */
const mediana = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const sumar = (m: Record<string, Acum>, k: string, delta: number) => {
  const f = (m[k] ??= { n: 0, sumaDelta: 0, mejoraba: 0, deltas: [] })
  f.n++; f.sumaDelta += delta; f.deltas.push(delta); if (delta > 0) f.mejoraba++
}

function jugar(seed: number, mazoDeA: number): void {
  const bots = { A: resolverBot(nombreBot)!, B: resolverBot(nombreBot)! }
  const mazoDe: Record<PlayerId, number> = { A: mazoDeA, B: 1 - mazoDeA }
  const { state, ctx } = createInitialState(MAZOS[mazoDeA], MAZOS[1 - mazoDeA], seed)
  let estado: GameState = state
  const turnosPropios: Record<PlayerId, number> = { A: 0, B: 0 }
  const vistos = new Set<string>()
  let it = 0
  while (estado.fase !== 'terminada' && it < 6000) {
    const actor: PlayerId = actorActual(estado) ?? estado.turno
    // Instancias en MI mano de las cartas que se diagnostican (solo si el mazo que juega es el suyo)
    const enMano = estado.players[actor].mano
      .map((id) => ({ id, cid: estado.instances[id]?.cardId as string | undefined }))
      .filter((x): x is { id: string; cid: string } => !!x.cid && CARTAS.includes(x.cid) && MAZOS[mazoDe[actor]].includes(x.cid))
    if (enMano.length > 0) diagnosticar(estado, actor, enMano, turnosPropios[actor], seed)
    const accion = bots[actor](estado, actor)
    if (!accion) break
    const jugada = ACCIONES_DE_CARTA.has(accion.type) ? idDe(accion) : undefined
    const jugadaCid = jugada ? (estado.instances[jugada]?.cardId as string | undefined) : undefined
    const r = applyAction(estado, accion, ctx)
    if (!r.ok) break
    if (jugadaCid && fichas[jugadaCid] && MAZOS[mazoDe[actor]].includes(jugadaCid) && accion.type !== 'activar_arcana' && !vistos.has(`${jugada}|${accion.type}`)) {
      fichas[jugadaCid].jugadas++
      vistos.add(`${jugada}|${accion.type}`)
    }
    for (const e of r.events) if (e.type === 'turno_iniciado') turnosPropios[e.jugador]++
    estado = r.state
    it++
  }
  partidas++
}

function diagnosticar(s: GameState, yo: PlayerId, enMano: { id: string; cid: string }[], turnoPropio: number, seed: number): void {
  const acciones = atacantesRelevantes(s, sinRepetidos(getValidActions(s, yo).filter(esUtil)))
  const valores = acciones.map((a) => valorDe(s, a, yo, CFG, acciones.length))
  const clave = `${seed}|${yo}|${turnoPropio}`
  const ventana = `${s.fase}${s.cadena ? '+cadena' : ''}`
  for (const { id, cid } of enMano) {
    const f = fichas[cid]
    f.decisiones++
    if (!f.turnos.includes(clave)) f.turnos.push(clave)
    const propias = acciones.map((a, i) => ({ a, v: valores[i] })).filter((x) => ACCIONES_DE_CARTA.has(x.a.type) && idDe(x.a) === id)
    if (propias.length === 0) {
      const eter = s.players[yo].eterReserva.length
      if (eter < f.coste) f.sinEter++
      else f.otra++
      f.contextoIlegal[ventana] = (f.contextoIlegal[ventana] ?? 0) + 1
      continue
    }
    f.legales++
    if (!f.turnosLegal.includes(clave)) f.turnosLegal.push(clave)
    const mejorPropia = propias.reduce((m, x) => (x.v > m.v ? x : m))
    const otras = acciones.map((a, i) => ({ a, v: valores[i] })).filter((x) => !(ACCIONES_DE_CARTA.has(x.a.type) && idDe(x.a) === id))
    const mejorOtra = otras.length > 0 ? Math.max(...otras.map((x) => x.v)) : -Infinity
    const delta = mejorPropia.v - mejorOtra
    sumar(f.porAccion, mejorPropia.a.type, delta)
    if (mejorPropia.a.type === 'jugar_campeon') {
      const idSac = (mejorPropia.a as Extract<Action, { type: 'jugar_campeon' }>).sacrificios?.[0]
      if (idSac) {
        const sc = s.instances[idSac]?.cardId as string | undefined
        const st = statsDe(s, idSac)
        sumar(f.sacrificado, `${(sc && meta(sc)?.name) ?? sc ?? '?'} (${st.poder}/${st.resistencia})`, delta)
      }
    }
  }
}

for (let seed = desde; seed < desde + n; seed++) {
  jugar(seed, 0)
  jugar(seed, 1)
}

if (soloJson) {
  console.log(JSON.stringify({ partidas, fichas }))
} else {
  const pct = (a: number, b: number) => (b > 0 ? `${((100 * a) / b).toFixed(0)}%` : '—')
  console.log(`\nDiagnóstico · bot ${nombreBot} · ${nombres.join(' vs ')} · semillas ${desde}..${desde + n - 1} · ${partidas} partidas`)
  for (const [cid, f] of Object.entries(fichas)) {
    console.log(`\n== ${f.nombre} (${cid} · ${f.tipo} · coste ${f.coste}) ==`)
    console.log(`Decisiones con la carta en la mano: ${f.decisiones} (en ${f.turnos.length} turnos) · veces que se jugó: ${f.jugadas}`)
    console.log(`  ilegal por Éter insuficiente ${pct(f.sinEter, f.decisiones)} · ilegal por otra causa ${pct(f.otra, f.decisiones)} (ventanas: ${JSON.stringify(f.contextoIlegal)}) · LEGAL ${pct(f.legales, f.decisiones)} (${f.turnosLegal.length} turnos)`)
    for (const [k, v] of Object.entries(f.porAccion)) console.log(`  legal vía ${k}: ${v.n} decisiones · delta medio ${(v.sumaDelta / v.n).toFixed(1)} · mediana ${mediana(v.deltas).toFixed(1)} [${Math.min(...v.deltas).toFixed(0)}, ${Math.max(...v.deltas).toFixed(0)}] · la elegiría en ${pct(v.mejoraba, v.n)}`)
    for (const [k, v] of Object.entries(f.sacrificado)) console.log(`  sacrificando a ${k}: ${v.n} decisiones · delta medio ${(v.sumaDelta / v.n).toFixed(1)} · mejoraba en ${pct(v.mejoraba, v.n)}`)
  }
}
