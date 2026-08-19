// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { applyAction } from '../actions'
import type { Action } from '../actions'
import { getValidActions } from '../validActions'
import { dispararTrigger, limpiarRegistroEfectos, objetivosCampeonesValidos, registrarEfecto, statsDe } from '../efectos'
import { destruirCarta } from '../replacements'
import { registrarEfectos } from '../index'
import type { Ctx, GameState, PlayerId } from '../types'

// Cartas del paquete (paquetes.ts):
// FB-010 Aurora 9/9 Inmortal (Soberano, coste 4) · FB-011 Vaela 5/3 Carga
// (coste 2) · FB-014 Isolde 3/7 Protector (coste 3) · FB-015 Elena 5/4 Recarga
// (coste 3) · DS-001 Ragnar 9/9 Indestructible (Soberano, coste 4) · DS-011 Kael
// 5/3 Carga (coste 2) · DS-012 Draven 4/4 (coste 2) · DS-014 Thane 3/7
// Protector (coste 3) · DS-015 Marek 5/4 Recarga (coste 3)
const AURORA = 'FB-010'
const VAELA = 'FB-011'
const ISOLDE = 'FB-014'
const ELENA = 'FB-015'
const RAGNAR = 'DS-001'
const KAEL = 'DS-011'
const DRAVEN = 'DS-012'
const THANE = 'DS-014'
const MAREK = 'DS-015'
const MIRA = 'FB-012' // 4/4: "Manda esta carta al Cementerio: regresa hasta 2 Éter pagados (1A) a tu Reserva"
const FB001 = 'FB-001' // Éter de facción Orden (aporte 1 a Campeones Orden)

/** Estado mínimo de combate: fase choque, turno A. */
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
    fase: 'choque' as const,
    turno: 'A' as const,
    primerJugador: 'A' as const,
    primerTurno: false,
    players: { A: jugador('A'), B: jugador('B') },
    instances: {},
  }
}

