import { describe, expect, it } from 'vitest'
import type { Action } from '../online/game'
import { ACCIONES_CON_INFO_OCULTA, CONFIG, soloPublicas } from './busqueda'
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
