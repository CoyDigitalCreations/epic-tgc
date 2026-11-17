// @vitest-environment node
/**
 * Una Arcana cuyos efectos TODOS esperan un evento (trigger distinto de «ninguno»: «cuando un Campeón que controles sea enviado al
 * Cementerio», «cuando juegues una Mística», «al atacar»…) la dispara el motor SOLA cuando ocurre ese evento (dispararTrigger), boca
 * abajo o arriba. Por eso NO se activa a mano ni se juega como respuesta: antes se podía, sin que el evento hubiera ocurrido, y el
 * jugador pagaba el coste de la carta por nada y gastaba su «una vez por turno» (caso real: El Reino Perdido activada en la cadena
 * de otro efecto; al morir después un Campeón en ese mismo turno ya no pudo devolverlo a la mano).
 *
 * Genérico: se prueba con cartas reales de tres triggers distintos y con un control (Arcana SIN trigger, que se sigue activando).
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { motivoArcanaNoActivable, motivoNoResponde, respondiblesDe } from '../chain'
import { destruirCarta } from '../replacements'
import { getValidActions } from '../validActions'
import type { GameState } from '../types'
import { cargarCartasPrueba, conArcana, conCampeon, conEteres, conMazo, crearCtx, escenaVacia, PR } from './helpers/cartasPrueba'

const REINO = 'FB-023' //   cuando_campeon_propio_al_cementerio
const REFLEJO = 'MU-030' // cuando_juegas_mistica
const CADENA = 'PU-029' //  al_atacar
const FLORACION = 'MU-031' // sin trigger (condición «activación»): control

beforeAll(() => {
  cargarCartasPrueba()
})

function escena(cardId: string): GameState {
  const s = escenaVacia('forja')
  conMazo(s, 'A', 6); conMazo(s, 'B', 6)
  conArcana(s, 'A', 'arc', cardId, 0, { bocaArriba: false })
  conCampeon(s, 'A', 'peon', PR.PEON, 0)
  conEteres(s, 'A', 6)
  return s
}

describe('Arcana con efectos solo por evento: no se activa a mano ni responde', () => {
  for (const [nombre, id] of [['El Reino Perdido', REINO], ['Reflejo del Cambio', REFLEJO], ['Cadena de Custodia', CADENA]] as const) {
    it(`${nombre} (${id}): no se ofrece activar_arcana ni se acepta si se fuerza`, () => {
      const s = escena(id)
      expect(motivoArcanaNoActivable(s, 'A', 'arc')).toMatch(/evento|sola/i)
      expect(getValidActions(s, 'A').some((a) => a.type === 'activar_arcana' && a.cardInstanceId === 'arc')).toBe(false)
      const r = applyAction(s, { type: 'activar_arcana', cardInstanceId: 'arc', slot: 0, eterIds: s.players.A.eterReserva.slice(0, 3) } as never, crearCtx())
      expect(r.ok).toBe(false)
    })

    it(`${nombre} (${id}): tampoco responde en una cadena`, () => {
      const s = escena(id)
      expect(motivoNoResponde(s, 'A', 'arc', 'campo')).not.toBeNull()
      expect(respondiblesDe(s, 'A')).not.toContain('arc')
    })
  }

  it('CONTROL: una Arcana sin trigger de evento (Floración) sigue activándose a mano', () => {
    const s = escena(FLORACION)
    for (let i = 1; i < 4; i++) conCampeon(s, 'A', `extra${i}`, PR.PEON, i) // su condición: 4 o más Campeones en campo
    expect(motivoArcanaNoActivable(s, 'A', 'arc')).toBeNull()
  })

  it('El Reino Perdido sigue disparándose SOLA al morir un Campeón (y su «una vez por turno» no se gasta antes)', () => {
    const s = escena(REINO)
    const c = structuredClone(s)
    destruirCarta(c, crearCtx(), 'peon', 'efecto')
    expect(c.players.A.mano).toContain('peon')
    expect(c.instances.arc.eterBloqueado).toHaveLength(2)
  })
})
