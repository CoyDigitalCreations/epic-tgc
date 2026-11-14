// @vitest-environment node
/**
 * Lote 3 del motor de Estásis — cartas REALES del seed (Aurora FB-010, Mira FB-012, El Reino Perdido FB-023, Runa de Ancla FB-033):
 *  - `activar_disparo` (Resonancia): ejecuta el Disparo de otro Campeón propio y comprueba/consume su «una vez por turno».
 *  - `anclar_eter`: el Éter anclado se queda en 1A durante la próxima Alba del rival (después de la purga de 'alba').
 *  - `cuando_campeon_propio_al_cementerio` + coste `bloqueo_fijo` de un efecto con trigger (antes salía gratis) + reagrupar.
 *  - La acción bloquear_eter ya no se ofrece para un efecto que se paga al dispararse su trigger (fuga de Éter).
 *  - Arcana boca abajo con trigger: se documenta la semántica vigente.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import { destruirCarta } from '../replacements'
import { statsDe, triggersQueMatchean } from '../efectos'
import { etersParaPagar } from '../payments'
import { getValidActions } from '../validActions'
import { buildReporte } from '../coverageMap'
import { limpiarMemoReglas } from '../reglas'
import { getCardMeta } from '../cards'
import type { GameState } from '../types'
import { aplicar, cargarCartasPrueba, conArcana, conCampeon, conEteres, conMano, conMazo, crearCtx, escenaVacia, inst, PR } from './helpers/cartasPrueba'

const AURORA = 'FB-010'
const MIRA = 'FB-012'
const REINO = 'FB-023'
const RUNA = 'FB-033'
const ORDEN_DISPARA = 'TEST-L3-ORDEN-DISPARA'
const OBSERVADOR = 'TEST-L3-OBSERVADOR'
const OBSERVADOR_RIVAL = 'TEST-L3-OBSERVADOR-RIVAL'

const base = (id: string, efectos: unknown[]) => ({
  id, name: id, type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', paqueteId: 'test', limiteCopias: '1',
  facciones: ['Orden'], esencia: 'Céleste', roles: ['Normal'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos,
}) as unknown as AnyCard

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([
    // Disparo de 1 Éter: +1 ATQ a sí mismo
    base(ORDEN_DISPARA, [{ tipo: 'disparo', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'self', zona: 'campo' }, costo: { tipo: 'eter', cantidad: 1 }, texto: 'Puedes pagar 1 Éter: gana +1 ATQ.' }]),
    // Observadores del trigger nuevo, solo para probar el filtro propio/rival y `excluyeEsta` (sin costo)
    base(OBSERVADOR, [{ tipo: 'pasivo', trigger: 'cuando_campeon_propio_al_cementerio', efecto: 'recuperar_mano', objetivo: { tipo: 'campeon_del_trigger', controlador: 'propio', zona: 'cementerio', excluyeEsta: true }, texto: 'x' }]),
    base(OBSERVADOR_RIVAL, [{ tipo: 'pasivo', trigger: 'cuando_campeon_propio_al_cementerio', controladorTrigger: 'rival', efecto: 'recuperar_mano', objetivo: { tipo: 'campeon_del_trigger', controlador: 'rival', zona: 'cementerio' }, texto: 'x' }]),
  ])
  limpiarMemoReglas()
})

/** Pasa turnos hasta que sea el turno de `quien`. */
function hastaTurnoDe(s: GameState, quien: 'A' | 'B'): GameState {
  let e = s; const ctx = crearCtx()
  for (let i = 0; i < 12 && e.turno !== quien; i++) e = aplicar(e, getValidActions(e, e.turno).find((x) => x.type === 'pasar_turno')!, ctx)
  return e
}
/** Pasa de verdad un ciclo completo (A y B) hasta volver a A. */
function cicloCompleto(s: GameState): GameState {
  let e = hastaTurnoDe(s, 'B'); const ctx = crearCtx()
  e = aplicar(e, getValidActions(e, 'B').find((x) => x.type === 'pasar_turno')!, ctx)
  while (e.turno !== 'A') e = aplicar(e, getValidActions(e, e.turno).find((x) => x.type === 'pasar_turno')!, ctx)
  return e
}

