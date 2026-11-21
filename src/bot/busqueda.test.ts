import { describe, expect, it } from 'vitest'
import { applyAction, createInitialState, getValidActions } from '../online/game'
import type { Action } from '../online/game'
import { mazoPorId } from '../online/mazos'
import { ACCIONES_CON_INFO_OCULTA, CONFIG, conVariantesDeSacrificio, soloPublicas } from './busqueda'
import { BOTS, resolverBot } from './registro'

const pasar: Action = { type: 'pasar_prioridad' }
const respuesta: Action = { type: 'jugar_respuesta', cardInstanceId: 'm1', eterIds: [] }
const arcanaEnCadena: Action = { type: 'responder_cadena', cardInstanceId: 'a1' }
const arcanaActiva: Action = { type: 'activar_arcana', cardInstanceId: 'a2', slot: 0, eterIds: [] }
const bloqueo: Action = { type: 'declarar_bloqueo', asignaciones: { x: 'y' } }
const habilidad: Action = { type: 'activar_habilidad', cardInstanceId: 'c1', eterIds: [] }

describe('soloPublicas · lo que un jugador real puede suponer del rival', () => {
  it('quita las respuestas que salen de su mano o de cartas boca abajo, y conserva el resto', () => {
    const r = soloPublicas([pasar, respuesta, arcanaEnCadena, arcanaActiva, bloqueo, habilidad])
    expect(r).toEqual([pasar, bloqueo, habilidad])
  })

  it('las habilidades de Campeones en mesa y los bloqueos son públicos (se deducen del tablero)', () => {
    expect(soloPublicas([bloqueo, habilidad, pasar])).toEqual([bloqueo, habilidad, pasar])
  })

  it('sin nada oculto devuelve la misma lista', () => {
    const lista = [pasar, bloqueo]
    expect(soloPublicas(lista)).toEqual(lista)
  })

  it('si TODO fuese oculto devuelve la lista entera: nunca deja la búsqueda sin salida', () => {
    const solo = [respuesta, arcanaEnCadena]
    expect(soloPublicas(solo)).toEqual(solo)
  })

  it('no modifica la lista original', () => {
    const lista = [pasar, respuesta]
    soloPublicas(lista)
    expect(lista).toEqual([pasar, respuesta])
  })

  it('lo oculto son exactamente estos tres tipos de acción', () => {
    expect([...ACCIONES_CON_INFO_OCULTA].sort()).toEqual(['activar_arcana', 'jugar_respuesta', 'responder_cadena'])
  })
})

describe('Config.infoPublica · el experimento no cambia al bot de siempre', () => {
  it('por defecto está apagada: el Difícil explora al rival con sus acciones reales', () => {
    expect(CONFIG.infoPublica).toBeFalsy()
  })

  it('el bot «dificil-publico» está registrado y es distinto del Difícil', () => {
    expect(BOTS['dificil-publico']).toBeTypeOf('function')
    expect(BOTS['dificil-publico']).not.toBe(BOTS.dificil)
  })

  it('un bot ad hoc puede activarla con cfg:publica=1', () => {
    expect(resolverBot('cfg:publica=1')).toBeTypeOf('function')
    expect(resolverBot('cfg:prof=2,publica=0')).toBeTypeOf('function')
  })
})

describe('conVariantesDeSacrificio · el bot elige a quién sacrifica un Soberano (el motor ofrece solo al primero)', () => {
  const expandir = (ids: string[]) => ids
  /** Purga con Idris (Soberano coste 0) en la mano y tres Campeones Purga en el campo (slots 0-2). */
  const escenario = () => {
    const s = structuredClone(createInitialState(expandir(mazoPorId('purga')!.cardIds), expandir(mazoPorId('mutacion')!.cardIds), 3).state)
    const mover = (cardId: string): string => {
      const p = s.players.A
      const id = [...p.mazo, ...p.mano].find((x) => s.instances[x]?.cardId === cardId)!
      p.mazo = p.mazo.filter((x) => x !== id)
      p.mano = p.mano.filter((x) => x !== id)
      return id
    }
    const idris = mover('PU-010')
    s.players.A.mano.push(idris)
    ;['PU-011', 'PU-012', 'PU-013'].forEach((c, i) => { s.players.A.campo.campeones[i] = mover(c) })
    s.fase = 'forja'
    s.turno = 'A'
    return { s, idris }
  }

  it('sin variantes el motor ofrece una sola jugada de Idris: sacrifica al primero del campo', () => {
    const { s, idris } = escenario()
    const jugadas = getValidActions(s, 'A').filter((a) => a.type === 'jugar_campeon' && a.cardInstanceId === idris)
    expect(jugadas).toHaveLength(1)
  })

  it('con variantes hay una por cada Campeón sacrificable, y todas las acepta el motor', () => {
    const { s, idris } = escenario()
    const acciones = conVariantesDeSacrificio(s, getValidActions(s, 'A'), 'A')
    const jugadas = acciones.filter((a): a is Extract<Action, { type: 'jugar_campeon' }> => a.type === 'jugar_campeon' && a.cardInstanceId === idris)
    expect(jugadas).toHaveLength(3)
    expect(new Set(jugadas.map((a) => a.sacrificios![0])).size).toBe(3)
    for (const a of jugadas) {
      expect(a.slot).toBe(s.players.A.campo.campeones.indexOf(a.sacrificios![0])) // baja en el slot del sacrificado, como el generador
      expect(applyAction(structuredClone(s), a, { next: () => 0.5, emit: () => {}, events: [], draws: 0 }).ok).toBe(true)
    }
  })

  it('un Campeón sin sacrificio (Normal) no se multiplica', () => {
    const { s } = escenario()
    const antes = getValidActions(s, 'A')
    const despues = conVariantesDeSacrificio(s, antes, 'A')
    const normales = (xs: Action[]) => xs.filter((a) => a.type === 'jugar_campeon' && (a.sacrificios ?? []).length === 0)
    expect(normales(despues)).toHaveLength(normales(antes).length)
  })

  it('sin Soberanos en la mano devuelve la misma lista (no cuesta nada)', () => {
    const s = structuredClone(createInitialState(mazoPorId('purga')!.cardIds, mazoPorId('mutacion')!.cardIds, 1).state)
    const acciones = getValidActions(s, 'A')
    expect(conVariantesDeSacrificio(s, acciones, 'A')).toBe(acciones)
  })
})

describe('Config.elegirSacrificio · el bot de línea base conserva el comportamiento anterior', () => {
  it('por defecto está encendida y existe el bot «dificil-sin-sacrificio»', () => {
    expect(CONFIG.elegirSacrificio).not.toBe(false)
    expect(BOTS['dificil-sin-sacrificio']).toBeTypeOf('function')
    expect(BOTS['dificil-sin-sacrificio']).not.toBe(BOTS.dificil)
  })
})
