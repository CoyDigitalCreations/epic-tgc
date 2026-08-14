import { getCardMeta } from './cards'
import { createCtx, shuffleFisherYates } from './rng'
import type { CardInstance, Ctx, GameState, PlayerId, PlayerState, SetupOptions } from './types'

const DIST_ETER = 15
const DIST_PRINCIPAL = 45
const DIST_VINCULOS = 6
const MANO_INICIAL = 5
const TOTAL_MAZO = DIST_ETER + DIST_PRINCIPAL + DIST_VINCULOS // 66

function crearPlayerState(id: PlayerId): PlayerState {
  return {
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [],
    eterPagado: [],
    campo: {
      campeones: [null, null, null, null, null],
      misticasTacticas: [null, null, null],
      arcanasCombate: [null, null, null],
    },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: false,
  }
}

function tipoDe(cardId: string): string | undefined {
  return getCardMeta(cardId)?.type
}

/** Valida la distribución del mazo (15 Éter + 45 Principal + 6 Vínculos = 66) y que todo cardId exista. */
function validarDeck(deck: string[], nombre: string): void {
  if (deck.length !== TOTAL_MAZO) {
    throw new Error(`Mazo ${nombre} inválido: ${deck.length} cartas (se esperaban ${TOTAL_MAZO})`)
  }
  const eter = deck.filter((id) => tipoDe(id) === 'Éter').length
  const vinculos = deck.filter((id) => tipoDe(id) === 'Vínculo').length
  const principal = deck.length - eter - vinculos
  if (eter !== DIST_ETER || principal !== DIST_PRINCIPAL || vinculos !== DIST_VINCULOS) {
    throw new Error(
      `Mazo ${nombre} inválido: ${eter} Éter + ${principal} Principal + ${vinculos} Vínculos (se esperaban 15/45/6)`,
    )
  }
  for (const id of deck) {
    if (!getCardMeta(id)) throw new Error(`Mazo ${nombre} inválido: cardId desconocido "${id}"`)
  }
}

/** El orden de Vínculos elegido debe ser una permutación exacta de los 6 Vínculos del mazo. */
function validarOrdenVinculos(orden: string[], vinculoIdsDeck: string[], instances: Record<string, CardInstance>): void {
  const cardIdsDeck = vinculoIdsDeck.map((id) => instances[id].cardId as string)
  if (orden.length !== DIST_VINCULOS) {
    throw new Error(`Orden de Vínculos inválido: ${orden.length} cartas (se esperaban ${DIST_VINCULOS})`)
  }
  const setDeck = new Set(cardIdsDeck)
  for (const cardId of orden) {
    if (!setDeck.has(cardId)) throw new Error(`Orden de Vínculos inválido: "${cardId}" no es un Vínculo de este mazo`)
  }
  if (new Set(orden).size !== orden.length) {
    throw new Error('Orden de Vínculos inválido: cartas duplicadas')
  }
}

/**
 * Crea el estado inicial de la partida (spec R3, R4, R6).
 *
 * Orden de consumo RNG (contrato de reproducibilidad — NO reordenar):
 *   1. Fisher-Yates Mazo A (40) → 39 extracciones
 *   2. Fisher-Yates Mazo B (40) → 39
 *   3. Fisher-Yates Vínculos A (6) → 5 (COSMÉTICO: resultado descartado;
 *      el orden final es la elección del jugador, spec R3)
 *   4. Fisher-Yates Vínculos B (6) → 5 (ídem)
 *   5. Moneda primer jugador → 1 (A si < 0.5, si no B)
 * Sin mulligans: 99 extracciones. Robar NO consume RNG (toma del tope).
 *
 * cardInstanceId 'c1'..'c132' se asignan en orden de entrada de deckA (66)
 * luego deckB (66): estables por construcción, sin dependencia del seed.
 */
export function createInitialState(
  deckA: string[],
  deckB: string[],
  seed: number,
  opts?: SetupOptions,
): { state: GameState; ctx: Ctx } {
  validarDeck(deckA, 'A')
  validarDeck(deckB, 'B')

  const ctx = createCtx(seed)
  const state: GameState = {
    version: 1,
    seed,
    fase: 'pre_partida',
    turno: 'A',
    primerJugador: 'A', // se decide con la moneda (extracción 99)
    primerTurno: true,
    instances: {},
    players: { A: crearPlayerState('A'), B: crearPlayerState('B') },
  }

  // Registro de instancias: c1..c66 = deckA en orden, c67..c132 = deckB en orden
  let n = 1
  const registrarDeck = (owner: PlayerId, deck: string[]): string[] => {
    const ids: string[] = []
    for (const cardId of deck) {
      const cardInstanceId = `c${n++}`
      state.instances[cardInstanceId] = { cardInstanceId, cardId, owner }
      ids.push(cardInstanceId)
    }
    return ids
  }
  const idsA = registrarDeck('A', deckA)
  const idsB = registrarDeck('B', deckB)

  // Clasificación por tipo (preserva el orden de entrada dentro de cada grupo)
  const clasificar = (ids: string[]) => {
    const eter: string[] = []
    const principal: string[] = []
    const vinculo: string[] = []
    for (const id of ids) {
      const tipo = tipoDe(state.instances[id].cardId as string)
      if (tipo === 'Éter') eter.push(id)
      else if (tipo === 'Vínculo') vinculo.push(id)
      else principal.push(id)
    }
    return { eter, principal, vinculo }
  }
  const a = clasificar(idsA)
  const b = clasificar(idsB)

  // 1-2. Barajado de mazos (39 extracciones c/u)
  const mazoABarajado = shuffleFisherYates(ctx, a.principal)
  const mazoBBarajado = shuffleFisherYates(ctx, b.principal)

  // 3-4. Barajado cosmético de Vínculos (5 extracciones c/u; resultado descartado)
  shuffleFisherYates(ctx, a.vinculo)
  shuffleFisherYates(ctx, b.vinculo)

  // 5. Moneda del primer jugador (extracción 99)
  state.primerJugador = ctx.next() < 0.5 ? 'A' : 'B'

  // Zonas (sin RNG): 2A, 4A-4F (orden elegido), 3G + mano inicial de 5
  const montarZonas = (
    jugador: PlayerId,
    grupos: { eter: string[]; principal: string[]; vinculo: string[] },
    mazoBarajado: string[],
    ordenVinculos: string[] | undefined,
  ) => {
    const p = state.players[jugador]
    p.eterReserva = grupos.eter
    const orden = ordenVinculos ?? grupos.vinculo.map((id) => state.instances[id].cardId as string)
    validarOrdenVinculos(orden, grupos.vinculo, state.instances)
    const porCardId = new Map(grupos.vinculo.map((id) => [state.instances[id].cardId as string, id]))
    p.vinculos = orden.map((cardId) => porCardId.get(cardId) as string)
    p.mano = mazoBarajado.slice(0, MANO_INICIAL)
    p.mazo = mazoBarajado.slice(MANO_INICIAL)
  }
  montarZonas('A', a, mazoABarajado, opts?.vinculosA)
  montarZonas('B', b, mazoBBarajado, opts?.vinculosB)

  return { state, ctx }
}
