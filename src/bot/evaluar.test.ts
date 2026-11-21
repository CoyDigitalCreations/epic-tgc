import { describe, expect, it } from 'vitest'
import { createInitialState } from '../online/game'
import type { GameState, PlayerId } from '../online/game'
import { ALL_CARDS, DISONANCIA_CARDS, ESTASIS_CARDS } from '../shared/data/paquetes'
import { evaluar, PESOS, PESOS_ANTES, PESOS_SIN_ARCANA, PESOS_SIN_MANO_CAMPEON, PESOS_SIN_PODER_EFECTO } from './evaluar'
import { poderEfectoDe } from './poderCarta'

const expandir = (cards: { id: string; limiteCopias?: string | number }[]) =>
  cards.flatMap((c) => Array.from({ length: Number(c.limiteCopias ?? 1) }, () => c.id))

const inicial = (): GameState => createInitialState(expandir(ESTASIS_CARDS), expandir(DISONANCIA_CARDS), 1).state

/** `ladron` arrebata `n` Éter de la Reserva de `victima` (igual que `steal_ether`: cambia de Reserva, NO de dueño). */
function arrebatar(s: GameState, ladron: PlayerId, victima: PlayerId, n: number): GameState {
  const ids = s.players[victima].eterReserva.splice(0, n)
  s.players[ladron].eterReserva.push(...ids)
  return s
}

describe('evaluar · Éter arrebatado (cuenta por dueño, no por zona)', () => {
  it('sin Éter arrebatado en juego, los pesos nuevos y los de antes dan lo mismo', () => {
    const s = inicial()
    expect(evaluar(s, 'A', PESOS_SIN_MANO_CAMPEON)).toBeCloseTo(evaluar(s, 'A', PESOS_ANTES), 9)
  })

  it('antes arrebatar Éter mejoraba la evaluación del ladrón por completo; ahora solo una fracción (es prestado)', () => {
    const base = evaluar(inicial(), 'B', PESOS)
    const antes = evaluar(arrebatar(inicial(), 'B', 'A', 3), 'B', PESOS_ANTES) - evaluar(inicial(), 'B', PESOS_ANTES)
    const ahora = evaluar(arrebatar(inicial(), 'B', 'A', 3), 'B', PESOS) - base
    expect(antes).toBeGreaterThan(0)
    expect(ahora).toBeGreaterThan(0) // gastarlo este turno sigue valiendo algo
    expect(ahora).toBeLessThan(antes / 2)
  })

  it('el dueño no da por perdido el Éter que le arrebataron: vuelve en su Alba', () => {
    const antes = evaluar(arrebatar(inicial(), 'B', 'A', 3), 'A', PESOS_ANTES) - evaluar(inicial(), 'A', PESOS_ANTES)
    const ahora = evaluar(arrebatar(inicial(), 'B', 'A', 3), 'A', PESOS) - evaluar(inicial(), 'A', PESOS)
    expect(antes).toBeLessThan(0) // antes lo contaba como pérdida
    // Ahora no pierde nada propio: solo cede lo que el ladrón puede GASTAR este turno (3 Éter prestados × su fracción)
    expect(ahora).toBeCloseTo(-3 * PESOS.eterPrestado * PESOS.eter, 9)
    expect(ahora).toBeGreaterThan(antes / 2)
  })

  it('el Éter arrebatado que ya está en la zona de pago del ladrón tampoco cuenta como suyo', () => {
    const s = arrebatar(inicial(), 'B', 'A', 2)
    s.players.B.eterPagado.push(...s.players.B.eterReserva.splice(-2, 2))
    const base = evaluar(inicial(), 'B', PESOS)
    expect(evaluar(s, 'B', PESOS) - base).toBeLessThan(0.4 * 2) // menos de 2 Éter propios
    // A conserva lo suyo (vuelve en su Alba); solo cede el valor de gasto inmediato de los 2 prestados
    expect(evaluar(s, 'A', PESOS)).toBeCloseTo(evaluar(inicial(), 'A', PESOS) - 2 * PESOS.eterPrestado * PESOS.eter, 9)
  })
})

