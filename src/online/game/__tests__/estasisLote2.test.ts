// @vitest-environment node
/**
 * Lote 2 del motor de Estásis — Aurora (FB-010, carta REAL) y las reglas que su diseño necesita:
 *  - `efectoComandante` (objeto o arreglo) lo lee reglas.ts: el +2/+2 sigue funcionando y la regla enumerada también.
 *  - `disparo_sin_agotar`: concesión del Comandante, solo a Campeones de SU facción, una vez por turno por Campeón.
 *  - `coste_campeones_rival_mas` + duración `mientras_tenga_eter_bloqueado`: el tributo (coste de invocar +1 al rival).
 *  - Reagrupar con alcance `todo`: libera también el Éter externo; el alcance por defecto (`efecto`) NO cambia.
 *  - Keywords con duración de turno otorgadas en el Ocaso: se purgan al pasar al Alba.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { applyAction } from '../actions'
import { registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import { costeDeCampeon } from '../payments'
import { disparoNoAgotaPorComandante, limpiarMemoReglas, MARCA_DISPARO_SIN_AGOTAR } from '../reglas'
import { keywordsDe, otorgarKeyword, statsDe } from '../efectos'
import { getValidActions } from '../validActions'
import { etiquetarEterExterno } from '../eter'
import type { GameState } from '../types'
import { aplicar, cargarCartasPrueba, conCampeon, conEteres, conMano, conMazo, crearCtx, escenaVacia, PR } from './helpers/cartasPrueba'
import { AURORA_CLASICA, registrarAuroraClasica } from './helpers/auroraClasica'

const ORDEN_DISPARA = 'TEST-ORDEN-DISPARA'
const CAOS_DISPARA = 'TEST-CAOS-DISPARA'
const ORDEN_TIRADOR = 'TEST-ORDEN-TIRADOR'
const AURORA = 'FB-010'

const campeonDisparo = (id: string, faccion: string, keywords: string[] = []) => ({
  id,
  name: id,
  type: 'Campeón',
  rarity: 'Común',
  keywords,
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
  limiteCopias: '1',
  facciones: [faccion],
  esencia: 'Céleste',
  roles: ['Normal'],
  stats: { cost: 2, poder: 2, resistencia: 2 },
  efectos: [{ tipo: 'disparo', efecto: 'buff', stats: { ATQ: 1, RES: 0 }, objetivo: { tipo: 'self', zona: 'campo' }, costo: { tipo: 'eter', cantidad: 1 }, texto: 'Puedes pagar 1 Éter: gana +1 ATQ.' }],
}) as unknown as AnyCard

beforeAll(() => {
  cargarCartasPrueba()
  registrarAuroraClasica()
  registrarCartas([campeonDisparo(ORDEN_DISPARA, 'Orden'), campeonDisparo(CAOS_DISPARA, 'Caos'), campeonDisparo(ORDEN_TIRADOR, 'Orden', ['Tirador'])])
  limpiarMemoReglas()
})

/** A: Aurora (slot 0), un Campeón con Disparo de cada facción y Éteres; B: mazo para robar. */
function escena(): GameState {
  const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6)
  conCampeon(s, 'A', 'aurora', AURORA, 0)
  conCampeon(s, 'A', 'orden', ORDEN_DISPARA, 1)
  conCampeon(s, 'A', 'caos', CAOS_DISPARA, 2)
  conCampeon(s, 'A', 'tirador', ORDEN_TIRADOR, 3)
  conEteres(s, 'A', 8)
  return s
}
const dispara = (s: GameState, id: string): GameState => {
  const eter = s.players.A.eterReserva[0]
  return aplicar(s, { type: 'activar_habilidad', cardInstanceId: id, eterIds: [eter] }, crearCtx())
}
const enderezar = (s: GameState, id: string): void => { s.instances[id].agotado = false }

describe('efectoComandante en reglas.ts', () => {
  it('el incremento de +2/+2 de Aurora (primer efecto del arreglo) sigue funcionando', () => {
    const s = escena()
    expect(statsDe(s, 'aurora')).toMatchObject({ poder: 11, resistencia: 11 })
    expect(statsDe(s, 'orden')).toMatchObject({ poder: 4, resistencia: 4 })
  })
  it('el efecto de Comandante en forma de OBJETO (formato histórico) también modifica reglas, sin romperse', () => {
    // Ragnar (DS-010) lleva un solo efectoComandante (objeto): leerlo no debe lanzar ni cambiar reglas ajenas
    const s = escenaVacia('forja'); conCampeon(s, 'A', 'ragnar', 'DS-010', 0)
    expect(disparoNoAgotaPorComandante(s, 'ragnar')).toBe(false)
  })
})

