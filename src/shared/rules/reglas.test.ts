import { describe, expect, it } from 'vitest'
import {
  KEYWORD_REGLAS,
  REGLAS,
  REGLA_IDS,
  describirModificacion,
  esReglaNumerica,
  operacionesDe,
  resolverRegla,
  type ModificadorRegla,
} from './reglas'

const mod = (m: Omit<ModificadorRegla, 'orden'>, orden = 0): ModificadorRegla => ({ ...m, orden })

describe('catálogo de reglas', () => {
  it('cada regla cita su sección del manual y tiene un valor base', () => {
    for (const id of REGLA_IDS) {
      expect(REGLAS[id].manual, id).toMatch(/§/)
      expect(['number', 'boolean'], id).toContain(typeof REGLAS[id].base)
    }
  })

  it('el valor base es el del manual (el fallback)', () => {
    expect(REGLAS.limiteMano.base).toBe(6)
    expect(REGLAS.agotadoPuedeBloquear.base).toBe(false)
    expect(REGLAS.invocacionCansada.base).toBe(true)
    expect(REGLAS.rupturasPorTurno.base).toBe(1)
    expect(REGLAS.eterBloqueadoExtra.base).toBe(0)
  })

  it('las operaciones válidas dependen del tipo de la regla', () => {
    expect(operacionesDe('limiteMano')).toEqual(['fijar', 'sumar'])
    expect(operacionesDe('agotadoPuedeBloquear')).toEqual(['permitir', 'prohibir'])
    expect(esReglaNumerica('limiteMano')).toBe(true)
    expect(esReglaNumerica('disparoAgota')).toBe(false)
  })
})

describe('resolverRegla — sin modificadores = el manual', () => {
  it.each(REGLA_IDS)('%s devuelve su valor base', (id) => {
    expect(resolverRegla(id, [])).toBe(REGLAS[id].base)
  })

  it('ignora modificadores de otras reglas', () => {
    expect(resolverRegla('limiteMano', [mod({ regla: 'cartasPorAlba', operacion: 'sumar', valor: 5 })])).toBe(6)
  })
})

describe('resolverRegla — numéricas', () => {
  it('sumar aplica sobre la base', () => {
    expect(resolverRegla('limiteMano', [mod({ regla: 'limiteMano', operacion: 'sumar', valor: 2 })])).toBe(8)
  })

  it('varios sumar se acumulan, también los negativos', () => {
    const mods = [
      mod({ regla: 'limiteMano', operacion: 'sumar', valor: 2 }),
      mod({ regla: 'limiteMano', operacion: 'sumar', valor: -3 }),
    ]
    expect(resolverRegla('limiteMano', mods)).toBe(5)
  })

  it('fijar reemplaza la base y gana el más reciente', () => {
    const mods = [
      mod({ regla: 'limiteMano', operacion: 'fijar', valor: 4 }, 1),
      mod({ regla: 'limiteMano', operacion: 'fijar', valor: 9 }, 2),
    ]
    expect(resolverRegla('limiteMano', mods)).toBe(9)
  })

  it('fijar y luego sumar: el sumar se aplica sobre el valor fijado', () => {
    const mods = [
      mod({ regla: 'limiteMano', operacion: 'fijar', valor: 4 }, 1),
      mod({ regla: 'limiteMano', operacion: 'sumar', valor: 1 }, 0),
    ]
    expect(resolverRegla('limiteMano', mods)).toBe(5)
  })

  it('respeta el mínimo de la regla (nunca baja de 0)', () => {
    expect(resolverRegla('limiteMano', [mod({ regla: 'limiteMano', operacion: 'sumar', valor: -50 })])).toBe(0)
  })

  it('ejemplo guía: el tope de Éter bloqueado sube con un efecto externo', () => {
    expect(resolverRegla('eterBloqueadoExtra', [mod({ regla: 'eterBloqueadoExtra', operacion: 'sumar', valor: 1 })])).toBe(1)
  })

  it('una operación de tipo booleano sobre una regla numérica se ignora', () => {
    expect(resolverRegla('limiteMano', [mod({ regla: 'limiteMano', operacion: 'prohibir' })])).toBe(6)
  })
})

describe('resolverRegla — booleanas', () => {
  it('permitir levanta una prohibición del manual', () => {
    expect(resolverRegla('agotadoPuedeBloquear', [mod({ regla: 'agotadoPuedeBloquear', operacion: 'permitir' })])).toBe(true)
  })

  it('prohibir apaga una regla que el manual permite', () => {
    expect(resolverRegla('puedeSerExiliada', [mod({ regla: 'puedeSerExiliada', operacion: 'prohibir' })])).toBe(false)
  })

  it('lo que prohíbe gana a lo que permite, sin importar el orden', () => {
    const mods = [
      mod({ regla: 'puedeSerExiliada', operacion: 'prohibir' }, 1),
      mod({ regla: 'puedeSerExiliada', operacion: 'permitir' }, 2),
    ]
    expect(resolverRegla('puedeSerExiliada', mods)).toBe(false)
  })

  it('una operación numérica sobre una regla booleana se ignora', () => {
    expect(resolverRegla('puedeSerExiliada', [mod({ regla: 'puedeSerExiliada', operacion: 'sumar', valor: 3 })])).toBe(true)
  })
})

describe('describirModificacion — frase para el texto de la carta', () => {
  it('numérica: sumar con signo y fijar con dos puntos', () => {
    expect(describirModificacion({ id: 'limiteMano', operacion: 'sumar', valor: 2 })).toBe('Límite de mano +2')
    expect(describirModificacion({ id: 'limiteMano', operacion: 'sumar', valor: -1 })).toBe('Límite de mano -1')
    expect(describirModificacion({ id: 'ataquesPorTurno', operacion: 'fijar', valor: 2 })).toBe('Ataques por turno: 2')
  })
  it('booleana: se permite / se prohíbe, con la etiqueta en minúscula', () => {
    expect(describirModificacion({ id: 'agotadoPuedeBloquear', operacion: 'permitir' })).toBe('Se permite: un Campeón agotado puede bloquear')
    expect(describirModificacion({ id: 'atacarAgota', operacion: 'prohibir' })).toBe('Se prohíbe: atacar agota al Campeón')
  })
  it('cada regla del catálogo produce una frase no vacía con cada una de sus operaciones', () => {
    for (const id of REGLA_IDS) {
      for (const operacion of operacionesDe(id)) {
        expect(describirModificacion({ id, operacion, valor: 1 }).length).toBeGreaterThan(0)
      }
    }
  })
})

describe('KEYWORD_REGLAS — una keyword es una regla modificada', () => {
  it('cada keyword apunta a reglas que existen en el catálogo', () => {
    for (const [kw, mods] of Object.entries(KEYWORD_REGLAS)) {
      for (const m of mods) expect(REGLA_IDS, `${kw} → ${m.regla}`).toContain(m.regla)
    }
  })

  it.each([
    ['Carga', 'invocacionCansada'],
    ['Vigor', 'atacarAgota'],
    ['Tirador', 'disparoAgota'],
    ['Inexiliable', 'puedeSerExiliada'],
    ['Inegable', 'puedeSerNegada'],
    ['Inmortal', 'puedeSerDestruidaPorEfecto'],
    ['Indestructible', 'puedeSerDestruidaEnBatalla'],
  ] as const)('%s apaga la regla %s', (kw, regla) => {
    const mods = KEYWORD_REGLAS[kw].map((m, i) => ({ ...m, orden: i }))
    expect(resolverRegla(regla, mods)).toBe(false)
  })
})
