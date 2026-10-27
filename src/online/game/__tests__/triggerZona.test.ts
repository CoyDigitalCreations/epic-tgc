// @vitest-environment node
/**
 * «Al ser enviada al Cementerio DESDE el campo / la mano / cualquier zona» (`triggerZona`). El motor ignoraba la zona: Titania
 * (FB-031, «desde el campo») también buscaba al descartarla de la mano. Ahora solo dispara si la carta VENÍA de esa zona;
 * «desde cualquier zona» (Mira, Emisario del Nudo) y sin `triggerZona` siguen disparando siempre.
 * Cartas sintéticas (observable: robar 1) + Titania real.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { enviarAlCementerio, destruirCarta } from '../replacements'
import { aplicar, cargarCartasPrueba, conCampeon, conMano, conMazo, crearCtx, escenaVacia } from './helpers/cartasPrueba'
import { getValidActions } from '../validActions'
import type { AnyCard } from '../../../shared/types'
import type { GameState } from '../types'

const base = {
  rarity: 'Común' as const, flavorText: '', paqueteId: 'test', limiteCopias: '3' as const,
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
}
const ROBA = (triggerZona?: string) => ({
  tipo: 'pasivo', trigger: 'al_ser_enviado_al_cementerio', efecto: 'draw', objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' },
  ...(triggerZona ? { triggerZona } : {}),
})
const carta = (id: string, efecto: object): AnyCard =>
  ({ ...base, id, name: id, type: 'Campeón', keywords: [], facciones: ['Orden'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos: [efecto] }) as never

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([carta('T-Z-CAMPO', ROBA('campo')), carta('T-Z-MANO', ROBA('mano')), carta('T-Z-CUALQUIERA', ROBA('cualquier_zona')), carta('T-Z-SIN', ROBA())])
})

/** La carta `cardId` en el campo de A, o en su mano, con un mazo para robar. */
function escena(cardId: string, donde: 'campo' | 'mano'): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A', 4)
  if (donde === 'campo') conCampeon(s, 'A', 'x', cardId, 0)
  else conMano(s, 'A', 'x', cardId)
  return s
}
/** Cuántas cartas robó A por el gatillo. */
const robo = (s: GameState) => s.players.A.mano.filter((id) => id !== 'x').length

describe('desde el CAMPO (muere o se sacrifica en el campo)', () => {
  it('destruida en el campo: dispara si es «desde el campo», «desde cualquier zona» o sin zona; no si es «desde la mano»', () => {
    for (const [id, dispara] of [['T-Z-CAMPO', true], ['T-Z-CUALQUIERA', true], ['T-Z-SIN', true], ['T-Z-MANO', false]] as const) {
      const s = escena(id, 'campo'); destruirCarta(s, crearCtx(), 'x', 'efecto')
      expect(robo(s), id).toBe(dispara ? 1 : 0)
    }
  })
  it('sacrificada (la sacan antes de llamar): el llamador dice que viene del campo', () => {
    const s = escena('T-Z-CAMPO', 'campo'); s.players.A.campo.campeones[0] = null
    enviarAlCementerio(s, crearCtx(), 'x', 'campo')
    expect(robo(s)).toBe(1)
  })
})

describe('desde la MANO (se descarta)', () => {
  it('descartada: dispara si es «desde la mano», «desde cualquier zona» o sin zona; NO si es «desde el campo»', () => {
    for (const [id, dispara] of [['T-Z-MANO', true], ['T-Z-CUALQUIERA', true], ['T-Z-SIN', true], ['T-Z-CAMPO', false]] as const) {
      const s = escena(id, 'mano'); s.players.A.mano.splice(s.players.A.mano.indexOf('x'), 1)
      enviarAlCementerio(s, crearCtx(), 'x', 'mano')
      expect(robo(s), id).toBe(dispara ? 1 : 0)
    }
  })
})

describe('Titania (FB-031, «desde el campo») REAL', () => {
  // Busca 1 Campeón Orden/Céleste coste ≤ 4 del MAZO: Mira (FB-012) lo es y está en el mazo de A
  function conTitania(donde: 'campo' | 'mano'): GameState {
    const s = escena('FB-031', donde)
    s.instances.mira = { cardInstanceId: 'mira', cardId: 'FB-012', owner: 'A' }
    s.players.A.mazo.unshift('mira')
    return s
  }
  it('muere en el campo → arma su búsqueda; al elegir, Mira va a la mano', () => {
    const s0 = conTitania('campo'); const ctx = crearCtx()
    destruirCarta(s0, ctx, 'x', 'efecto')
    expect(s0.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'x', opciones: ['mira'] })
    const s = aplicar(s0, { type: 'elegir_objetivo', objetivoId: 'mira' }, ctx)
    expect(s.players.A.mano).toContain('mira')
  })
  it('se DESCARTA de la mano → no busca nada (antes sí lo hacía)', () => {
    const s = conTitania('mano'); s.players.A.mano.splice(s.players.A.mano.indexOf('x'), 1)
    enviarAlCementerio(s, crearCtx(), 'x', 'mano')
    expect(s.objetivosPendientes ?? []).toEqual([])
    expect(getValidActions(s, 'A').some((a) => a.type === 'elegir_objetivo')).toBe(false)
  })
})

describe('Mira (FB-012, «desde cualquier zona») REAL', () => {
  it('descartada de la mano SÍ dispara (su zona es cualquiera)', () => {
    const s = escena('FB-012', 'mano'); s.players.A.mano.splice(s.players.A.mano.indexOf('x'), 1)
    // busca 1 Campeón Orden/Céleste de su CEMENTERIO: se lo damos
    s.instances.tit = { cardInstanceId: 'tit', cardId: 'FB-031', owner: 'A' }; s.players.A.cementerio.push('tit')
    enviarAlCementerio(s, crearCtx(), 'x', 'mano')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ instId: 'x' })
  })
})
