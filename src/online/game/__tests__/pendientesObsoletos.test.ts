// @vitest-environment node
/**
 * F5h — revalidación de objetivos y limpieza de pendientes obsoletos (pendientes.ts).
 *
 * Origen: seed 66099 del set PR (iteración 284): la cola `objetivosPendientes` acumulaba pendientes de
 * turnos/jugadores que nadie elegía y un `elegir_objetivo` sobre una carta que ya no era candidata (c16, ya en
 * el Exilio) la dejó en Cementerio y Exilio A LA VEZ (violación de "una instancia, una zona").
 * Reglas aprobadas: un objetivo es VIGENTE si existe y sigue siendo candidata del efecto (oferta, validador,
 * ejecución y resolución usan la misma regla); un pendiente es OBSOLETO si no le queda ninguna opción vigente
 * o si su turno terminó (salvo los de umbral de Éter bloqueado). Usa el set de prueba PR-xxx.
 */
import { describe, it, expect, beforeAll } from 'vitest'
import { applyAction } from '../actions'
import { actorActual, getValidActions } from '../validActions'
import { validarElegirObjetivo, ejecutarElegirObjetivo } from '../habilidades'
import { opcionesVigentes, descartarFrentesMuertos, descartarPendientesObsoletos } from '../pendientes'
import { statsDe } from '../efectos'
import { etersParaPagar } from '../payments'
import { botTonto } from '../bot'
import { createInitialState } from '../initialState'
import { verificarZonaUnica, verificarInvariantes } from '../invariants'
import { ESTASIS_CARDS, DISONANCIA_CARDS } from '../../../shared/data/paquetes'
import { expandirMazo } from './helpers'
import type { Ctx, GameState } from '../types'
import {
  PR, cargarCartasPrueba, mazoPrueba, crearCtx, escenaVacia, aplicar, conMano, conEteres, conMazo, conCampeon,
  conMistica, enCementerio,
} from './helpers/cartasPrueba'

beforeAll(() => {
  cargarCartasPrueba()
})

const evs = (ctx: Ctx, tipo: string) => ctx.events.filter((e) => e.type === tipo)
const cerrar = (s: GameState, ctx: Ctx) => aplicar(aplicar(s, { type: 'pasar_prioridad' }, ctx), { type: 'pasar_prioridad' }, ctx)
const pagoDe = (s: GameState, j: 'A' | 'B', cardId: string) => etersParaPagar(s, j, cardId)!
const elegir = (objetivoId: string) => ({ type: 'elegir_objetivo', objetivoId }) as const
const ofrecidas = (s: GameState, j: 'A' | 'B') =>
  getValidActions(s, j).flatMap((a) => (a.type === 'elegir_objetivo' ? [a.objetivoId] : []))

function base(fase: GameState['fase'] = 'forja'): GameState {
  const s = escenaVacia(fase)
  conMazo(s, 'A')
  conMazo(s, 'B')
  return s
}

/** Saca un Campeón del campo y lo manda a otra zona del dueño (simula un efecto ajeno entre la elección y la resolución). */
function mover(s: GameState, owner: 'A' | 'B', id: string, destino: 'exilio' | 'cementerio' | 'mano'): void {
  const p = s.players[owner]
  const i = p.campo.campeones.indexOf(id)
  if (i !== -1) p.campo.campeones[i] = null
  p[destino].push(id)
}

/** Oferta == validador, opción por opción, para el frente de la cola (el patrón de paridad de velocidad.test.ts). */
function paridadElegir(s: GameState, jugador: 'A' | 'B'): void {
  const ofertas = ofrecidas(s, jugador) // puede descartar un frente muerto: se lee el frente DESPUÉS
  const frente = s.objetivosPendientes?.[0]
  if (!frente) return
  for (const id of frente.opciones) {
    const valida = validarElegirObjetivo(s, elegir(id)) === null
    expect(ofertas.includes(id), `elegir ${id}: oferta ${ofertas.includes(id)} vs validador ${valida}`).toBe(valida)
  }
}