/* ═══════════════════════════ 1. activar_disparo (Resonancia) ═══════════════════════════ */

describe('activar_disparo — Aurora: Resonancia', () => {
  function escena(): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6)
    conCampeon(s, 'A', 'aurora', AURORA, 0)
    conCampeon(s, 'A', 'mira', MIRA, 1)
    conEteres(s, 'A', 8)
    return s
  }
  const resonar = (s: GameState) => aplicar(s, { type: 'activar_habilidad', cardInstanceId: 'aurora', eterIds: s.players.A.eterReserva.slice(0, 2) }, crearCtx())

  it('paga 2 Éter y ejecuta el Disparo de Mira SIN pagar su costo ni agotarla (el jugador elige qué 2 Éter de 1A vuelven a la Reserva)', () => {
    const s0 = escena()
    const pagados = conEteres(s0, 'A', 2).map((id) => { s0.players.A.eterReserva.pop(); s0.players.A.eterPagado.push(id); return id })
    const ctx = crearCtx()
    const s1 = resonar(s0)
    // Resonancia dejó 4 Éter en 1A (2 que ya estaban + 2 que pagó): hay que ELEGIR cuáles 2 devuelve Mira
    expect(s1.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', restantes: 1 })
    const s2 = aplicar(s1, { type: 'elegir_objetivo', objetivoId: pagados[0] }, ctx)
    const s = aplicar(s2, { type: 'elegir_objetivo', objetivoId: pagados[1] }, ctx)
    expect(s.players.A.eterPagado).toEqual([...s.players.A.eterPagado.filter((x) => !pagados.includes(x))]) // los 2 salieron de 1A
    for (const id of pagados) expect(s.players.A.eterReserva).toContain(id)
    // Resonancia costó 2 (Reserva 8 → 6 + 2 devueltos); el Disparo de Mira no cobró su 1 Éter
    expect(s.players.A.eterReserva).toHaveLength(8 - 2 + 2)
    expect(s.players.A.eterPagado).toHaveLength(2) // los 2 que pagó Aurora
    expect(s.instances.mira.agotado).toBeFalsy() // «sin agotarlo»
  })

  it('COMPRUEBA y CONSUME el «una vez por turno» del Disparo copiado: Mira ya no puede usarlo sola, y nadie hace bucle', () => {
    const s0 = escena()
    expect(s0.instances.mira.efectosUsadosEsteTurno).toBeUndefined()
    const s = resonar(s0)
    expect(s.instances.mira.efectosUsadosEsteTurno).toContain(1) // el índice del Disparo de Mira en efectos[]
    const aMira = applyAction(s, { type: 'activar_habilidad', cardInstanceId: 'mira', eterIds: [s.players.A.eterReserva[0]] }, crearCtx())
    expect(aMira.ok).toBe(false)
  })

  it('si Mira YA gastó su «una vez por turno», Resonancia no la ofrece ni se puede activar (no se paga en balde)', () => {
    const s0 = escena()
    s0.instances.mira.efectosUsadosEsteTurno = [1]
    expect(getValidActions(s0, 'A').some((a) => a.type === 'activar_habilidad' && a.cardInstanceId === 'aurora')).toBe(false)
    const r = applyAction(s0, { type: 'activar_habilidad', cardInstanceId: 'aurora', eterIds: s0.players.A.eterReserva.slice(0, 2) }, crearCtx())
    expect(r.ok).toBe(false)
  })

  it('Aurora no se elige a sí misma (excluyeEsta): sola en el campo no puede activar Resonancia', () => {
    const s = escena(); s.players.A.campo.campeones[1] = null
    expect(getValidActions(s, 'A').some((a) => a.type === 'activar_habilidad' && a.cardInstanceId === 'aurora')).toBe(false)
  })

  it('Resonancia es una vez por turno (el suyo)', () => {
    const s = resonar(escena())
    const otra = applyAction(s, { type: 'activar_habilidad', cardInstanceId: 'aurora', eterIds: s.players.A.eterReserva.slice(0, 2) }, crearCtx())
    expect(otra.ok).toBe(false)
  })

  it('con varios Campeones elegibles se ELIGE el objetivo y solo ese resuelve su Disparo', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'ord', ORDEN_DISPARA, 2)
    conCampeon(s0, 'A', 'ord2', ORDEN_DISPARA, 3)
    s0.players.A.campo.campeones[1] = null // sin Mira: solo los dos de +1 ATQ
    const antes = statsDe(s0, 'ord').poder
    const s1 = resonar(s0)
    expect(s1.objetivosPendientes?.[0]?.opciones.sort()).toEqual(['ord', 'ord2'])
    const s2 = aplicar(s1, { type: 'elegir_objetivo', objetivoId: 'ord2' }, crearCtx())
    expect(statsDe(s2, 'ord2').poder).toBe(antes + 1)
    expect(statsDe(s2, 'ord').poder).toBe(antes)
    expect(s2.instances.ord2.agotado).toBeFalsy()
  })

  it('un Campeón sin Disparo no es candidato', () => {
    const s = escena(); s.players.A.campo.campeones[1] = null
    conCampeon(s, 'A', 'peon', PR.PEON, 1)
    expect(getValidActions(s, 'A').some((a) => a.type === 'activar_habilidad' && a.cardInstanceId === 'aurora')).toBe(false)
  })
})