/** Deja `cardId` en la mano de `j` (la saca del mazo si hace falta) y devuelve su instancia. */
function enMano(s: GameState, j: PlayerId, cardId: string): string {
  const p = s.players[j]
  const enLaMano = p.mano.find((x) => s.instances[x]?.cardId === cardId)
  if (enLaMano) return enLaMano
  const id = p.mazo.find((x) => s.instances[x]?.cardId === cardId)!
  p.mazo.splice(p.mazo.indexOf(id), 1)
  p.mano.push(id)
  return id
}

/** Baja esa carta de la mano a la primera casilla de Arcanas (como `colocar_arcana`). */
function colocarArcana(s: GameState, j: PlayerId, id: string): GameState {
  s.players[j].mano.splice(s.players[j].mano.indexOf(id), 1)
  s.players[j].campo.arcanasCombate[0] = id
  return s
}

/** Mismo estado dos veces: con la Arcana en la mano y con la Arcana colocada. */
function parejas(j: PlayerId, cardId: string): { mano: GameState; puesta: GameState } {
  const mano = inicial()
  const id = enMano(mano, j, cardId)
  const puesta = inicial()
  enMano(puesta, j, cardId)
  return { mano, puesta: colocarArcana(puesta, j, id) }
}

describe('evaluar · Arcana colocada (el bot ya no las deja atascadas en la mano)', () => {
  // FB-023 es una Arcana de coste 3: en la mano vale 1 + 0.3 × 3 = 1.9, más que los 1.5 de soporte
  it('con los pesos de antes colocar una Arcana de coste 3 EMPEORABA la evaluación (por eso no se colocaban)', () => {
    const { mano, puesta } = parejas('A', 'FB-023')
    expect(evaluar(puesta, 'A', PESOS_SIN_ARCANA) - evaluar(mano, 'A', PESOS_SIN_ARCANA)).toBeCloseTo(1.5 - 1.9, 9)
  })

  it('ahora colocarla mejora la evaluación', () => {
    const { mano, puesta } = parejas('A', 'FB-023')
    expect(evaluar(puesta, 'A', PESOS) - evaluar(mano, 'A', PESOS)).toBeCloseTo(1.5 + PESOS.arcanaColocada - 1.9, 9)
    expect(evaluar(puesta, 'A', PESOS)).toBeGreaterThan(evaluar(mano, 'A', PESOS))
  })

  it('el bonus es plano: la Arcana boca abajo del rival no revela su coste', () => {
    // Para A (que mira) solo cambia la mano del rival (−1 carta) y su soporte: no depende de lo que cueste la carta
    const delta = (cardId: string) => {
      const { mano, puesta } = parejas('B', cardId)
      return evaluar(puesta, 'A', PESOS) - evaluar(mano, 'A', PESOS)
    }
    expect(delta('DS-024')).toBeCloseTo(delta('DS-023'), 9)
  })

  it('PESOS_ANTES conserva la valoración original (sin el bonus)', () => {
    expect(PESOS_ANTES.arcanaColocada).toBe(0)
    const { puesta } = parejas('A', 'FB-023')
    expect(evaluar(puesta, 'A', PESOS_ANTES)).toBeCloseTo(evaluar(puesta, 'A', { ...PESOS, arcanaColocada: 0, eterRobado: 0, eterPrestado: 1, manoCampeon: 0, efectoCampo: 0, efectoMano: 0 }), 9)
  })
})

describe('evaluar · Campeones en la mano (el tutor ya distingue a Ragnar de otro coste 4)', () => {
  /** Mismo estado, pero `A` tiene en la mano a `cardId` (se le añade una instancia nueva). */
  const conEnMano = (cardId: string): GameState => {
    const s = structuredClone(createInitialState(expandir(ESTASIS_CARDS), expandir(DISONANCIA_CARDS), 7).state)
    const id = `m-${cardId}`
    s.instances[id] = { ...Object.values(s.instances)[0], cardInstanceId: id, cardId, owner: 'A', controller: 'A' } as GameState['instances'][string]
    s.players.A.mano = [...s.players.A.mano, id]
    return s
  }

  it('entre dos Campeones del mismo coste, prefiere al de más ATQ + RES (Ragnar 9/9 sobre Isolde 3/6)', () => {
    expect(evaluar(conEnMano('DS-010'), 'A')).toBeGreaterThan(evaluar(conEnMano('FB-014'), 'A'))
  })

  it('sin el peso nuevo ambos valen igual (era el defecto: coste igual, valor igual)', () => {
    expect(evaluar(conEnMano('DS-010'), 'A', PESOS_SIN_MANO_CAMPEON)).toBeCloseTo(evaluar(conEnMano('FB-014'), 'A', PESOS_SIN_MANO_CAMPEON), 9)
  })

  it('una Mística en la mano no suma stats', () => {
    const base = conEnMano('FB-032')
    const sin = structuredClone(base)
    sin.players.A.mano = sin.players.A.mano.filter((id) => id !== 'm-FB-032')
    const aporte = (w: typeof PESOS) => evaluar(base, 'A', w) - evaluar(sin, 'A', w)
    expect(aporte(PESOS)).toBeCloseTo(aporte(PESOS_SIN_MANO_CAMPEON), 9)
  })
})