/** A tiene un Vigía del Choque; al pasar a Choque arma el pendiente de elegir un Campeón rival (b0 o b1). */
function conPendienteDeChoque(): { s: GameState; ctx: Ctx } {
  const s0 = base()
  conCampeon(s0, 'A', 'vig', PR.VIGIA_CHOQUE, 0)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conCampeon(s0, 'B', 'b1', PR.PEON, 1)
  const ctx = crearCtx()
  const s = aplicar(s0, { type: 'pasar_turno' }, ctx)
  return { s, ctx }
}

/** A juega Rayo (destruye un Campeón RES ≤ 3 rival) sobre b0; B tiene una Presteza en mano, así que la ventana queda abierta. */
function rayoConVentana(): { s: GameState; ctx: Ctx } {
  const s0 = base()
  conMano(s0, 'A', 'rayo', PR.RAYO)
  const pago = conEteres(s0, 'A', 2)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conCampeon(s0, 'B', 'b1', PR.PEON, 1)
  conMano(s0, 'B', 'resp', PR.PRESTEZA_DEBIL)
  conEteres(s0, 'B', 1)
  const ctx = crearCtx()
  let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
  s = aplicar(s, elegir('b0'), ctx)
  expect(s.cadena?.opener).toMatchObject({ cardInstanceId: 'rayo', objetivos: { 0: 'b0' } })
  return { s, ctx }
}

/** A invoca a Heraldo Hostil (al invocar: un Campeón rival pierde 2 ATQ) y queda eligiendo el objetivo; B puede responder. */
function heraldoEligiendo(): { s: GameState; ctx: Ctx } {
  const s0 = base()
  conMano(s0, 'A', 'her', PR.HERALDO_HOSTIL)
  conEteres(s0, 'A', 3)
  conCampeon(s0, 'B', 'b0', PR.PEON, 0)
  conCampeon(s0, 'B', 'b1', PR.PEON, 1)
  conMano(s0, 'B', 'resp', PR.PRESTEZA_DEBIL)
  conEteres(s0, 'B', 1)
  const ctx = crearCtx()
  const s = aplicar(s0, { type: 'jugar_campeon', cardInstanceId: 'her', slot: 0, eterIds: pagoDe(s0, 'A', PR.HERALDO_HOSTIL), sacrificios: [] }, ctx)
  expect(s.declaracionEnEleccion).toBeDefined()
  expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'her', trigger: 'al-invocar', opciones: ['b0', 'b1'] })
  return { s, ctx }
}