/* ═══════════════════════════ 2. anclar_eter (Runa de Ancla) ═══════════════════════════ */

describe('anclar_eter — Runa de Ancla', () => {
  function escena(): { s: GameState; pagados: string[] } {
    const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6)
    conMano(s, 'A', 'runa', RUNA)
    conEteres(s, 'A', 6)
    const pagados = conEteres(s, 'B', 3).map((id) => { s.players.B.eterReserva.pop(); s.players.B.eterPagado.push(id); return id })
    return { s, pagados }
  }
  const jugarRuna = (s: GameState) => {
    const pago = etersParaPagar(s, 'A', RUNA)!
    return aplicar(s, { type: 'jugar_mistica', cardInstanceId: 'runa', slot: 0, eterIds: pago }, crearCtx())
  }

  it('ancla hasta 2 Éter de la zona de pago del rival (sin elección)', () => {
    const { s, pagados } = escena()
    const e = jugarRuna(s)
    expect(e.players.B.eterAnclado).toEqual(pagados.slice(0, 2))
    expect(e.players.B.eterPagado).toHaveLength(3) // siguen en 1A, solo marcados
    expect(e.players.A.eterAnclado).toBeUndefined()
  })

  it('en la próxima Alba del rival los anclados SOBREVIVEN a la purga y al reagrupar; el resto vuelve a la Reserva', () => {
    const { s, pagados } = escena()
    const e = hastaTurnoDe(jugarRuna(s), 'B')
    expect(e.players.B.eterPagado.sort()).toEqual(pagados.slice(0, 2).sort())
    expect(e.players.B.eterReserva).toContain(pagados[2])
    expect(e.players.B.eterAnclado).toBeUndefined() // el ancla dura UNA sola Alba
  })

  it('en la Alba SIGUIENTE ya se reagrupan todos', () => {
    const { s, pagados } = escena()
    const e = cicloCompleto(hastaTurnoDe(jugarRuna(s), 'B'))
    const e2 = hastaTurnoDe(e, 'B')
    expect(e2.players.B.eterPagado.filter((x) => pagados.includes(x))).toEqual([])
    for (const id of pagados) expect(e2.players.B.eterReserva).toContain(id)
  })

  it('un Éter anclado que ya no está en 1A no rompe nada: la marca se borra igual', () => {
    const { s } = escena()
    const e0 = jugarRuna(s)
    e0.players.B.eterPagado = [] // p. ej. se gastó/bloqueó antes de su Alba
    const e = hastaTurnoDe(e0, 'B')
    expect(e.players.B.eterAnclado).toBeUndefined()
  })

  it('sin Éter en la zona de pago del rival la Mística se juega igual y no ancla nada', () => {
    const { s } = escena(); s.players.B.eterPagado = []
    const e = jugarRuna(s)
    expect(e.players.B.eterAnclado).toBeUndefined()
  })
})