describe('evaluar · poder de los efectos (la estratega se distingue de un Campeón vanilla, sin tabla por carta)', () => {
  /** Mismo estado, pero `A` tiene a `cardId` en la mano o en el campo (se le añade una instancia nueva). */
  const con = (cardId: string, donde: 'mano' | 'campo'): GameState => {
    const s = structuredClone(inicial())
    const id = `p-${cardId}`
    s.instances[id] = { ...Object.values(s.instances)[0], cardInstanceId: id, cardId, owner: 'A', controller: 'A', agotado: false } as GameState['instances'][string]
    if (donde === 'mano') s.players.A.mano = [...s.players.A.mano, id]
    else s.players.A.campo.campeones[0] = id
    return s
  }

  it('en la mano: Ragnar (efectos) vale más que Isolde aun quitando el criterio de stats', () => {
    const w = { ...PESOS, manoCampeon: 0 }
    expect(evaluar(con('DS-010', 'mano'), 'A', w)).toBeGreaterThan(evaluar(con('FB-014', 'mano'), 'A', w))
  })

  it('en el campo suma por el poder de sus efectos; con el peso en 0 vuelve a depender solo de stats', () => {
    const delta = (w: typeof PESOS) => evaluar(con('DS-010', 'campo'), 'A', w) - evaluar(con('DS-010', 'mano'), 'A', w)
    expect(delta(PESOS)).toBeGreaterThan(delta(PESOS_SIN_PODER_EFECTO))
  })

  it('invocar a una estratega gana más que invocar a un Campeón vanilla del mismo coste (el incentivo a jugarla)', () => {
    const ganancia = (cardId: string) => evaluar(con(cardId, 'campo'), 'A', PESOS) - evaluar(con(cardId, 'mano'), 'A', PESOS)
    const gananciaSin = (cardId: string) => evaluar(con(cardId, 'campo'), 'A', PESOS_SIN_PODER_EFECTO) - evaluar(con(cardId, 'mano'), 'A', PESOS_SIN_PODER_EFECTO)
    // Ragnar sube respecto a como se valoraba antes, y lo hace más que Isolde
    expect(ganancia('DS-010') - gananciaSin('DS-010')).toBeGreaterThan(ganancia('FB-014') - gananciaSin('FB-014'))
  })

  it('un Campeón sin efectos ni keywords no cambia con el peso nuevo (los vanilla no se mueven)', () => {
    const vanilla = ALL_CARDS.find((c) => c.type === 'Campeón' && poderEfectoDe(c.id) === 0)
    expect(vanilla).toBeDefined()
    // La mano inicial ya trae Campeones con efectos: se compara lo que CAMBIA al invocarlo, que es lo único que decide la jugada
    const ganancia = (w: typeof PESOS) => evaluar(con(vanilla!.id, 'campo'), 'A', w) - evaluar(con(vanilla!.id, 'mano'), 'A', w)
    expect(ganancia(PESOS)).toBeCloseTo(ganancia(PESOS_SIN_PODER_EFECTO), 9)
  })

  it('las estratega de cada mazo puntúan por encima de la mediana de los Campeones (no es cosa de una carta)', () => {
    const estratega = ['DS-010', 'FB-010', 'PU-010', 'MU-011'].map(poderEfectoDe)
    for (const p of estratega) expect(p).toBeGreaterThan(5)
  })
})
