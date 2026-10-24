// @vitest-environment node
/**
 * SUITE DE REGLAS DEL MANUAL (Capa 1) — Fase 1 auditoría 2026-10-22.
 *
 * Doctrina de capas: el manual es el default que TODO lo demás respeta.
 * Cada test codifica UNA regla textual del manual para que si vuelve a
 * caerse, el fallo grite en CI en vez de descubrirse a mano en una partida.
 *
 * Reglas cubiertas:
 * - §13.2  robar con Mazo vacío pierde (origen: Alba O efecto)
 * - §10    INMORTAL otorgado (temporal/aura) previene destrucción por efecto
 * - §10    ARTEFACTO: si el Campeón sale, la carta equipada va al Cementerio
 * - §7.2   Éter: moverlo nunca lo hace DESAPARECER del estado (destinos)
 * - §8.2   "Al inicio de tu turno" aplica a cualquier tipo de carta en campo
 * - §8.2   orden del Alba: enderezar → reagrupar el Éter → efectos de inicio → robar
 * - §5.3   hechizo de un solo uso vs permanente (esPermanenteEnMesa)
 */
import { describe, it, expect } from 'vitest'
import { registrarCartas, getCardMeta, esPermanenteEnMesa } from '../cards'
import { destruirCarta } from '../replacements'
import { robarCarta } from '../draw'
import { interpretEffect } from '../effectInterpreter'
import { resolverAlba } from '../phases'
import { registrarEfecto } from '../efectos'
import { getValidActions } from '../validActions'
import { applyAction } from '../actions'
import { validarActivarArcana } from '../habilidades'
import { validarBloquearEter } from '../economia'
import type { EfectoData } from '../../../shared/types'
import type { Ctx, GameState, PlayerId } from '../types'