describe('disparo_sin_agotar (Comandante, una vez por turno por Campeón)', () => {
  it('un Campeón de la facción del Comandante: su primer Disparo NO lo agota y gasta la concesión', () => {
    const s = dispara(escena(), 'orden')
    expect(s.instances.orden.agotado).toBeUndefined()
    expect(s.instances.orden.efectosUsadosEsteTurno).toContain(MARCA_DISPARO_SIN_AGOTAR)
    expect(statsDe(s, 'orden').poder).toBe(5) // 2 + 2 del Comandante + 1 del Disparo
  })
  it('el segundo Disparo del mismo turno ya agota (la concesión es una vez por turno por Campeón)', () => {
    let s = dispara(escena(), 'orden')
    s = dispara(s, 'orden')
    expect(s.instances.orden.agotado).toBe(true)
  })
  it('es por Campeón: gastar la concesión de uno no se la quita a otro de la facción', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'orden2', ORDEN_DISPARA, 4)
    let s = dispara(s0, 'orden'); s = dispara(s, 'orden2')
    expect(s.instances.orden2.agotado).toBeUndefined()
  })
  it('un Campeón de OTRA facción (Caos) sí se agota: la concesión no le llega', () => {
    const s = dispara(escena(), 'caos')
    expect(s.instances.caos.agotado).toBe(true)
    expect(s.instances.caos.efectosUsadosEsteTurno ?? []).not.toContain(MARCA_DISPARO_SIN_AGOTAR)
  })
  it('sin Aurora en el campo no hay concesión (control)', () => {
    const s0 = escena(); s0.players.A.campo.campeones[0] = null
    const s = dispara(s0, 'orden')
    expect(s.instances.orden.agotado).toBe(true)
  })
  it('un Tirador no gasta la concesión: ya no agota por su keyword', () => {
    const s = dispara(escena(), 'tirador')
    expect(s.instances.tirador.agotado).toBeUndefined()
    expect(s.instances.tirador.efectosUsadosEsteTurno ?? []).not.toContain(MARCA_DISPARO_SIN_AGOTAR)
  })
  it('la concesión se reinicia al empezar el turno (junto al resto de «una vez por turno»)', () => {
    let e = dispara(escena(), 'orden')
    const ctx = crearCtx()
    // A y B terminan su turno (Forja → Choque → Ocaso, cada uno): vuelve a ser el turno de A
    for (let i = 0; i < 6; i++) e = aplicar(e, getValidActions(e, e.turno).find((x) => x.type === 'pasar_turno')!, ctx)
    expect(e.turno).toBe('A')
    expect(e.instances.orden.efectosUsadosEsteTurno).toBeUndefined()
    enderezar(e, 'orden')
    const otra = dispara(e, 'orden')
    expect(otra.instances.orden.agotado).toBeFalsy()
  })
})

/** Aurora paga el bloqueo de su tributo (3 Éter): el efecto continuo se activa. */
const conTributo = (s: GameState): GameState =>
  aplicar(s, { type: 'bloquear_eter', eterIds: s.players.A.eterReserva.slice(0, 3), targetInstanceId: 'aurora' }, crearCtx())

describe('coste_campeones_rival_mas + mientras_tenga_eter_bloqueado (el tributo de Aurora)', () => {
  const base = (): GameState => { const s = escena(); conMano(s, 'B', 'peon', PR.PEON); conEteres(s, 'B', 4); return s }

  it('sin pagar el tributo no cuesta nada extra', () => {
    expect(costeDeCampeon(base(), 'B', PR.PEON)).toBe(1)
  })
  it('con Éter bloqueado en Aurora, los Campeones del RIVAL cuestan 1 más y los propios no', () => {
    const s = conTributo(base())
    expect(s.instances.aurora.continuosActivados).toEqual([1])
    expect(costeDeCampeon(s, 'B', PR.PEON)).toBe(2)
    expect(costeDeCampeon(s, 'A', PR.PEON)).toBe(1)
  })
  it('el motor exige el coste nuevo al invocar y lo genera en las acciones válidas', () => {
    const s = conTributo(base()); s.turno = 'B'
    const b = s.players.B.eterReserva
    const corto = applyAction(s, { type: 'jugar_campeon', cardInstanceId: 'peon', slot: 0, eterIds: [b[0]] }, crearCtx())
    expect(corto.ok).toBe(false)
    const valida = getValidActions(s, 'B').find((a) => a.type === 'jugar_campeon')
    expect(valida && 'eterIds' in valida ? valida.eterIds : []).toHaveLength(2)
    const ok = applyAction(s, { type: 'jugar_campeon', cardInstanceId: 'peon', slot: 0, eterIds: [b[0], b[1]] }, crearCtx())
    expect(ok.ok).toBe(true)
  })
  it('un Éter EXTERNO sobre Aurora no enciende el tributo gratis (hace falta haberlo activado)', () => {
    const s = base(); const [e] = s.players.A.eterReserva
    s.players.A.eterReserva.splice(0, 1)
    s.instances.aurora.eterBloqueado = [e]; etiquetarEterExterno(s, [e], 'aurora', 'A')
    expect(costeDeCampeon(s, 'B', PR.PEON)).toBe(1)
  })
  it('con el tributo activo, cualquier Éter bloqueado lo sostiene (incluido el externo) y sin Éter se apaga', () => {
    const s = conTributo(base())
    const [ext] = s.players.A.eterReserva
    s.players.A.eterReserva.splice(s.players.A.eterReserva.indexOf(ext), 1)
    s.instances.aurora.eterBloqueado = [ext] // los propios se fueron: solo queda uno externo
    etiquetarEterExterno(s, [ext], 'aurora', 'A')
    expect(costeDeCampeon(s, 'B', PR.PEON)).toBe(2)
    delete s.instances.aurora.eterBloqueado
    expect(costeDeCampeon(s, 'B', PR.PEON)).toBe(1)
  })
})

