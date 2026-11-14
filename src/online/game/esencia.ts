/**
 * Cambios de Esencia (Mutación): el cambio en sí, los triggers «cuando cambie de Esencia» y la elección de «la esencia que elijas».
 *
 * - `cambiarAtributo` es la ÚNICA vía para aplicar un cambio de Esencia/Rol/Facción de un efecto: lo registra
 *   (atributos.ts lo lee) y, si la Esencia VIGENTE de verdad cambió, dispara `al-cambiar-esencia` (la propia carta) y
 *   `cuando-campeon-cambia-esencia` (las cartas en juego de ambos jugadores, filtro propio/rival en triggersQueMatchean).
 * - «La esencia que elijas» (`cambioTipo.esenciaElegida`) NO decide nada: `iniciarElegirEsencia` congela la partida con una
 *   `EsenciaPendiente` hasta que quien resuelve el efecto responde con `elegir_esencia`. Misma idea que el scry (scry.ts).
 *   Una pendiente es vigente por los Campeones que siguen en el campo; sin ninguno se descarta sola.
 */
import { ESENCIAS, type Esencia } from '../../shared/types'
import type { Action } from './actions'
import { controladorDeCampeon, esenciaDe } from './atributos'
import { dispararTrigger, instanciasEnCampo } from './efectos'
import { aplicarCambioAtributo } from './reglasTemporales'
import type { CambioAtributo, Ctx, EsenciaPendiente, GameState, PlayerId } from './types'

const controladorDe = controladorDeCampeon

/**
 * Registra un cambio de Esencia, Rol o Facción de un Campeón en el campo. Si cambia la Esencia VIGENTE (no si se «cambia» a la
 * que ya tenía), dispara los triggers de cambio de Esencia con el Campeón como protagonista.
 */
export function cambiarAtributo(s: GameState, ctx: Ctx, cambio: CambioAtributo): void {
  const antes = cambio.atributo === 'esencia' ? esenciaDe(s, cambio.instId) : undefined
  aplicarCambioAtributo(s, cambio)
  if (cambio.atributo !== 'esencia' || antes === cambio.valor) return
  const controlador = controladorDe(s, cambio.instId)
  if (!controlador) return // fuera del campo nadie «cambia de Esencia»
  dispararTrigger(s, ctx, 'al-cambiar-esencia', controlador, [cambio.instId], { victimaId: cambio.instId, controladorVictima: controlador })
  const orden: PlayerId[] = s.turno === 'A' ? ['A', 'B'] : ['B', 'A']
  for (const j of orden) {
    dispararTrigger(s, ctx, 'cuando-campeon-cambia-esencia', j, instanciasEnCampo(s, j), { victimaId: cambio.instId, controladorVictima: controlador })
  }
}

/* ───────────────────────── «La esencia que elijas» ───────────────────────── */

/** Campeones de la pendiente que siguen en el campo, en el orden en que eran objetivo. */
export function campeonesVigentesEsencia(s: GameState, p: EsenciaPendiente): string[] {
  return p.instIds.filter((id) => controladorDe(s, id) !== undefined)
}

/** La pendiente que se atiende ahora: el frente de la cola (FIFO) que aún tiene algún Campeón en el campo. */
export function esenciaActual(s: GameState): EsenciaPendiente | undefined {
  const frente = s.esenciaPendientes?.[0]
  return frente && campeonesVigentesEsencia(s, frente).length > 0 ? frente : undefined
}

/** Quita del frente las pendientes sin Campeones vigentes para que no atasquen la partida. Se llama tras cada acción. */
export function descartarEsenciaMuertas(s: GameState): void {
  while (s.esenciaPendientes && s.esenciaPendientes.length > 0 && campeonesVigentesEsencia(s, s.esenciaPendientes[0]).length === 0) {
    s.esenciaPendientes = s.esenciaPendientes.slice(1)
  }
  if (s.esenciaPendientes?.length === 0) delete s.esenciaPendientes
}

/** Arma la elección: `jugador` escogerá la Esencia que tomarán `instIds` durante `duracion`. Sin objetivos no hace nada. */
export function iniciarElegirEsencia(s: GameState, jugador: PlayerId, instIds: string[], duracion: EsenciaPendiente['duracion']): void {
  if (instIds.length === 0) return
  s.esenciaPendientes = [...(s.esenciaPendientes ?? []), { jugador, instIds: [...instIds], duracion }]
}

type ElegirEsencia = Extract<Action, { type: 'elegir_esencia' }>

export function validarElegirEsencia(state: GameState, action: ElegirEsencia): string | null {
  const pendiente = esenciaActual(state)
  if (!pendiente) return 'no hay una Esencia por elegir'
  if (action.jugador !== undefined && action.jugador !== pendiente.jugador) return 'la Esencia la elige quien resuelve el efecto'
  if (!(ESENCIAS as readonly string[]).includes(action.esencia)) return 'esa Esencia no existe'
  return null
}

/** Aplica la Esencia elegida a los Campeones vigentes de la pendiente y la saca de la cola. */
export function ejecutarElegirEsencia(s: GameState, action: ElegirEsencia, ctx: Ctx): void {
  const pendiente = esenciaActual(s)
  if (!pendiente) return
  s.esenciaPendientes = s.esenciaPendientes!.slice(1)
  if (s.esenciaPendientes.length === 0) delete s.esenciaPendientes
  for (const instId of campeonesVigentesEsencia(s, pendiente)) {
    cambiarAtributo(s, ctx, { instId, atributo: 'esencia', valor: action.esencia, ...pendiente.duracion })
  }
}

/** Todas las Esencias que se pueden elegir (para ofrecerlas como acciones y en la UI). */
export const ESENCIAS_ELEGIBLES: readonly Esencia[] = ESENCIAS

/**
 * La elección del bot: sobre sus propios Campeones toma la Esencia que más se repite entre los suyos (suma sinergias de «misma
 * Esencia»); sobre los del rival, la que MENOS tienen. Determinista: empata por el orden del catálogo.
 */
export function elegirEsenciaBot(s: GameState, jugador: PlayerId, pendiente: EsenciaPendiente): Extract<Action, { type: 'elegir_esencia' }> {
  const objetivos = campeonesVigentesEsencia(s, pendiente)
  const sobreRival = objetivos.length > 0 && objetivos.every((id) => controladorDe(s, id) !== jugador)
  const dueno: PlayerId = sobreRival ? (jugador === 'A' ? 'B' : 'A') : jugador
  const cuenta = new Map<Esencia, number>(ESENCIAS.map((e) => [e, 0]))
  for (const id of s.players[dueno].campo.campeones) {
    if (!id || objetivos.includes(id)) continue
    const e = esenciaDe(s, id)
    if (e) cuenta.set(e, (cuenta.get(e) ?? 0) + 1)
  }
  let mejor: Esencia = ESENCIAS[0]
  for (const e of ESENCIAS) {
    const c = cuenta.get(e) ?? 0
    const cm = cuenta.get(mejor) ?? 0
    if (sobreRival ? c < cm : c > cm) mejor = e
  }
  return { type: 'elegir_esencia', esencia: mejor }
}