describe('objetivo vigente: existe y sigue siendo candidata del efecto', () => {
  it('opcionesVigentes: sale del campo (exilio, mano, cementerio) o desaparece => deja de ser vigente; las demás se conservan en orden', () => {
    const { s } = conPendienteDeChoque()
    const pendiente = s.objetivosPendientes![0]
    expect(opcionesVigentes(s, pendiente)).toEqual(['b0', 'b1'])
    for (const destino of ['exilio', 'mano', 'cementerio'] as const) {
      const t = structuredClone(s)
      mover(t, 'B', 'b0', destino)
      expect(opcionesVigentes(t, pendiente), destino).toEqual(['b1'])
    }
    const t = structuredClone(s)
    delete t.instances['b1']
    expect(opcionesVigentes(t, pendiente)).toEqual(['b0'])
  })

  it('un efecto no identificable (trigger de handler registrado, estados de prueba) solo exige que la instancia exista', () => {
    const s = base()
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    const sinFuente = { jugador: 'A' as const, instId: 'nadie', trigger: 'al-invocar', opciones: ['b0', 'fantasma'] }
    expect(opcionesVigentes(s, sinFuente)).toEqual(['b0'])
  })

  it('elegir_objetivo sobre una carta que ya no es candidata se rechaza; la oferta no la incluye', () => {
    const { s, ctx } = conPendienteDeChoque()
    mover(s, 'B', 'b0', 'exilio') // el caso de la seed 66099: el objetivo ya está en el Exilio
    expect(ofrecidas(s, 'A')).toEqual(['b1'])
    expect(validarElegirObjetivo(s, elegir('b0'))).toBe('el objetivo ya no es válido')
    const r = applyAction(s, elegir('b0'), ctx)
    expect(r.ok).toBe(false)
    // un id fuera de las opciones sigue dando el error de siempre
    expect(validarElegirObjetivo(s, elegir('zzz'))).toContain('opciones')
    // el candidato vivo se elige con normalidad
    const t = aplicar(s, elegir('b1'), ctx)
    expect(statsDe(t, 'b1').poder).toBe(1)
    expect(statsDe(t, 'b0').poder).toBe(2)
    expect(t.players.B.exilio).toEqual(['b0'])
    expect(verificarZonaUnica(t)).toEqual([])
  })

  it('paridad oferta == validador en pendientes con opciones muertas, parciales y vivas', () => {
    for (const destinos of [[], ['b0'], ['b1'], ['b0', 'b1']]) {
      const { s } = conPendienteDeChoque()
      for (const id of destinos) mover(s, 'B', id, 'exilio')
      paridadElegir(s, 'A')
    }
    // declaración en elección: sin opciones vigentes se ofrece (y valida) SOLO la primera, para no atascar
    for (const destinos of [[], ['b0'], ['b0', 'b1']]) {
      const { s } = heraldoEligiendo()
      for (const id of destinos) mover(s, 'B', id, 'exilio')
      paridadElegir(s, 'A')
    }
  })
})