/* ═══════════════════════════ 3-6. El Reino Perdido (trigger + bloqueo_fijo) ═══════════════════════════ */

describe('El Reino Perdido (FB-023) — cuando un Campeón que controlas va al Cementerio', () => {
  function escena(opts: { eteres?: number; bocaArriba?: boolean } = {}): GameState {
    const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6)
    conArcana(s, 'A', 'reino', REINO, 0, { bocaArriba: opts.bocaArriba ?? false })
    conCampeon(s, 'A', 'peon', PR.PEON, 0)
    conCampeon(s, 'A', 'peon2', PR.PEON, 1)
    conEteres(s, 'A', opts.eteres ?? 5)
    return s
  }
  const matar = (s: GameState, id: string): GameState => { const c = structuredClone(s); destruirCarta(c, crearCtx(), id, 'efecto'); return c }

  it('PAGA el bloqueo (antes salía gratis): bloquea 2 Éter en la Arcana y devuelve al Campeón a la mano', () => {
    const s = matar(escena(), 'peon')
    expect(s.players.A.mano).toContain('peon')
    expect(s.players.A.cementerio).not.toContain('peon')
    expect(s.instances.reino.eterBloqueado).toHaveLength(2)
    expect(s.players.A.eterReserva).toHaveLength(3) // 5 − 2
    expect(s.instances.reino.efectosUsadosEsteTurno).toEqual([0])
  })

  it('sin Éter suficiente para el bloqueo NO se devuelve (el efecto solo ocurre si se paga) y no se cobra nada', () => {
    const s = matar(escena({ eteres: 1 }), 'peon')
    expect(s.players.A.mano).not.toContain('peon')
    expect(s.players.A.cementerio).toContain('peon')
    expect(s.instances.reino.eterBloqueado).toBeUndefined()
    expect(s.players.A.eterReserva).toHaveLength(1)
  })

  it('«una vez por turno»: el segundo Campeón que muere el mismo turno se queda en el Cementerio y no se cobra de nuevo', () => {
    const s = matar(matar(escena(), 'peon'), 'peon2')
    expect(s.players.A.mano).toContain('peon')
    expect(s.players.A.cementerio).toContain('peon2')
    expect(s.instances.reino.eterBloqueado).toHaveLength(2)
  })

  it('un Campeón del RIVAL que muere no la dispara (controla el trigger quien lo controlaba)', () => {
    const s0 = escena(); conCampeon(s0, 'B', 'rival', PR.PEON, 0)
    const s = matar(s0, 'rival')
    expect(s.players.B.cementerio).toContain('rival')
    expect(s.instances.reino.eterBloqueado).toBeUndefined()
  })

  it('un Campeón ROBADO que muere va a la mano de su DUEÑO (no a la de quien lo controlaba)', () => {
    const s0 = escena()
    inst(s0, 'robado', PR.PEON, 'B', { stolenBy: 'peon' })
    s0.players.A.campo.campeones[2] = 'robado'
    const s = matar(s0, 'robado')
    expect(s.players.B.mano).toContain('robado')
    expect(s.players.A.mano).not.toContain('robado')
    expect(s.instances.reino.eterBloqueado).toHaveLength(2)
  })

  it('el Campeón que vuelve a la mano es una carta nueva (sin buffs ni agotamiento de su vida anterior)', () => {
    const s0 = escena(); s0.instances.peon.agotado = true; s0.instances.peon.modificadores = [{ stat: 'poder', valor: 3, expira: 'turno' } as never]
    const s = matar(s0, 'peon')
    expect(s.instances.peon.agotado).toBeUndefined()
    expect(s.instances.peon.modificadores ?? []).toEqual([])
  })

  it('REAGRUPAR: el Éter bloqueado vuelve a la Reserva en el Alba PROPIA', () => {
    const s = matar(escena(), 'peon')
    const e = cicloCompleto(s)
    expect(e.instances.reino.eterBloqueado).toBeUndefined()
    expect(e.players.A.eterReserva).toHaveLength(5)
  })

  it('FUGA de bloquear_eter: la acción manual NO se ofrece para un efecto que se paga con su trigger, y el motor la rechaza', () => {
    const s = escena({ eteres: 6 })
    expect(getValidActions(s, 'A').some((a) => a.type === 'bloquear_eter' && a.targetInstanceId === 'reino')).toBe(false)
    const r = applyAction(s, { type: 'bloquear_eter', eterIds: s.players.A.eterReserva.slice(0, 2), targetInstanceId: 'reino' }, crearCtx())
    expect(r.ok).toBe(false)
  })

  describe('Arcana BOCA ABAJO con trigger (decisión diferida del Lote 0): se mantiene la semántica vigente', () => {
    it('boca abajo dispara igual (candado y llave: solo los Vínculos boca abajo están filtrados) y NO se revela', () => {
      const s = matar(escena({ bocaArriba: false }), 'peon')
      expect(s.players.A.mano).toContain('peon')
      expect(s.instances.reino.bocaArriba).toBe(false)
    })
    it('boca arriba se comporta igual', () => {
      const s = matar(escena({ bocaArriba: true }), 'peon')
      expect(s.players.A.mano).toContain('peon')
    })
    it('recién colocada (entradaEsteTurno) también dispara: la activación diferida (§5.4) rige solo la acción activar_arcana', () => {
      const s0 = escena(); s0.instances.reino.entradaEsteTurno = true
      expect(matar(s0, 'peon').players.A.mano).toContain('peon')
    })
  })
})