describe('Reagrupar con alcance `todo` (Aurora) — independiente del alcance por efecto', () => {
  /** Pasa el turno de A y de B hasta el Alba de A. */
  const hastaAlbaDeA = (s: GameState): GameState => {
    let e = s; const ctx = crearCtx()
    for (let i = 0; i < 6; i++) e = aplicar(e, getValidActions(e, e.turno).find((x) => x.type === 'pasar_turno')!, ctx)
    return e
  }
  it('libera TODO el Éter de la carta, también el externo, y apaga el tributo', () => {
    const s0 = escena(); conMano(s0, 'B', 'peon', PR.PEON)
    const s = conTributo(s0)
    const [ext] = s.players.A.eterReserva
    s.players.A.eterReserva.splice(0, 1)
    s.instances.aurora.eterBloqueado!.push(ext); etiquetarEterExterno(s, [ext], 'aurora', 'A')
    expect(s.instances.aurora.eterBloqueado).toHaveLength(4)
    const e = hastaAlbaDeA(s)
    expect(e.instances.aurora.eterBloqueado).toBeUndefined()
    expect(e.instances.aurora.continuosActivados).toBeUndefined()
    expect(costeDeCampeon(e, 'B', PR.PEON)).toBe(1)
    expect(e.players.A.eterReserva).toHaveLength(8) // los 8 Éteres vuelven a la Reserva (3 propios + 1 externo + 4 que nunca salieron)
  })
  it('el alcance por defecto (`efecto`) NO cambia: el Éter externo se queda (Aurora clásica, steal por bloqueo_fijo)', () => {
    const s = escenaVacia('forja'); conMazo(s, 'A', 6); conMazo(s, 'B', 6)
    conCampeon(s, 'A', 'ac', AURORA_CLASICA, 0)
    conEteres(s, 'A', 6)
    const [a, b, c, d, ext] = s.players.A.eterReserva
    s.players.A.eterReserva = s.players.A.eterReserva.filter((x) => ![a, b, c, d, ext].includes(x))
    s.instances.ac.eterBloqueado = [a, b, c, d, ext]
    for (const id of [a, b, c, d]) { s.instances[id].bloqueadoPorEfecto = 'ac#1'; s.instances[id].pagadoPor = 'A' }
    etiquetarEterExterno(s, [ext], 'ac', 'A')
    const e = hastaAlbaDeA(s)
    expect(e.instances.ac.eterBloqueado).toEqual([ext])
  })
})

describe('Keywords con duración de turno otorgadas durante el Ocaso', () => {
  it('se purgan al pasar al Alba del rival', () => {
    const s = escenaVacia('ocaso'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conCampeon(s, 'A', 'p', PR.PEON, 0)
    otorgarKeyword(s, 'p', 'Carga', true) // p. ej. una Presteza jugada en el Ocaso: dura «hasta el final del turno»
    expect(keywordsDe(s, 'p')).toContain('Carga')
    const e = aplicar(s, { type: 'pasar_turno' }, crearCtx())
    expect(e.turno).toBe('B')
    expect(keywordsDe(e, 'p')).not.toContain('Carga')
  })
  it('una keyword permanente se conserva', () => {
    const s = escenaVacia('ocaso'); conMazo(s, 'A', 4); conMazo(s, 'B', 4)
    conCampeon(s, 'A', 'p', PR.PEON, 0)
    otorgarKeyword(s, 'p', 'Carga', false)
    const e = aplicar(s, { type: 'pasar_turno' }, crearCtx())
    expect(keywordsDe(e, 'p')).toContain('Carga')
  })
})