describe('fizzle: el objetivo deja de ser válido entre la elección y la ejecución', () => {
  it.each(['exilio', 'mano', 'cementerio'] as const)('opener (Rayo) con el objetivo en %s al resolver: sin efecto, sin errores y sin doble zona', (destino) => {
    const { s: s1, ctx } = rayoConVentana()
    const s0 = structuredClone(s1)
    mover(s0, 'B', 'b0', destino)
    const antes = { ...s0.players.B, campo: undefined }
    const s = cerrar(s0, ctx)
    expect(s.cadena).toBeUndefined()
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(evs(ctx, 'carta_muerta')).toHaveLength(0) // Rayo no destruyó a nadie
    expect(s.players.B[destino].filter((id) => id === 'b0')).toHaveLength(1)
    expect(s.players.B.cementerio.filter((id) => id === 'b0')).toHaveLength(destino === 'cementerio' ? 1 : 0)
    expect(s.players.B.campo.campeones).toContain('b1') // el otro Campeón no se tocó (nada de efectos parciales)
    expect(s.players.A.cementerio).toContain('rayo') // la Mística se consume igual
    expect({ ...s.players.B, campo: undefined }).toEqual(antes)
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('control: si el objetivo sigue siendo candidato, Rayo lo destruye', () => {
    const { s: s1, ctx } = rayoConVentana()
    const s = cerrar(s1, ctx)
    expect(s.players.B.cementerio).toEqual(['b0'])
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('ejecutarElegirObjetivo revalida por sí mismo: un objetivo ya no candidato consume el pendiente sin disparar nada', () => {
    const { s: s0 } = conPendienteDeChoque()
    const s = structuredClone(s0)
    mover(s, 'B', 'b0', 'exilio')
    const ctx = crearCtx()
    ejecutarElegirObjetivo(s, ctx, elegir('b0')) // salta el validador a propósito
    expect(s.objetivosPendientes).toHaveLength(0)
    expect(statsDe(s, 'b0').poder).toBe(2) // sin debuff
    expect(ctx.events).toHaveLength(0)
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('declaración sin opciones vigentes: se ofrece la primera, se resuelve como fizzle y la ventana abre (no atasca)', () => {
    const { s: s0, ctx } = heraldoEligiendo()
    mover(s0, 'B', 'b0', 'exilio')
    mover(s0, 'B', 'b1', 'exilio')
    expect(opcionesVigentes(s0, s0.objetivosPendientes![0])).toEqual([])
    expect(ofrecidas(s0, 'A')).toEqual(['b0'])
    expect(validarElegirObjetivo(s0, elegir('b1'))).toBe('el objetivo ya no es válido')
    expect(botTonto(s0, 'A')).toEqual(elegir('b0'))
    const s = aplicar(s0, elegir('b0'), ctx)
    expect(s.declaracionEnEleccion).toBeUndefined()
    expect(s.objetivosPendientes).toHaveLength(0)
    expect(s.cadena).toBeDefined() // la ventana de la invocación abre con normalidad
    expect(s.players.B.exilio).toEqual(['b0', 'b1'])
    expect(s.instances['b0'].modificadores ?? []).toHaveLength(0)
    expect(verificarZonaUnica(s)).toEqual([])
  })

  it('declaración con una opción viva: solo esa se ofrece y valida', () => {
    const { s, ctx } = heraldoEligiendo()
    mover(s, 'B', 'b0', 'mano')
    expect(ofrecidas(s, 'A')).toEqual(['b1'])
    expect(applyAction(s, elegir('b0'), ctx).ok).toBe(false)
    let t = aplicar(s, elegir('b1'), ctx)
    // F5d-4: al-invocar se APILA — el debuff cae al resolver la cadena, no al elegir
    expect(statsDe(t, 'b1').poder).toBe(2)
    t = aplicar(t, { type: 'pasar_prioridad' }, ctx)
    t = aplicar(t, { type: 'pasar_prioridad' }, ctx)
    expect(statsDe(t, 'b1').poder).toBe(0)
  })

  it('rendirse durante una elección sin opciones vigentes termina la partida sin tocar zonas', () => {
    const { s: s0, ctx } = heraldoEligiendo()
    mover(s0, 'B', 'b0', 'exilio')
    mover(s0, 'B', 'b1', 'exilio')
    const s = aplicar(s0, { type: 'rendirse', jugador: 'A' }, ctx)
    expect(s).toMatchObject({ fase: 'terminada', ganador: 'B', motivo: 'rendicion' })
    expect(verificarZonaUnica(s)).toEqual([])
    const rinde = aplicar(heraldoEligiendo().s, { type: 'rendirse', jugador: 'B' }, crearCtx())
    expect(rinde).toMatchObject({ fase: 'terminada', ganador: 'A' })
  })
})

describe('pendientes obsoletos: se descartan sin tocar los legítimos', () => {
  it('un frente muerto no atasca a los que van detrás: se descarta al ofrecer y tras cada acción', () => {
    const { s } = conPendienteDeChoque()
    mover(s, 'B', 'b0', 'exilio')
    s.objetivosPendientes = [
      { jugador: 'A', instId: 'vig', trigger: 'al-inicio-choque', opciones: ['b0', 'fantasma'] }, // muerto
      ...s.objetivosPendientes!, // vivo (b1)
    ]
    expect(ofrecidas(s, 'A')).toEqual(['b1'])
    expect(s.objetivosPendientes).toHaveLength(1)
    // tras cualquier acción el motor también limpia el frente (el servidor no llama a getValidActions)
    const t = structuredClone(s)
    t.objetivosPendientes = [{ jugador: 'A', instId: 'vig', trigger: 'al-inicio-choque', opciones: ['fantasma'] }, ...t.objetivosPendientes!]
    const u = aplicar(t, { type: 'pasar_turno' }, crearCtx())
    expect(u.objetivosPendientes).toHaveLength(1) // el fantasma se fue; el vivo (b1 vigente) quedó al frente
    expect(opcionesVigentes(u, u.objetivosPendientes![0])).toEqual(['b1'])
  })

  it('descartarFrentesMuertos no toca una declaración en elección (ella cuenta sus pendientes)', () => {
    const { s } = heraldoEligiendo()
    mover(s, 'B', 'b0', 'exilio')
    mover(s, 'B', 'b1', 'exilio')
    expect(descartarFrentesMuertos(s)).toBe(0)
    expect(s.objetivosPendientes).toHaveLength(1)
    expect(s.declaracionEnEleccion?.pendientes).toBe(1)
  })

  it('al terminar el turno se descartan los pendientes que nadie eligió (propios y ajenos); el siguiente turno parte limpio', () => {
    const { s: s1, ctx } = conPendienteDeChoque()
    // A no elige y pasa el turno (Ocaso); además B tenía un pendiente que el jugador del turno nunca pudo elegir
    s1.objetivosPendientes!.push({ jugador: 'B', instId: 'b0', trigger: 'al-ser-enviado-al-cementerio', opciones: ['vig'] })
    expect(s1.objetivosPendientes).toHaveLength(2)
    let s = aplicar(s1, { type: 'pasar_turno' }, ctx) // Choque -> Ocaso
    expect(s.objetivosPendientes).toHaveLength(2) // dentro del turno siguen vivos
    s = aplicar(s, { type: 'pasar_turno' }, ctx) // Ocaso -> turno de B
    expect(s.turno).toBe('B')
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
    expect(ofrecidas(s, 'B')).toEqual([])
  })

  it('el pendiente de la Alba del turno nuevo SÍ se conserva (nace después de la limpieza)', () => {
    const s0 = base('ocaso')
    conCampeon(s0, 'B', 'vigB', PR.VIGIA_ALBA, 0)
    conCampeon(s0, 'A', 'a0', PR.PEON, 0)
    const ctx = crearCtx()
    const s = aplicar(s0, { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe('B')
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', instId: 'vigB', trigger: 'al-inicio-alba' })
  })

  it('NO se descartan los pendientes de umbral de Éter bloqueado (steal_champion / tramos) mientras sigan vigentes', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'lad', PR.LADRONA, 0)
    conCampeon(s0, 'A', 'vig', PR.VIGIA_CHOQUE, 1)
    const eteres = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'bloquear_eter', eterIds: eteres, targetInstanceId: 'lad' }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'A', instId: 'lad' })
    s = aplicar(s, { type: 'pasar_turno' }, ctx) // Choque: el Vigía arma su pendiente (obsoleto al terminar el turno)
    expect(s.objetivosPendientes?.map((p) => p.instId)).toEqual(['lad', 'vig'])
    s = aplicar(aplicar(s, { type: 'pasar_turno' }, ctx), { type: 'pasar_turno' }, ctx)
    expect(s.turno).toBe('B')
    expect(s.objetivosPendientes?.map((p) => p.instId)).toEqual(['lad']) // el de umbral sobrevive; el del Choque no
    // y un umbral sin opciones vigentes sí se limpia
    const t = structuredClone(s)
    mover(t, 'B', 'b0', 'exilio')
    mover(t, 'B', 'b1', 'exilio')
    expect(descartarPendientesObsoletos(t)).toBe(1)
    expect(t.objetivosPendientes).toHaveLength(0)
  })

  it('tramo escalonado (Cassandra): sobrevive al fin de turno y sus opciones se revalidan con los filtros del tramo', () => {
    const s0 = base()
    conCampeon(s0, 'A', 'esc', PR.ESCALONADO, 0)
    const eteres = conEteres(s0, 'A', 4)
    conCampeon(s0, 'B', 'b0', PR.PEON, 0)
    conCampeon(s0, 'B', 'b1', PR.PEON, 1)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'bloquear_eter', eterIds: eteres.slice(0, 2), targetInstanceId: 'esc' }, ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ tramoUmbral: 2 })
    s = aplicar(s, elegir('b1'), ctx) // el tramo de 2 Éteres cambia el agotamiento de b1
    s = aplicar(s, { type: 'bloquear_eter', eterIds: eteres.slice(2), targetInstanceId: 'esc' }, ctx)
    const tramo4 = s.objetivosPendientes![0]
    expect(tramo4).toMatchObject({ tramoUmbral: 4, opciones: ['b1'] })
    // b1 deja de estar agotado: ya no cumple el filtro del tramo (agotado:true) aunque siga en el campo
    const t = structuredClone(s)
    t.instances['b1'].agotado = false
    expect(opcionesVigentes(t, tramo4)).toEqual([])
    expect(opcionesVigentes(s, tramo4)).toEqual(['b1'])
    // el tramo vigente sobrevive a la limpieza de fin de turno; el que dejó de ser vigente (t) se va
    const u = structuredClone(s)
    expect(descartarPendientesObsoletos(u)).toBe(0)
    expect(u.objetivosPendientes?.[0]).toMatchObject({ tramoUmbral: 4 })
    expect(descartarPendientesObsoletos(t)).toBe(1)
  })

  it('no toca equiparPendiente, preventivosPendientes ni opcionesPendientes', () => {
    const s = base('ocaso')
    s.equiparPendiente = { artefactoId: 'x', jugador: 'A', contexto: 'jugar_mistica' }
    s.preventivosPendientes = [{ jugador: 'A', fuenteId: 'f', victimId: 'v', causa: 'destroy' } as never]
    s.opcionesPendientes = [{ jugador: 'A', eterId: 'e' }]
    s.objetivosPendientes = [{ jugador: 'A', instId: 'x', trigger: 'al-invocar', opciones: ['y'] }]
    expect(descartarPendientesObsoletos(s)).toBe(1)
    expect(s.equiparPendiente).toBeDefined()
    expect(s.preventivosPendientes).toHaveLength(1)
    expect(s.opcionesPendientes).toHaveLength(1)
  })

  it('H4 (pendiente del jugador NO activo): ya no se pierde al Ocaso — su dueño lo elige de inmediato y el turno no avanza sin él', () => {
    const s0 = base()
    conMano(s0, 'A', 'rayo', PR.RAYO)
    const pago = conEteres(s0, 'A', 2)
    conCampeon(s0, 'B', 'uv', PR.ULTIMA_VOLUNTAD, 0)
    enCementerio(s0, 'B', 'vieja', PR.PEON)
    const ctx = crearCtx()
    let s = aplicar(s0, { type: 'jugar_mistica', cardInstanceId: 'rayo', slot: 0, eterIds: pago }, ctx)
    s = aplicar(s, elegir('uv'), ctx)
    expect(s.objetivosPendientes?.[0]).toMatchObject({ jugador: 'B', trigger: 'al-ser-enviado-al-cementerio' })
    expect(applyAction(s, { type: 'pasar_turno' }, ctx).ok).toBe(false) // A no puede pasar: B debe elegir primero
    s = aplicar(s, elegir('vieja'), ctx)
    expect(s.players.B.mano).toContain('vieja')
    expect(s.objetivosPendientes ?? []).toHaveLength(0)
  })
})