describe('trigger cuando_campeon_propio_al_cementerio — filtros (triggersQueMatchean)', () => {
  function escena(): GameState {
    const s = escenaVacia('forja')
    conCampeon(s, 'A', 'obs', OBSERVADOR, 0)
    conCampeon(s, 'A', 'obsR', OBSERVADOR_RIVAL, 1)
    return s
  }
  const mide = (s: GameState, jugador: 'A' | 'B', id: string, victimaId: string, controladorVictima: 'A' | 'B') =>
    triggersQueMatchean(s, 'cuando-campeon-al-cementerio', jugador, [id], { victimaId, controladorVictima }).length

  it('«que controles» (por defecto): solo si el Campeón era del mismo controlador que la fuente', () => {
    const s = escena()
    expect(mide(s, 'A', 'obs', 'otro', 'A')).toBe(1)
    expect(mide(s, 'A', 'obs', 'otro', 'B')).toBe(0)
  })
  it('`controladorTrigger: rival`: solo si el Campeón era del rival de la fuente', () => {
    const s = escena()
    expect(mide(s, 'A', 'obsR', 'otro', 'B')).toBe(1)
    expect(mide(s, 'A', 'obsR', 'otro', 'A')).toBe(0)
  })
  it('`excluyeEsta` («otro Campeón»): la propia carta no dispara con su envío al Cementerio', () => {
    const s = escena()
    expect(mide(s, 'A', 'obs', 'obs', 'A')).toBe(0)
    expect(mide(s, 'A', 'obs', 'otro', 'A')).toBe(1)
  })
  it('un Campeón en juego que observa recupera a OTRO Campeón propio que muere (flujo completo)', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'victima', PR.PEON, 2)
    const s = structuredClone(s0); destruirCarta(s, crearCtx(), 'victima', 'efecto')
    expect(s.players.A.mano).toContain('victima')
  })
})

/* ═══════════════════════════ 8. Cobertura ═══════════════════════════ */

describe('coverageMap — los efectos y triggers nuevos quedan registrados', () => {
  it('Aurora (activar_disparo), Runa de Ancla (anclar_eter) y el Reino Perdido (trigger nuevo) tienen ejecutor', () => {
    const cartas = [AURORA, RUNA, REINO].map((id) => getCardMeta(id)!)
    const r = buildReporte(cartas)
    const sin = r.items.filter((i) => !i.estado.startsWith('OK_')).map((i) => `${i.cardId}:${i.efecto}:${i.estado}`)
    expect(sin).toEqual([])
    expect(r.items.some((i) => i.cardId === REINO && i.trigger === 'cuando_campeon_propio_al_cementerio')).toBe(true)
  })
})