/** Campeón de `owner` en el campo (slot 2B-2F); devuelve el estado y el id. */
function conCampeon(s: GameState, cardId: string, slot: number, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `c-${cardId}-${slot}-${owner}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          campo: {
            ...s.players[owner].campo,
            campeones: s.players[owner].campo.campeones.map((c, i) => (i === slot ? id : c)),
          },
        },
      },
    },
    id,
  }
}

/** Éter en reserva (2A) del `owner`; devuelve estado y id. */
function conEterReserva(s: GameState, cardId: string, owner: PlayerId = 'A'): { s: GameState; id: string } {
  const id = `e-${cardId}-${owner}`
  return {
    s: {
      ...s,
      instances: { ...s.instances, [id]: { cardInstanceId: id, cardId, owner } },
      players: {
        ...s.players,
        [owner]: {
          ...s.players[owner],
          eterReserva: [...s.players[owner].eterReserva, id],
        },
      },
    },
    id,
  }
}

function crearCtx(): Ctx {
  const events: Ctx['events'] = []
  return { next: () => 0, emit: (e) => { events.push(e) }, events }
}

function aplicar(s: GameState, accion: Action, ctx: Ctx): GameState {
  const r = applyAction(s, accion, ctx)
  if (!r.ok) throw new Error(`la acción ${accion.type} falló: ${r.error}`)
  return r.state
}

// Registrar handlers reales antes de cada test (los probes de cada test
// reemplazan SOLO el par (trigger, cardId) que registran, patrón efectos.test.ts).
beforeEach(() => {
  limpiarRegistroEfectos()
  registrarEfectos()
})

describe('C3a: infraestructura de targeting + dispatch de triggers', () => {
  it('al-invocar: applyAction(jugar_campeon) dispara el handler registrado con la instancia', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    const championId = 'c-vaela-mano'
    s.instances[championId] = { cardInstanceId: championId, cardId: VAELA, owner: 'A' }
    s.players.A.mano = [championId]
    // Vaela cuesta 2: dos Éteres Orden en la Reserva (ids únicos)
    s.players.A.eterReserva = ['e1', 'e2']
    s.instances['e1'] = { cardInstanceId: 'e1', cardId: FB001, owner: 'A' }
    s.instances['e2'] = { cardInstanceId: 'e2', cardId: FB001, owner: 'A' }

    const invocadas: string[] = []
    registrarEfecto('al-invocar', VAELA, (_st, _ctx, inst) => invocadas.push(inst.cardInstanceId))

    const ctx = crearCtx()
    const sFinal = aplicar(s, { type: 'jugar_campeon', cardInstanceId: championId, slot: 0, eterIds: ['e1', 'e2'] }, ctx)
    expect(invocadas).toEqual([championId])
    expect(sFinal.players.A.campo.campeones[0]).toBe(championId)
  })

  it('al-atacar: dispara con instancias = atacanteIds (y NO con no-atacantes)', () => {
    let s = estadoMinimo() // fase choque, turno A
    const { s: s1, id: vaela } = conCampeon(s, VAELA, 0, 'A')
    s = s1
    const { s: s2, id: isolde } = conCampeon(s, ISOLDE, 1, 'A')
    s = s2

    const llamados: string[] = []
    registrarEfecto('al-atacar', VAELA, (_st, _ctx, inst) => llamados.push(inst.cardInstanceId))
    registrarEfecto('al-atacar', ISOLDE, (_st, _ctx, inst) => llamados.push(inst.cardInstanceId))

    const ctx = crearCtx()
    aplicar(s, { type: 'declarar_ataque', atacanteIds: [vaela] }, ctx)
    expect(llamados).toEqual([vaela]) // solo el atacante, Isolde no se dispara
  })

  it('al-matar-en-combate: dispara por cada víctima confirmada con killerId/victimaId y tras la muerte', () => {
    let s = estadoMinimo() // choque, turno A
    const { s: s1, id: vaela } = conCampeon(s, VAELA, 0, 'A')
    s = s1
    const { s: s2, id: isolde } = conCampeon(s, ISOLDE, 0, 'B')
    s = s2

    // Vaela (5/3) ataca; Isolde (3/7) bloquea → muere Vaela (3 ≥ 3), killer = Isolde
    const disparos: Array<{ jugador: string; killerId: string; victimaId: string; muertaAlDisparar: boolean }> = []
    registrarEfecto('al-matar-en-combate', VAELA, (st, _ctx, _inst, payload) => {
      disparos.push({
        jugador: payload.jugador,
        killerId: payload.killerId!,
        victimaId: payload.victimaId!,
        muertaAlDisparar:
          st.players.A.cementerio.includes(payload.victimaId!) &&
          !st.players.A.campo.campeones.includes(payload.victimaId!),
      })
    })

    const ctx = crearCtx()
    const r1 = aplicar(s, { type: 'declarar_ataque', atacanteIds: [vaela] }, ctx)
    const r2 = aplicar(r1, { type: 'declarar_bloqueo', asignaciones: { [vaela]: isolde } }, ctx)

    expect(disparos).toHaveLength(1)
    expect(disparos[0]).toEqual({ jugador: 'B', killerId: isolde, victimaId: vaela, muertaAlDisparar: true })
    expect(r2.players.A.cementerio).toContain(vaela)
  })

  it('al-matar-en-combate: NO dispara si la muerte fue prevenida (Indestructible)', () => {
    let s = estadoMinimo() // choque, turno A
    const { s: s1, id: aurora } = conCampeon(s, AURORA, 0, 'A') // 9/9
    s = s1
    const { s: s2, id: vaela } = conCampeon(s, VAELA, 0, 'B')
    // El bloqueador B tiene Indestructible (override de instancia, patrón tests de combate)
    s = { ...s2, instances: { ...s2.instances, [vaela]: { ...s2.instances[vaela], keywords: ['Indestructible'] } } }

    const disparos: unknown[] = []
    registrarEfecto('al-matar-en-combate', VAELA, (_st, _ctx, _inst, payload) => disparos.push(payload))

    const ctx = crearCtx()
    const r1 = aplicar(s, { type: 'declarar_ataque', atacanteIds: [aurora] }, ctx)
    const r2 = aplicar(r1, { type: 'declarar_bloqueo', asignaciones: { [aurora]: vaela } }, ctx)

    expect(disparos).toHaveLength(0)
    expect(r2.players.B.campo.campeones[0]).toBe(vaela) // sigue en campo
    expect(r2.players.B.cementerio).not.toContain(vaela)
    expect(ctx.events.some((e) => e.type === 'destruccion_prevenida')).toBe(true)
  })

  it('elegir_objetivo: valida que el frente de la cola pertenezca al jugador activo', () => {
    const s = estadoMinimo()
    s.fase = 'forja'
    s.objetivosPendientes = [{ jugador: 'B', instId: 'inst-1', trigger: 'al-invocar', opciones: ['obj-A'] }]
    const ctx = crearCtx()
    const r = applyAction(s, { type: 'elegir_objetivo', objetivoId: 'obj-A' }, ctx)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('turno')
  })

  it('elegir_objetivo: valida que el objetivo pertenezca a las opciones del frente', () => {
    const s = estadoMinimo()
    s.fase = 'forja'
    s.objetivosPendientes = [{ jugador: 'A', instId: 'inst-1', trigger: 'al-invocar', opciones: ['obj-A'] }]
    const ctx = crearCtx()
    const r = applyAction(s, { type: 'elegir_objetivo', objetivoId: 'obj-inexistente' }, ctx)
    expect(r.ok).toBe(false)
    expect(r.error).toContain('opciones')
  })

  it('elegir_objetivo: sin pendiente en la cola → inválido', () => {
    const s = estadoMinimo() // sin objetivosPendientes
    const ctx = crearCtx()
    const r = applyAction(s, { type: 'elegir_objetivo', objetivoId: 'obj-A' }, ctx)
    expect(r.ok).toBe(false)
  })

  it('elegir_objetivo: resuelve el frente por re-dispatch (contextoUso objetivo-elegido) y avanza al siguiente pendiente', () => {
    const s = estadoMinimo()
    s.fase = 'forja'
    s.instances['inst-1'] = { cardInstanceId: 'inst-1', cardId: AURORA, owner: 'A' }
    s.instances['inst-2'] = { cardInstanceId: 'inst-2', cardId: VAELA, owner: 'A' }
    s.objetivosPendientes = [
      { jugador: 'A', instId: 'inst-1', trigger: 'al-invocar', opciones: ['obj-A', 'obj-B'] },
      { jugador: 'A', instId: 'inst-2', trigger: 'al-atacar', opciones: ['obj-C'] },
    ]

    const recibidos: Array<{ contextoUso?: string; instId: string; objetivoId?: string }> = []
    registrarEfecto('al-invocar', AURORA, (_st, _ctx, inst, payload) => {
      recibidos.push({ contextoUso: payload.contextoUso, instId: inst.cardInstanceId, objetivoId: payload.objetivoId })
    })
    registrarEfecto('al-atacar', VAELA, (_st, _ctx, inst, payload) => {
      recibidos.push({ contextoUso: payload.contextoUso, instId: inst.cardInstanceId, objetivoId: payload.objetivoId })
    })

    const ctx = crearCtx()
    // 1er pendiente: al-invocar (inst-1 / Aurora) → resuelve obj-A
    const r1 = aplicar(s, { type: 'elegir_objetivo', objetivoId: 'obj-A' }, ctx)
    expect(r1.objetivosPendientes).toHaveLength(1)
    expect(r1.objetivosPendientes![0]).toEqual({
      jugador: 'A',
      instId: 'inst-2',
      trigger: 'al-atacar',
      opciones: ['obj-C'],
    })
    expect(recibidos).toEqual([{ contextoUso: 'objetivo-elegido', instId: 'inst-1', objetivoId: 'obj-A' }])

    // 2do pendiente: al-atacar (inst-2 / Vaela) → resuelve obj-C y vacía la cola
    const r2 = aplicar(r1, { type: 'elegir_objetivo', objetivoId: 'obj-C' }, ctx)
    expect(r2.objetivosPendientes).toHaveLength(0)
    expect(recibidos).toHaveLength(2)
    expect(recibidos[1]).toEqual({ contextoUso: 'objetivo-elegido', instId: 'inst-2', objetivoId: 'obj-C' })
  })

  it('getValidActions: expone elegir_objetivo solo para el jugador activo con pendiente en el frente', () => {
    const s = estadoMinimo()
    s.fase = 'forja'
    s.objetivosPendientes = [{ jugador: 'A', instId: 'inst-1', trigger: 'al-invocar', opciones: ['obj-A', 'obj-B'] }]
    const accionesA = getValidActions(s, 'A')
    expect(accionesA).toContainEqual({ type: 'elegir_objetivo', objetivoId: 'obj-A' })
    expect(accionesA).toContainEqual({ type: 'elegir_objetivo', objetivoId: 'obj-B' })
    // B no es el jugador activo: no se expone
    expect(getValidActions(s, 'B').some((a) => a.type === 'elegir_objetivo')).toBe(false)
  })
})

describe('C3b: auras de campo (D6) + objetivosCampeonesValidos (D3)', () => {
  it('Isolde (FB-014): +1/+1 a OTRO campeón del mismo jugador; NO a sí misma; no al rival', () => {
    let s = estadoMinimo()
    const { s: s1, id: isolde } = conCampeon(s, ISOLDE, 0, 'A')
    s = s1
    const { s: s2, id: vaela } = conCampeon(s, VAELA, 1, 'A')
    s = s2
    const { s: s3, id: vaelaRival } = conCampeon(s, VAELA, 0, 'B')
    s = s3

    // Vaela propia: 5/3 + 1/1 del aura de Isolde
    expect(statsDe(s, vaela)).toEqual({ poder: 6, resistencia: 4 })
    // Isolde NO se buffea a sí misma ("otros campeones")
    expect(statsDe(s, isolde)).toEqual({ poder: 3, resistencia: 7 })
    // El rival no recibe el aura (solo campo propio)
    expect(statsDe(s, vaelaRival)).toEqual({ poder: 5, resistencia: 3 })
  })

  it('Thane (DS-014): +1 ATQ a OTRO campeón del mismo jugador; NO a sí mismo', () => {
    let s = estadoMinimo()
    const { s: s1, id: thane } = conCampeon(s, THANE, 0, 'A')
    s = s1
    const { s: s2, id: vaela } = conCampeon(s, VAELA, 1, 'A')
    s = s2

    expect(statsDe(s, vaela)).toEqual({ poder: 6, resistencia: 3 }) // 5/3 + 1 ATQ
    expect(statsDe(s, thane)).toEqual({ poder: 3, resistencia: 7 }) // sin self-buff
  })

  it('Elena (FB-015): +1 ATQ propio SOLO si tiene ≥1 Éter bloqueado', () => {
    let s = estadoMinimo()
    const { s: s1, id: elena } = conCampeon(s, ELENA, 0, 'A')
    s = s1

    expect(statsDe(s, elena)).toEqual({ poder: 5, resistencia: 4 }) // sin éter bloqueado

    // Con un Éter bloqueado en Elena (inst.eterBloqueado)
    s = {
      ...s,
      instances: { ...s.instances, [elena]: { ...s.instances[elena], eterBloqueado: ['e-1'] } },
    }
    expect(statsDe(s, elena)).toEqual({ poder: 6, resistencia: 4 }) // +1 ATQ
  })

  it('Marek (DS-015): +1 ATQ propio si un campeón del RIVAL tiene ≥1 Éter bloqueado', () => {
    let s = estadoMinimo()
    const { s: s1, id: marek } = conCampeon(s, MAREK, 0, 'A')
    s = s1
    const { s: s2, id: vaelaRival } = conCampeon(s, VAELA, 0, 'B')
    s = s2

    expect(statsDe(s, marek)).toEqual({ poder: 5, resistencia: 4 }) // rival sin éter bloqueado

    // Un campeón del RIVAL (B) con Éter bloqueado → Marek gana +1 ATQ
    s = {
      ...s,
      instances: { ...s.instances, [vaelaRival]: { ...s.instances[vaelaRival], eterBloqueado: ['e-1'] } },
    }
    expect(statsDe(s, marek)).toEqual({ poder: 6, resistencia: 4 })
  })

  it('objetivosCampeonesValidos (D3): sin Protector → todos; con Protector → solo Protectores', () => {
    let s = estadoMinimo()
    const { s: s1, id: vaela } = conCampeon(s, VAELA, 0, 'A')
    s = s1
    const { s: s2, id: elena } = conCampeon(s, ELENA, 1, 'A')
    s = s2

    // Sin Protector en campo: todos los campeones son objetivos válidos
    expect(objetivosCampeonesValidos(s, 'A')).toEqual([vaela, elena])

    // Con Isolde (Protector) en campo: SOLO Protectores son objetivo
    const { s: s3, id: isolde } = conCampeon(s, ISOLDE, 2, 'A')
    s = s3
    expect(objetivosCampeonesValidos(s, 'A')).toEqual([isolde])
  })
})

describe('C3c: handlers de campeones con targeting (D7)', () => {
  it('Aurora (FB-010): al invocar arma el pendiente y al elegir ROBA — la instancia se mueve a slot libre, owner intacto, agotada', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    const { s: s1, id: aurora } = conCampeon(s, AURORA, 0, 'A')
    s = s1
    const { s: s2, id: vaelaB } = conCampeon(s, VAELA, 0, 'B')
    s = s2

    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-invocar', 'A', [aurora])
    // Se arma el pendiente con la opción = vaelaB (único campeón rival)
    expect(s.objetivosPendientes).toEqual([{ jugador: 'A', instId: aurora, trigger: 'al-invocar', opciones: [vaelaB] }])

    const r = aplicar(s, { type: 'elegir_objetivo', objetivoId: vaelaB }, ctx)
    // vaelaB se movió a A (slot 1 libre; el 0 es Aurora), agotada, owner intacto
    expect(r.players.A.campo.campeones).toEqual([aurora, vaelaB, null, null, null])
    expect(r.players.B.campo.campeones[0]).toBeNull()
    expect(r.instances[vaelaB].owner).toBe('B')
    expect(r.instances[vaelaB].agotado).toBe(true)
  })

  it('Aurora: no arma pendiente si el campo del controlador no tiene slot libre', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    const { s: s1, id: aurora } = conCampeon(s, AURORA, 0, 'A')
    s = s1
    // Campo de A lleno (5 campeones)
    for (let i = 1; i < 5; i++) {
      const r = conCampeon(s, VAELA, i, 'A')
      s = r.s
    }
    const { s: s2, id: vaelaB } = conCampeon(s, VAELA, 0, 'B')
    s = s2

    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-invocar', 'A', [aurora])
    expect(s.objetivosPendientes).toBeUndefined()
    expect(ctx.events).toHaveLength(0)
  })

  it('Aurora: el robado muere → cementerio del DUEÑO (B); control permanente (Aurora muere y NO devuelve)', () => {
    let s = estadoMinimo()
    s.fase = 'forja'
    const { s: s1, id: aurora } = conCampeon(s, AURORA, 0, 'A')
    s = s1
    const { s: s2, id: vaelaB } = conCampeon(s, VAELA, 0, 'B')
    s = s2

    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-invocar', 'A', [aurora])
    let r = aplicar(s, { type: 'elegir_objetivo', objetivoId: vaelaB }, ctx)
    expect(r.players.A.campo.campeones[1]).toBe(vaelaB)

    // El robado muere (efecto) → cementerio del DUEÑO (B), NO queda en A
    destruirCarta(r, ctx, vaelaB, 'efecto')
    expect(r.players.B.cementerio).toContain(vaelaB)
    expect(r.players.A.campo.campeones).not.toContain(vaelaB)

    // Control PERMANENTE: Aurora muere y el robado no vuelve a B
    const { s: s3, id: vaelaB2 } = conCampeon(r, VAELA, 0, 'B')
    r = s3
    dispararTrigger(r, ctx, 'al-invocar', 'A', [aurora])
    r = aplicar(r, { type: 'elegir_objetivo', objetivoId: vaelaB2 }, ctx)
    destruirCarta(r, ctx, aurora, 'efecto')
    expect(r.players.B.campo.campeones).not.toContain(vaelaB2)
    expect(r.players.A.campo.campeones).toContain(vaelaB2)
  })

  it('Ragnar (DS-001): al invocar destruye el objetivo elegido con causa efecto; Inmortal previene', () => {
    // Caso 1: víctima sin Inmortal → destruida (causa 'efecto')
    let s = estadoMinimo()
    s.fase = 'forja'
    const { s: s1, id: ragnar } = conCampeon(s, RAGNAR, 0, 'A')
    s = s1
    const { s: s2, id: vaelaB } = conCampeon(s, VAELA, 0, 'B')
    s = s2

    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-invocar', 'A', [ragnar])
    expect(s.objetivosPendientes![0].opciones).toEqual([vaelaB])
    const r1 = aplicar(s, { type: 'elegir_objetivo', objetivoId: vaelaB }, ctx)
    expect(r1.players.B.campo.campeones[0]).toBeNull()
    expect(r1.players.B.cementerio).toContain(vaelaB)
    expect(ctx.events).toContainEqual({ type: 'destruccion', cardInstanceId: vaelaB, jugador: 'B', causa: 'efecto' })

    // Caso 2: víctima Inmortal → destruccion_prevenida, sigue en campo
    let s2b = estadoMinimo()
    s2b.fase = 'forja'
    const { s: s3, id: ragnar2 } = conCampeon(s2b, RAGNAR, 0, 'A')
    s2b = s3
    const { s: s4, id: auroraB } = conCampeon(s2b, AURORA, 0, 'B') // Inmortal
    s2b = s4

    const ctx2 = crearCtx()
    dispararTrigger(s2b, ctx2, 'al-invocar', 'A', [ragnar2])
    const r2 = aplicar(s2b, { type: 'elegir_objetivo', objetivoId: auroraB }, ctx2)
    expect(r2.players.B.campo.campeones[0]).toBe(auroraB)
    expect(r2.players.B.cementerio).not.toContain(auroraB)
    expect(ctx2.events).toContainEqual({ type: 'destruccion_prevenida', cardInstanceId: auroraB, jugador: 'B', causa: 'efecto' })
  })

  it('Vaela (FB-011): al atacar arma el pendiente y al elegir AGOTA el objetivo rival', () => {
    let s = estadoMinimo() // choque, turno A
    const { s: s1, id: vaela } = conCampeon(s, VAELA, 0, 'A')
    s = s1
    const { s: s2, id: vaelaB } = conCampeon(s, VAELA, 0, 'B')
    s = s2

    const ctx = crearCtx()
    const r1 = aplicar(s, { type: 'declarar_ataque', atacanteIds: [vaela] }, ctx)
    // al-atacar disparó y armó el pendiente con la opción rival
    expect(r1.objetivosPendientes![0]).toEqual({
      jugador: 'A',
      instId: vaela,
      trigger: 'al-atacar',
      opciones: [vaelaB],
    })

    const r2 = aplicar(r1, { type: 'elegir_objetivo', objetivoId: vaelaB }, ctx)
    expect(r2.instances[vaelaB].agotado).toBe(true)
  })

  it('Kael (DS-011): al atacar el objetivo elegido pierde -1 ATQ con expira "ocaso"', () => {
    let s = estadoMinimo() // choque, turno A
    const { s: s1, id: kael } = conCampeon(s, KAEL, 0, 'A')
    s = s1
    const { s: s2, id: vaelaB } = conCampeon(s, VAELA, 0, 'B')
    s = s2

    const ctx = crearCtx()
    const r1 = aplicar(s, { type: 'declarar_ataque', atacanteIds: [kael] }, ctx)
    expect(r1.objetivosPendientes![0]).toEqual({
      jugador: 'A',
      instId: kael,
      trigger: 'al-atacar',
      opciones: [vaelaB],
    })

    const r2 = aplicar(r1, { type: 'elegir_objetivo', objetivoId: vaelaB }, ctx)
    expect(statsDe(r2, vaelaB)).toEqual({ poder: 4, resistencia: 3 }) // 5/3 - 1 ATQ
    expect(r2.instances[vaelaB].modificadores).toContainEqual({ stat: 'poder', valor: -1, expira: 'ocaso' })
  })

  it('Draven (DS-012): al matar en combate, el CONTROLADOR de la víctima pierde 1 Éter de 1A → Reserva', () => {
    let s = estadoMinimo() // choque, turno A
    const { s: s1, id: draven } = conCampeon(s, DRAVEN, 0, 'A') // 4/4
    s = s1
    const { s: s2, id: vaelaB } = conCampeon(s, VAELA, 0, 'B') // 5/3
    s = { ...s2, players: { ...s2.players, B: { ...s2.players.B, eterPagado: ['eB1'] } } }
    s.instances['eB1'] = { cardInstanceId: 'eB1', cardId: FB001, owner: 'B' }

    // Draven ataca, Vaela bloquea → mueren AMBOS (4≥3 y 5≥4). El killer (Draven)
    // muere en la misma resolución: payload.jugador = controlador snapshot (A).
    const ctx = crearCtx()
    const r1 = aplicar(s, { type: 'declarar_ataque', atacanteIds: [draven] }, ctx)
    const r2 = aplicar(r1, { type: 'declarar_bloqueo', asignaciones: { [draven]: vaelaB } }, ctx)

    // B (controlador de la víctima) perdió el primer Éter de 1A → 2A
    expect(r2.players.B.eterPagado).toEqual([])
    expect(r2.players.B.eterReserva).toContain('eB1')
    expect(ctx.events.some((e) => e.type === 'eter_reagrupado')).toBe(true)
  })

  it('Protector (regla general D3): con Protector rival, Aurora y Vaela solo pueden apuntar al Protector', () => {
    // al-invocar (Aurora): opciones filtradas
    let s = estadoMinimo()
    s.fase = 'forja'
    const { s: s1, id: aurora } = conCampeon(s, AURORA, 0, 'A')
    s = s1
    const { s: s2, id: vaelaB } = conCampeon(s, VAELA, 0, 'B')
    s = s2
    const { s: s3, id: isoldeB } = conCampeon(s, ISOLDE, 1, 'B') // Protector
    s = s3

    const ctx = crearCtx()
    dispararTrigger(s, ctx, 'al-invocar', 'A', [aurora])
    expect(s.objetivosPendientes![0].opciones).toEqual([isoldeB])

    // al-atacar (Vaela): opciones filtradas igual
    const { s: s4, id: vaelaA } = conCampeon(s, VAELA, 1, 'A')
    s = { ...s4, fase: 'choque' as const }
    const ctx2 = crearCtx()
    const r1 = aplicar(s, { type: 'declarar_ataque', atacanteIds: [vaelaA] }, ctx2)
    expect(r1.objetivosPendientes![0].opciones).toEqual([isoldeB])
  })
})

// TODO: Reescribir tests de Transmutar cuando se rediseñe Cristal Huérfano (FB-012)
// describe('C3d: Transmutar (Mira FB-012)', () => { ... })