describe('regresión seed 66099 (set PR) y simulaciones: una instancia, una zona en cada paso', () => {
  /** Tres estilos de jugador sobre la misma partida: respondón, "jugar_respuesta primero" y el bot tonto. */
  const estilos = {
    respondon: (acciones: ReturnType<typeof getValidActions>) =>
      acciones.find((a) => a.type === 'responder_cadena') ?? acciones.find((a) => a.type === 'jugar_respuesta') ?? null,
    jugarPrimero: (acciones: ReturnType<typeof getValidActions>) =>
      acciones.find((a) => a.type === 'jugar_respuesta') ?? acciones.find((a) => a.type === 'responder_cadena') ?? null,
    tonto: () => null,
  }

  function simular(mazoA: string[], mazoB: string[], seed: number, estilo: keyof typeof estilos): { iteraciones: number; fase: string } {
    const { state, ctx } = createInitialState(mazoA, mazoB, seed)
    let estado = state
    let i = 0
    for (; i < 1500 && estado.fase !== 'terminada'; i++) {
      const actor = actorActual(estado) ?? estado.turno
      const accion = estilos[estilo](getValidActions(estado, actor)) ?? botTonto(estado, actor)
      expect(accion, `sin acción para ${actor} (iter ${i})`).not.toBeNull()
      const r = applyAction(estado, accion!, ctx)
      expect(r.ok, `${accion!.type} rechazada: ${r.ok ? '' : r.error}`).toBe(true)
      if (!r.ok) break
      estado = r.state
      expect(verificarZonaUnica(estado), `iter ${i} tras ${JSON.stringify(accion)}`).toEqual([])
    }
    return { iteraciones: i, fase: estado.fase }
  }

  it.each(['respondon', 'jugarPrimero', 'tonto'] as const)('seed 66099 con el set PR (%s): ya no hay instancias en dos zonas (antes: c16 en Cementerio y Exilio, iter 284)', (estilo) => {
    const { iteraciones, fase } = simular(mazoPrueba(), mazoPrueba(), 66099, estilo)
    expect(iteraciones).toBeGreaterThan(300) // la partida pasa de la iteración que antes rompía el invariante
    expect(fase).toBe('terminada')
  })

  it.each([66676, 1, 2, 3, 7, 42, 12345])('seed %i con el set PR (bot respondón): sin doble zona', (seed) => {
    simular(mazoPrueba(), mazoPrueba(), seed, 'respondon')
  })

  it.each([66099, 66676, 1, 2, 3])('seed %i con mazos reales (Estasis vs Disonancia, bot respondón): sin doble zona e invariantes completas al final', (seed) => {
    const mazos = [expandirMazo(ESTASIS_CARDS), expandirMazo(DISONANCIA_CARDS)] as const
    const { state, ctx } = createInitialState(mazos[0], mazos[1], seed)
    let estado = state
    for (let i = 0; i < 1500 && estado.fase !== 'terminada'; i++) {
      const actor = actorActual(estado) ?? estado.turno
      const accion = estilos.respondon(getValidActions(estado, actor)) ?? botTonto(estado, actor)
      expect(accion).not.toBeNull()
      const r = applyAction(estado, accion!, ctx)
      expect(r.ok).toBe(true)
      if (!r.ok) return
      estado = r.state
      expect(verificarZonaUnica(estado), `iter ${i}`).toEqual([])
    }
    expect(verificarInvariantes(estado)).toEqual([])
  })
})

describe('verificarZonaUnica: el helper detecta las violaciones', () => {
  it('una instancia en Cementerio y Exilio a la vez (el síntoma de la seed 66099) se reporta; un estado sano no', () => {
    const s = base()
    conCampeon(s, 'B', 'b0', PR.PEON, 0)
    expect(verificarZonaUnica(s)).toEqual([])
    s.players.B.cementerio.push('b0')
    s.players.B.exilio.push('b0')
    const v = verificarZonaUnica(s)
    expect(v).toHaveLength(1)
    expect(v[0]).toContain('b0')
    expect(v[0]).toContain('B.cementerio')
    expect(v[0]).toContain('B.exilio')
    expect(v[0]).toContain('B.campo.campeones[0]')
  })

  it('cuenta el Éter bloqueado sobre una carta como su zona', () => {
    const s = base()
    const [e] = conEteres(s, 'A', 1)
    conMistica(s, 'A', 'm', PR.RAYO, 0)
    s.instances['m'].eterBloqueado = [e]
    expect(verificarZonaUnica(s)).toHaveLength(1) // sigue también en la Reserva: duplicada
    s.players.A.eterReserva = []
    expect(verificarZonaUnica(s)).toEqual([])
  })
})
