// @vitest-environment node
/**
 * Mutación — pase de balance 2 (refuerzos de efectos), cartas REALES del seed:
 *  - MU-019 Behemot del Derrame: Indestructible mientras controles 2 o más Campeones de una misma Esencia.
 *  - MU-017 Pastor de Cenizas: tus Campeones que compartan Esencia con otro ganan Presteza.
 *  - MU-012 Cachorro del Confín: al cambiar de Esencia gana 1 de ATQ.
 *  - MU-020 Mosaico: cuando un Campeón que controlas cambie de Esencia, ese Campeón gana 1 de ATQ.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { keywordsDe, statsDe } from '../efectos'
import { interpretEffect } from '../effectInterpreter'
import { registrarCartas } from '../cards'
import type { AnyCard } from '../cards'
import type { EfectoData } from '../../../shared/types'
import type { GameState } from '../types'
import { cargarCartasPrueba, conCampeon, conMazo, crearCtx, escenaVacia, PR } from './helpers/cartasPrueba'

const BEHEMOT = 'MU-019'
const PASTOR = 'MU-017'
const CACHORRO = 'MU-012'
const MOSAICO = 'MU-020'

const campeon = (id: string, esencia: string) => ({
  id, name: id, type: 'Campeón', rarity: 'Común', keywords: [], flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', paqueteId: 'test', limiteCopias: '3',
  facciones: ['Mutación'], esencia, roles: ['Normal'], stats: { cost: 2, poder: 2, resistencia: 2 }, efectos: [],
}) as unknown as AnyCard

const T_BESTIA = 'TEST-REF-BESTIA'
const T_HUMANO = 'TEST-REF-HUMANO'
const T_MAGO = 'TEST-REF-MAGO'

beforeAll(() => {
  cargarCartasPrueba()
  registrarCartas([campeon(T_BESTIA, 'Bestia'), campeon(T_HUMANO, 'Humano'), campeon(T_MAGO, 'Mago')])
})

const escena = (): GameState => { const s = escenaVacia('forja'); conMazo(s, 'A', 4); conMazo(s, 'B', 4); return s }

/** Cambia la Esencia de `objetivo` a `esencia` con un `change_type` fijo, como lo haría cualquier carta. */
function cambiarA(s: GameState, objetivo: string, esencia: string): GameState {
  const clon = structuredClone(s)
  clon.instances.fuente ??= { cardInstanceId: 'fuente', cardId: PR.RAYO, owner: 'A' }
  const e: EfectoData = { tipo: 'hechizo', efecto: 'change_type', cambioTipo: { esencia: esencia as never }, duracion: 'turno', objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo' } }
  interpretEffect(clon, crearCtx(), clon.instances.fuente, e, { jugador: 'A', contextoUso: 'objetivo-elegido', objetivoId: objetivo })
  return clon
}

describe('MU-019 Behemot del Derrame', () => {
  it('solo no es Indestructible; con otro Campeón de su misma Esencia, sí', () => {
    const solo = escena(); conCampeon(solo, 'A', 'beh', BEHEMOT, 0)
    expect(keywordsDe(solo, 'beh')).not.toContain('Indestructible')
    expect(keywordsDe(solo, 'beh')).toContain('Protector') // conserva la que ya tenía
    const acompanado = escena(); conCampeon(acompanado, 'A', 'beh', BEHEMOT, 0); conCampeon(acompanado, 'A', 'otro', T_BESTIA, 1)
    expect(keywordsDe(acompanado, 'beh')).toContain('Indestructible')
  })
  it('con otro Campeón de OTRA Esencia no basta', () => {
    const s = escena(); conCampeon(s, 'A', 'beh', BEHEMOT, 0); conCampeon(s, 'A', 'otro', T_MAGO, 1)
    expect(keywordsDe(s, 'beh')).not.toContain('Indestructible')
  })
  it('si el otro Campeón cambia de Esencia, la pierde', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'beh', BEHEMOT, 0); conCampeon(s0, 'A', 'otro', T_BESTIA, 1)
    expect(keywordsDe(s0, 'beh')).toContain('Indestructible')
    expect(keywordsDe(cambiarA(s0, 'otro', 'Mago'), 'beh')).not.toContain('Indestructible')
  })
})

describe('MU-017 Pastor de Cenizas', () => {
  it('da Presteza a los Campeones que comparten Esencia con otro, y a nadie más', () => {
    const s = escena(); conCampeon(s, 'A', 'pastor', PASTOR, 0); conCampeon(s, 'A', 'h2', T_HUMANO, 1); conCampeon(s, 'A', 'mago', T_MAGO, 2)
    expect(keywordsDe(s, 'pastor')).toContain('Presteza') // Humano con otro Humano
    expect(keywordsDe(s, 'h2')).toContain('Presteza')
    expect(keywordsDe(s, 'mago')).not.toContain('Presteza') // solo, sin pareja de su Esencia
  })
  it('solo, no se da Presteza a sí mismo', () => {
    const s = escena(); conCampeon(s, 'A', 'pastor', PASTOR, 0)
    expect(keywordsDe(s, 'pastor')).not.toContain('Presteza')
  })
})

describe('MU-012 Cachorro del Confín', () => {
  it('al cambiar de Esencia gana 1 de ATQ hasta el final del turno', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'cachorro', CACHORRO, 0)
    const base = statsDe(s0, 'cachorro').poder
    expect(statsDe(cambiarA(s0, 'cachorro', 'Elemental'), 'cachorro').poder).toBe(base + 1)
  })
})

describe('MU-020 Mosaico', () => {
  it('cuando un Campeón que controlas cambia de Esencia, ese Campeón gana 1 de ATQ', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'mosaico', MOSAICO, 0); conCampeon(s0, 'A', 'otro', T_BESTIA, 1)
    const base = statsDe(s0, 'otro').poder
    const s = cambiarA(s0, 'otro', 'Mago')
    expect(statsDe(s, 'otro').poder).toBe(base + 1)
    expect(statsDe(s, 'mosaico').poder).toBe(statsDe(s0, 'mosaico').poder) // solo el que cambió
  })
  it('sin Mosaico en el campo, cambiar de Esencia no da ATQ', () => {
    const s0 = escena(); conCampeon(s0, 'A', 'otro', T_BESTIA, 1)
    expect(statsDe(cambiarA(s0, 'otro', 'Mago'), 'otro').poder).toBe(statsDe(s0, 'otro').poder)
  })
})