function estadoMinimo(): GameState {
  const jugador = (id: PlayerId) => ({
    id,
    mano: [],
    mazo: [],
    cementerio: [],
    exilio: [],
    eterReserva: [],
    eterPagado: [],
    campo: { campeones: [null, null, null, null, null], misticasTacticas: [null, null, null], arcanasCombate: [null, null, null] },
    vinculos: [null, null, null, null, null, null],
    mulliganUsado: true,
  })
  return {
    version: 1,
    seed: 7,
    fase: 'forja' as const,
    turno: 'A' as const,
    primerJugador: 'A' as const,
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

describe('§13.2 — robar con el Mazo Principal vacío pierde (A3)', () => {
  it('la primitiva compartida (Alba Y efectos) derrota al intentar robar', () => {
    const s = estadoMinimo()
    const ctx = crearCtx()
    // Mazo vacío: el robo de efecto (executeDraw) y el de Alba usan ESTA primitiva
    robarCarta(s, ctx, 'A')
    expect(s.fase).toBe('terminada')
    expect(s.ganador).toBe('B')
    expect(s.motivo).toBe('mazo_vacio')
    expect(ctx.events).toContainEqual({ type: 'mazo_agotado', jugador: 'A' })
    expect(ctx.events).toContainEqual({ type: 'partida_terminada', ganador: 'B', motivo: 'mazo_vacio' })
  })
})

describe('§10 — INMORTAL otorgado previene destrucción (A1)', () => {
  it('un Campeón con Inmortal TEMPORAL (keywordsTemporales) no muere por efecto', () => {
    const s = estadoMinimo()
    const ctx = crearCtx()
    // Vaela FB-011 es Campeón real; Inmortal OTORGADO (aura/Éter/Comandante)
    s.instances['champ-1'] = {
      cardInstanceId: 'champ-1', cardId: 'FB-011', owner: 'A',
      keywordsTemporales: ['Inmortal'],
    }
    s.players.A.campo.campeones[0] = 'champ-1'

    const destruida = destruirCarta(s, ctx, 'champ-1', 'efecto')
    expect(destruida).toBe(false) // prevenida por INMORTAL
    expect(s.players.A.campo.campeones[0]).toBe('champ-1') // sigue en campo
    expect(ctx.events).toContainEqual({ type: 'destruccion_prevenida', cardInstanceId: 'champ-1', jugador: 'A', causa: 'efecto' })
  })
})

describe('§10 — ARTEFACTO: si el Campeón sale, la carta va al Cementerio (A2)', () => {
  it('al destruir al Campeón, su Artefacto equipado sale al Cementerio', () => {
    const s = estadoMinimo()
    const ctx = crearCtx()
    s.instances['champ-1'] = { cardInstanceId: 'champ-1', cardId: 'FB-011', owner: 'A' }
    s.instances['art-1'] = { cardInstanceId: 'art-1', cardId: 'FB-020', owner: 'A', equipadoA: 'champ-1' }
    s.players.A.campo.campeones[0] = 'champ-1'

    destruirCarta(s, ctx, 'champ-1', 'efecto')

    // El Campeón murió…
    expect(s.players.A.campo.campeones[0]).toBeNull()
    expect(s.players.A.cementerio).toContain('champ-1')
    // …y el Artefacto NO quedó huérfano en su slot
    expect(s.players.A.cementerio).toContain('art-1')
    expect(s.instances['art-1'].equipadoA).toBeUndefined()
  })
})

describe('§7.2 / Doctrina Capa 2 — mover Éter nunca lo hace desaparecer (B7)', () => {
  /** Éter de B en Reserva + efecto 'mover' de A con destino configurado. */
  function conEterRival(): { s: GameState; eterId: string } {
    const s = estadoMinimo()
    s.instances['eb-1'] = { cardInstanceId: 'eb-1', cardId: 'FB-001', owner: 'B' }
    s.players.B.eterReserva = ['eb-1']
    return { s, eterId: 'eb-1' }
  }

  it('destino cementerio → el Éter termina en el Cementerio (Capa 2: efecto manda)', () => {
    const { s, eterId } = conEterRival()
    const ctx = crearCtx()
    const efecto: EfectoData = {
      efecto: 'mover',
      objetivo: { tipo: 'eter', controlador: 'rival', zona: 'reserva', zonaDestino: 'cementerio' },
      stats: { ATQ: 0, RES: 0 },
      texto: '',
    } as EfectoData
    interpretEffect(s, ctx, s.instances['eb-1'], efecto, { jugador: 'A' })

    // Antes del fix: removido de la Reserva y no insertado a ninguna parte.
    expect(s.players.B.eterReserva).not.toContain(eterId)
    expect(s.players.B.cementerio).toContain(eterId)
  })

  it('destino AUSENTE → el Éter NO se remueve (sin pérdida de estado)', () => {
    const { s, eterId } = conEterRival()
    const ctx = crearCtx()
    const efecto: EfectoData = {
      efecto: 'mover',
      objetivo: { tipo: 'eter', controlador: 'rival', zona: 'reserva' },
      stats: { ATQ: 0, RES: 0 },
      texto: '',
    } as EfectoData
    interpretEffect(s, ctx, s.instances['eb-1'], efecto, { jugador: 'A' })

    // Sigue en la zona de origen — un hueco del efecto no pierde estado
    expect(s.players.B.eterReserva).toContain(eterId)
  })
})

describe('§8.2 — "Al inicio de tu turno" aplica a cualquier carta en campo (A7)', () => {
  it('un Campeón con trigger inicio_alba SÍ firea en tu Alba', () => {
    registrarCartas([{
      id: 'TEST-ALBA-01',
      name: 'Test Alba',
      type: 'Campeón',
      keywords: [],
      stats: { cost: 1, poder: 1, resistencia: 1 },
      efectos: [{
        tipo: 'disparo',
        efecto: 'draw',
        trigger: 'inicio_alba',
        cantidad: 1,
        objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' },
        stats: { ATQ: 0, RES: 0 },
        texto: 'Roba 1 carta al inicio de tu turno.',
      }],
    } as never])

    const s = estadoMinimo()
    const ctx = crearCtx()
    s.instances['champ-alba'] = { cardInstanceId: 'champ-alba', cardId: 'TEST-ALBA-01', owner: 'A' }
    s.players.A.campo.campeones[0] = 'champ-alba'
    s.players.A.mazo = ['c-robo-1', 'c-robo-2']
    s.instances['c-robo-1'] = { cardInstanceId: 'c-robo-1', cardId: 'FB-019', owner: 'A' }
    s.instances['c-robo-2'] = { cardInstanceId: 'c-robo-2', cardId: 'FB-019', owner: 'A' }

    resolverAlba(s, ctx, 'A')

    // 1 por el efecto (inicio_alba) + 1 natural del Alba = 2
    expect(s.players.A.mano).toHaveLength(2)
  })
})

describe('§8.2 — orden del Alba: enderezar → reagrupar → efectos de inicio → robar', () => {
  const CARTA = 'TEST-ALBA-ORDEN'
  registrarCartas([{
    id: CARTA,
    name: 'Test Orden del Alba',
    type: 'Campeón',
    keywords: [],
    stats: { cost: 1, poder: 1, resistencia: 1 },
  } as never])

  function escenario(): GameState {
    const s = estadoMinimo()
    s.instances['champ'] = { cardInstanceId: 'champ', cardId: CARTA, owner: 'A', agotado: true }
    s.players.A.campo.campeones[0] = 'champ'
    for (const id of ['pagado-1', 'pagado-2']) s.instances[id] = { cardInstanceId: id, cardId: 'FB-001', owner: 'A' }
    s.players.A.eterPagado = ['pagado-1', 'pagado-2']
    s.instances['reserva-1'] = { cardInstanceId: 'reserva-1', cardId: 'FB-001', owner: 'A' }
    s.players.A.eterReserva = ['reserva-1']
    s.players.A.mazo = ['robo-1']
    s.instances['robo-1'] = { cardInstanceId: 'robo-1', cardId: 'FB-019', owner: 'A' }
    return s
  }

  it('al llegar los efectos de inicio el Campeón ya está enderezado, el Éter reagrupado y todavía no se robó', () => {
    const visto: { agotado?: boolean; pagado: number; reserva: number; mano: number }[] = []
    registrarEfecto('al-inicio-alba', CARTA, (s) => {
      visto.push({
        agotado: s.instances['champ'].agotado,
        pagado: s.players.A.eterPagado.length,
        reserva: s.players.A.eterReserva.length,
        mano: s.players.A.mano.length,
      })
    })
    const s = escenario()
    resolverAlba(s, crearCtx(), 'A')

    expect(visto).toEqual([{ agotado: undefined, pagado: 0, reserva: 3, mano: 0 }])
    expect(s.players.A.mano).toEqual(['robo-1']) // el robo es lo último
  })

  it('lo que un efecto de inicio mueve a la zona de pago (1A) se queda ahí durante el turno', () => {
    registrarEfecto('al-inicio-alba', CARTA, (s) => {
      const id = s.players.A.eterReserva.pop()!
      s.players.A.eterPagado.push(id)
    })
    const s = escenario()
    resolverAlba(s, crearCtx(), 'A')

    expect(s.players.A.eterPagado).toHaveLength(1)
    expect(s.players.A.eterReserva).toHaveLength(2)
  })

  it('el Éter de efectos continuos (bloqueado en un Campeón) NO se reagrupa', () => {
    const s = escenario()
    s.instances['bloqueado-1'] = { cardInstanceId: 'bloqueado-1', cardId: 'FB-001', owner: 'A' }
    s.instances['champ'].eterBloqueado = ['bloqueado-1']
    resolverAlba(s, crearCtx(), 'A')

    expect(s.instances['champ'].eterBloqueado).toEqual(['bloqueado-1'])
    expect(s.players.A.eterReserva).not.toContain('bloqueado-1')
  })
})

describe('§5.3 — esPermanenteEnMesa: un solo uso vs permanente (A4)', () => {
  it('hechizo de un solo uso → cementerio; continuo/artefacto → permanece', () => {
    expect(esPermanenteEnMesa(getCardMeta('FB-019')!)).toBe(false) // Heredad del Alba: hechizo simple
    expect(esPermanenteEnMesa(getCardMeta('FB-020')!)).toBe(true)  // Lamento: Éter bloqueado + Artefacto
    expect(esPermanenteEnMesa(getCardMeta('FB-022')!)).toBe(true)  // Último Refugio: bloqueo_fijo
    // REDISEÑO obs 1874: Marcha (negar) ya NO es candado continuo — contador
    // de un solo uso que va al Cementerio como cualquier hechizo (§5.3)
    expect(esPermanenteEnMesa(getCardMeta('FB-021')!)).toBe(false)
  })
})

describe('§8.3a — Arcana se activa en cualquier fase menos Alba (A8)', () => {
  registrarCartas([{
    id: 'TEST-ARC-FASE',
    name: 'Test Arcana Fase',
    type: 'Arcana',
    keywords: [],
    stats: { cost: 1 },
    efectos: [],
  } as never])

  /** Arcana boca abajo en slot 0 + 1 Éter en Reserva + fase indicada. */
  function conArcana(fase: GameState['fase']): GameState {
    const s = estadoMinimo()
    s.fase = fase
    s.instances['arc-f'] = { cardInstanceId: 'arc-f', cardId: 'TEST-ARC-FASE', owner: 'A' }
    s.instances['e-1'] = { cardInstanceId: 'e-1', cardId: 'FB-001', owner: 'A' }
    s.players.A.campo.arcanasCombate[0] = 'arc-f'
    s.players.A.eterReserva = ['e-1']
    return s
  }
  const acc = { type: 'activar_arcana', cardInstanceId: 'arc-f', slot: 0, eterIds: ['e-1'] } as const

  it('se activa en Choque y en Ocaso (antes: solo Forja)', () => {
    expect(validarActivarArcana(conArcana('choque'), acc)).toBeNull()
    expect(validarActivarArcana(conArcana('ocaso'), acc)).toBeNull()
    expect(validarActivarArcana(conArcana('forja'), acc)).toBeNull()
  })

  it('rechaza en pre_partida con el mensaje de §8.3a (nunca en Alba)', () => {
    const err = validarActivarArcana(conArcana('pre_partida'), acc)
    expect(err).toMatch(/§8\.3a/)
  })
})

describe('§8.3a — Bloqueo de Éter en cualquier fase menos Alba, incluso en cadena (A9)', () => {
  /** Elena FB-015 (bloqueo_fijo:3) en campo + 3 Éteres en Reserva. */
  function conElena(fase: GameState['fase']): GameState {
    const s = estadoMinimo()
    s.fase = fase
    s.instances['elena'] = { cardInstanceId: 'elena', cardId: 'FB-015', owner: 'A' }
    s.players.A.campo.campeones[0] = 'elena'
    s.players.A.eterReserva = ['e1', 'e2', 'e3']
    for (const id of ['e1', 'e2', 'e3']) {
      s.instances[id] = { cardInstanceId: id, cardId: 'FB-001', owner: 'A' }
    }
    return s
  }
  const acc = { type: 'bloquear_eter', eterIds: ['e1', 'e2', 'e3'], targetInstanceId: 'elena' } as const

  it('se bloquea en Choque (sin combate) y en Ocaso (antes: solo Forja)', () => {
    expect(validarBloquearEter(conElena('choque'), acc)).toBeNull()
    expect(validarBloquearEter(conElena('ocaso'), acc)).toBeNull()
    expect(validarBloquearEter(conElena('forja'), acc)).toBeNull()
  })

  it('rechaza en pre_partida con el mensaje de §8.3a', () => {
    expect(validarBloquearEter(conElena('pre_partida'), acc)).toMatch(/§8\.3a/)
  })

  it('se EXPONE como respuesta con prioridad en una cadena abierta', () => {
    const s = conElena('forja')
    s.cadena = { origen: 'global', pila: [], prioridad: 'A', pasesConsecutivos: 0, faseAbierta: 'forja' }
    const tipos = getValidActions(s, 'A').map((a) => a.type)
    expect(tipos).toContain('bloquear_eter') // disponible como respuesta (§8.3a)
    expect(tipos).toContain('pasar_prioridad')
    // El rival (sin prioridad) no recibe acciones de bloqueo
    expect(getValidActions(s, 'B').map((a) => a.type)).toEqual(['rendirse'])
  })
})

describe('§9.2 — el atacante elige CUALQUIER subconjunto de atacantes (A6)', () => {
  it('3 elegibles → 7 declarar_ataque (2^n - 1) y el subconjunto parcial pasa validación', () => {
    const s = estadoMinimo()
    s.fase = 'choque'
    s.primerTurno = false
    for (const [i, id] of ['c1', 'c2', 'c3'].entries()) {
      s.instances[id] = { cardInstanceId: id, cardId: 'FB-011', owner: 'A' }
      s.players.A.campo.campeones[i] = id
    }

    const ataques = getValidActions(s, 'A').filter((a) => a.type === 'declarar_ataque')
    expect(ataques).toHaveLength(7) // {1,2,3},{1},{2},{3},{1,2},{1,3},{2,3}
    // El PRIMERO es "todos" (los bots hacen find() — compat ADR-19)
    expect((ataques[0] as { atacanteIds: string[] }).atacanteIds).toHaveLength(3)

    // El subconjunto {c1,c2} pasa applyAction (A6: no más "todos o exactamente uno")
    const sub = ataques.find(
      (a) => a.type === 'declarar_ataque' && a.atacanteIds.length === 2,
    )!
    const r = applyAction(s, sub, crearCtx())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.state.combate?.atacantes).toHaveLength(2)
  })
})

describe('§9.3 — el defensor ELIGE con qué bloquear, máximo posible (A5)', () => {
  it('2 ataques vs 2 bloqueadores → todas las asignaciones maximales (greedy primero)', () => {
    const s: GameState = {
      ...estadoMinimo(),
      fase: 'choque',
      primerTurno: false,
      players: {
        A: { ...estadoMinimo().players.A, campo: { ...estadoMinimo().players.A.campo, campeones: ['a1', 'a2', null, null, null] } },
        B: { ...estadoMinimo().players.B, campo: { ...estadoMinimo().players.B.campo, campeones: ['b1', 'b2', null, null, null] } },
      },
      instances: {
        a1: { cardInstanceId: 'a1', cardId: 'FB-011', owner: 'A' },
        a2: { cardInstanceId: 'a2', cardId: 'FB-011', owner: 'A' },
        b1: { cardInstanceId: 'b1', cardId: 'FB-011', owner: 'B' },
        b2: { cardInstanceId: 'b2', cardId: 'FB-011', owner: 'B' },
      },
      combate: { paso: 'bloqueo', atacantes: ['a1', 'a2'], bloqueos: {}, rupturaDisponible: true, rupturaUsadaEsteTurno: false },
    }

    const bloqueos = getValidActions(s, 'B').filter((a) => a.type === 'declarar_bloqueo')
    // C(2,2) × P(2,2) = 2 — la PRIMERA es la greedy (compat bots)
    expect(bloqueos).toHaveLength(2)
    expect((bloqueos[0] as { asignaciones: Record<string, string> }).asignaciones).toEqual({ a1: 'b1', a2: 'b2' })

    // La asignación NO greedy (swap) también pasa applyAction — A5: elección real
    const libre = (bloqueos[1] as { asignaciones: Record<string, string> }).asignaciones
    expect(libre).toEqual({ a1: 'b2', a2: 'b1' })
    const r = applyAction(s, bloqueos[1], crearCtx())
    expect(r.ok).toBe(true)
    if (r.ok) expect(r.state.combate?.paso).toBe('resolucion')
  })
})
