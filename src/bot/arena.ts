/**
 * Arena: enfrenta dos bots y mide quién gana. Es la regla con la que se mide cualquier mejora del bot: sin esto
 * «perfeccionarlo» sería cambiar números a ojo.
 *
 * Solo usa la API pública del motor (`src/online/game/index.ts`): el bot nuevo no toca ni depende de los detalles internos.
 */
import { applyAction, actorActual, createInitialState } from '../online/game'
import type { Action, GameState, PlayerId } from '../online/game'

/** Un bot decide la acción de `yo` en `estado`; `null` = no le toca actuar (o no hay jugada). */
export type Bot = (estado: GameState, yo: PlayerId) => Action | null

export interface ResultadoPartida {
  ganador: PlayerId | null
  /** `sin_progreso`: el bot no encontró acción o el motor la rechazó; `limite`: se acabaron las iteraciones. */
  motivo: 'mazo_vacio' | 'rendicion' | 'vinculos' | 'empate' | 'sin_progreso' | 'limite'
  iteraciones: number
  turnos: number
  /** Si terminó por `sin_progreso`, el porqué (para depurar al bot). */
  detalle?: string
}

export interface OpcionesPartida {
  mazoA: string[]
  mazoB: string[]
  seed: number
  botA: Bot
  botB: Bot
  maxIteraciones?: number
}

export function jugarPartida(op: OpcionesPartida): ResultadoPartida {
  const { state, ctx } = createInitialState(op.mazoA, op.mazoB, op.seed)
  const max = op.maxIteraciones ?? 6000
  let estado: GameState = state
  let iteraciones = 0
  let turnos = 0
  while (estado.fase !== 'terminada' && iteraciones < max) {
    const actor: PlayerId = actorActual(estado) ?? estado.turno
    const accion = (actor === 'A' ? op.botA : op.botB)(estado, actor)
    if (!accion) return { ganador: null, motivo: 'sin_progreso', iteraciones, turnos, detalle: `el bot ${actor} no devolvió acción (fase ${estado.fase})` }
    const r = applyAction(estado, accion, ctx)
    if (!r.ok) return { ganador: null, motivo: 'sin_progreso', iteraciones, turnos, detalle: `${actor} jugó ${accion.type} y el motor la rechazó: ${r.error}` }
    turnos += r.events.filter((e) => e.type === 'turno_iniciado').length
    estado = r.state
    iteraciones++
  }
  if (estado.fase !== 'terminada') return { ganador: null, motivo: 'limite', iteraciones, turnos }
  return { ganador: estado.ganador ?? null, motivo: estado.motivo ?? 'empate', iteraciones, turnos }
}

// ══════════════════════════════════════════════════════════════
// Torneo
// ══════════════════════════════════════════════════════════════

export interface Mazos { nombre: string; cartas: string[] }

export interface ResumenTorneo {
  partidas: number
  victoriasX: number
  victoriasY: number
  empates: number
  /** Partidas que no terminaron bien (sin_progreso / limite): deben ser 0. */
  anomalias: number
  detallesAnomalias: string[]
  /** % de victorias de X sobre las partidas decididas (sin empates ni anomalías). */
  porcentajeX: number
  porAsiento: { comoA: { jugadas: number; ganadas: number }; comoB: { jugadas: number; ganadas: number } }
  porMazo: Record<string, { jugadas: number; ganadas: number }>
  promedioTurnos: number
  motivos: Record<string, number>
}

/**
 * X contra Y sobre `semillas` semillas. Por cada semilla se juegan las 4 combinaciones de asiento × mazo para que ni el asiento ni
 * el mazo favorezcan a nadie: X en A con el mazo 1, X en B con el mazo 1, X en A con el mazo 2 y X en B con el mazo 2.
 */
export function torneo(x: Bot, y: Bot, mazos: [Mazos, Mazos], semillas: number, desde = 1): ResumenTorneo {
  const r: ResumenTorneo = {
    partidas: 0, victoriasX: 0, victoriasY: 0, empates: 0, anomalias: 0, detallesAnomalias: [], porcentajeX: 0,
    porAsiento: { comoA: { jugadas: 0, ganadas: 0 }, comoB: { jugadas: 0, ganadas: 0 } },
    porMazo: Object.fromEntries(mazos.map((m) => [m.nombre, { jugadas: 0, ganadas: 0 }])),
    promedioTurnos: 0, motivos: {},
  }
  let turnosTotales = 0
  for (let seed = desde; seed < desde + semillas; seed++) {
    for (const xEnA of [true, false]) {
      for (const [mx, my] of [[mazos[0], mazos[1]], [mazos[1], mazos[0]]] as const) {
        const res = jugarPartida({
          mazoA: (xEnA ? mx : my).cartas, mazoB: (xEnA ? my : mx).cartas, seed,
          botA: xEnA ? x : y, botB: xEnA ? y : x,
        })
        r.partidas++
        r.motivos[res.motivo] = (r.motivos[res.motivo] ?? 0) + 1
        turnosTotales += res.turnos
        const asiento = xEnA ? r.porAsiento.comoA : r.porAsiento.comoB
        asiento.jugadas++
        r.porMazo[mx.nombre].jugadas++
        if (res.motivo === 'sin_progreso' || res.motivo === 'limite') {
          r.anomalias++
          if (r.detallesAnomalias.length < 5) r.detallesAnomalias.push(`seed ${seed} X${xEnA ? 'A' : 'B'} ${mx.nombre}: ${res.motivo} ${res.detalle ?? ''}`)
          continue
        }
        if (res.ganador === null) { r.empates++; continue }
        const ganaX = res.ganador === (xEnA ? 'A' : 'B')
        if (ganaX) { r.victoriasX++; asiento.ganadas++; r.porMazo[mx.nombre].ganadas++ } else r.victoriasY++
      }
    }
  }
  const decididas = r.victoriasX + r.victoriasY
  r.porcentajeX = decididas ? (100 * r.victoriasX) / decididas : 0
  r.promedioTurnos = r.partidas ? turnosTotales / r.partidas : 0
  return r
}
