// @vitest-environment node
/**
 * Salidas a las Arcanas y Místicas del rival (el «encierro» de El Reino Perdido, FB-023): cada mazo que lo enfrenta tiene al menos una
 * carta que destruye una Mística o Arcana, y cada una a su manera:
 *   - Disonancia · Skarn (DS-018): Campeón, paga 2 Éter, repetible.
 *   - Purga      · Embargo (PU-019): Mística coste 2, el Cementerio como combustible (exilia 1 Campeón propio caído).
 *   - Mutación   · Marchitez Fértil (MU-024): Mística coste 3 que además devuelve hasta 1 Éter de la zona de pago (neto 2 Éter).
 * Cartas REALES del seed.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { DISONANCIA_CARDS, MUTACION_CARDS, PURGA_CARDS } from '../../../shared/data/paquetes'
import type { EfectoData } from '../../../shared/types/cards'
import { getValidActions } from '../validActions'
import type { Ctx, GameState } from '../types'
import { aplicar, cargarCartasPrueba, conArcana, conCampeon, conEteres, conMano, conMazo, conMistica, crearCtx, enCementerio, escenaVacia, PR } from './helpers/cartasPrueba'

const EMBARGO = 'PU-019'
const MARCHITEZ = 'MU-024'
const REINO = 'FB-023'

beforeAll(() => {
  cargarCartasPrueba()
})

/** Contesta las elecciones pendientes (la primera opción, o la que indique `eleccion`) y pasa prioridad hasta cerrar la cadena. */
function resolver(s: GameState, ctx: Ctx, eleccion: (opciones: string[]) => string = (o) => o[0]): GameState {
  let e = s
  for (let i = 0; i < 20 && (e.cadena || e.objetivosPendientes?.length); i++) {
    const p = e.objetivosPendientes?.[0]
    e = p ? aplicar(e, { type: 'elegir_objetivo', objetivoId: eleccion(p.opciones) }, ctx) : aplicar(e, { type: 'pasar_prioridad' }, ctx)
  }
  return e
}

/** B tiene El Reino Perdido boca abajo y una Mística en el campo. A tiene `cartaId` en la mano. */
function escena(cartaId: string, eteres: number): GameState {
  const s = escenaVacia('forja')
  conMazo(s, 'A', 6); conMazo(s, 'B', 6)
  conArcana(s, 'B', 'reino', REINO, 0, { bocaArriba: false })
  conMistica(s, 'B', 'mist', PR.RAYO, 0)
  conMano(s, 'A', 'salida', cartaId); conEteres(s, 'A', eteres)
  return s
}

const jugar = (s: GameState, ctx: Ctx) => {
  const a = getValidActions(s, 'A').find((x) => x.type === 'jugar_mistica' && x.cardInstanceId === 'salida')
  expect(a, 'la salida debe poder jugarse').toBeDefined()
  return aplicar(s, a!, ctx)
}

describe('Embargo (PU-019, Purga): exilia un Campeón del Cementerio y destruye una Mística o Arcana', () => {
  it('destruye El Reino Perdido boca abajo, paga 2 Éter y exilia al Campeón caído', () => {
    const s0 = escena(EMBARGO, 5); enCementerio(s0, 'A', 'caido', PR.PEON)
    const ctx = crearCtx()
    const s = resolver(jugar(s0, ctx), ctx, (o) => (o.includes('reino') ? 'reino' : o[0]))
    expect(s.players.B.campo.arcanasCombate).not.toContain('reino')
    expect(s.players.B.cementerio).toContain('reino')
    expect(s.players.A.exilio).toContain('caido') // el combustible: el Campeón caído sale del Cementerio al Exilio
    expect(s.players.A.eterPagado).toHaveLength(2)
  })

  it('también puede destruir una Mística (las opciones son Místicas y Arcanas del rival)', () => {
    const s0 = escena(EMBARGO, 5); enCementerio(s0, 'A', 'caido', PR.PEON)
    const ctx = crearCtx()
    const s1 = jugar(s0, ctx)
    expect(s1.objetivosPendientes?.[0]?.opciones).toEqual(expect.arrayContaining(['reino', 'mist']))
    const s = resolver(s1, ctx, (o) => (o.includes('mist') ? 'mist' : o[0]))
    expect(s.players.B.campo.misticasTacticas).not.toContain('mist')
    expect(s.players.B.campo.arcanasCombate).toContain('reino') // la Arcana no se tocó
  })

  it('sin un Campeón en el Cementerio no destruye nada (como Sentencia Firme: hoy la carta SÍ se puede jugar y se desperdicia)', () => {
    const s0 = escena(EMBARGO, 5) // sin Campeón caído
    const ctx = crearCtx()
    const accion = getValidActions(s0, 'A').find((x) => x.type === 'jugar_mistica' && x.cardInstanceId === 'salida')
    const s = accion ? resolver(aplicar(s0, accion, ctx), ctx) : s0
    expect(s.players.B.campo.arcanasCombate).toContain('reino')
    expect(s.players.B.campo.misticasTacticas).toContain('mist')
  })
})

describe('Marchitez Fértil (MU-024, Mutación): destruye una Mística o Arcana y devuelve hasta 1 Éter de la zona de pago', () => {
  it('destruye El Reino Perdido y devuelve 1 Éter: cuesta 2 netos (3 pagados − 1)', () => {
    const s0 = escena(MARCHITEZ, 4)
    const ctx = crearCtx()
    const s = resolver(jugar(s0, ctx), ctx, (o) => (o.includes('reino') ? 'reino' : o[0]))
    expect(s.players.B.campo.arcanasCombate).not.toContain('reino')
    expect(s.players.B.cementerio).toContain('reino')
    expect(s.players.A.eterPagado).toHaveLength(2) // pagó 3, volvió 1
    expect(s.players.A.eterReserva).toHaveLength(2) // 4 − 3 pagados + 1 devuelto
  })

  it('el jugador ELIGE cuál de sus Éter pagados devuelve', () => {
    const s0 = escena(MARCHITEZ, 4)
    const ctx = crearCtx()
    let s = jugar(s0, ctx)
    // 1.ª elección: el destroy (Arcana o Mística rival); 2.ª: cuál de los 3 Éter que acaba de pagar vuelve a la Reserva
    expect([...(s.objetivosPendientes?.[0]?.opciones ?? [])].sort()).toEqual(['mist', 'reino'])
    s = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'reino' }, ctx)
    const eleccionEter = s.objetivosPendientes?.[0]
    expect(eleccionEter?.opciones).toEqual(s.players.A.eterPagado) // los 3 pagados, a elegir
    const elegido = eleccionEter!.opciones[2]
    s = resolver(s, ctx, () => elegido)
    expect(s.players.A.eterReserva).toContain(elegido)
    expect(s.players.A.eterPagado).not.toContain(elegido)
    expect(s.players.A.eterPagado).toHaveLength(2)
  })
})

describe('Guardia de diseño: ningún mazo que enfrenta al Reino se queda sin salida', () => {
  const destruyeMisticaOArcana = (efectos?: EfectoData[]) =>
    !!efectos?.some((e) => e.efecto === 'destroy' && ['mistica_arcana', 'arcana'].includes(e.objetivo?.tipo ?? '') && e.objetivo?.controlador === 'rival')

  for (const [mazo, cartas] of [['Disonancia', DISONANCIA_CARDS], ['Purga', PURGA_CARDS], ['Mutación', MUTACION_CARDS]] as const) {
    it(`${mazo} tiene al menos una carta que destruye una Mística o Arcana del rival`, () => {
      const salidas = (cartas as unknown as { id: string; efectos?: EfectoData[] }[]).filter((c) => destruyeMisticaOArcana(c.efectos)).map((c) => c.id)
      expect(salidas.length).toBeGreaterThan(0)
    })
  }
})
