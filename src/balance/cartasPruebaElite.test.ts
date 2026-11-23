import { describe, it, expect } from 'vitest'
import cartasPruebaJson from '../../seed/CartasPrueba.json'
import { ES_ID_DEL_BANCO, generarBanco, type Combo, type EspecCarta } from '../../scripts/lib/cartasBalanceElite'
import { validateCard } from '../forge/utils/validation'
import type { AnyCard } from '../shared/types'
import { cargarCartas } from './cargador'
import { limitesDeCarta, type LimiteCarta } from './limitesCarta'
import { esElite, esUnica, sacrificiosDe } from './presupuesto'
import type { CartaBalance } from './tipos'

/**
 * Banco de prueba del balance de élites (PR-100 en adelante de seed/CartasPrueba.json): una cuadrícula de Campeones
 * generada con la fórmula vigente de CONFIG_V1 para ver, en el Tablero y en el modal 📊, cómo se comporta el presupuesto
 * de Soberanos, Emperadores y Únicas. Estos tests garantizan que cada carta cae donde dice su nombre.
 */
const todas = cartasPruebaJson as unknown as AnyCard[]
const delBanco = todas.filter((c) => ES_ID_DEL_BANCO(c.id))
const banco = generarBanco()
const balance = new Map<string, CartaBalance>(cargarCartas(delBanco).cartas.map((c) => [c.id, c]))
const specs = new Map<string, EspecCarta>(banco.specs.map((s) => [s.id, s]))

const carta = (id: string): CartaBalance => {
  const c = balance.get(id)
  if (!c) throw new Error(`Falta ${id} en el banco`)
  return c
}
const limite = (id: string, clave: LimiteCarta['id']): LimiteCarta | undefined => limitesDeCarta(carta(id)).find((l) => l.id === clave)
const delGrupo = (grupo: EspecCarta['grupo']) => banco.specs.filter((s) => s.grupo === grupo)

describe('banco de élites: el JSON está al día con el generador', () => {
  it('cada carta del JSON es idéntica a la que genera la fórmula vigente (si falla: npm run generar:cartas-elite)', () => {
    expect(delBanco.map((c) => c.id)).toEqual(banco.cartas.map((c) => String(c.id)))
    for (const generada of banco.cartas) {
      const enJson = delBanco.find((c) => c.id === generada.id)
      expect(JSON.stringify(enJson), String(generada.id)).toBe(JSON.stringify(generada))
    }
  })

  it('no toca el banco del motor: sus 58 cartas siguen siendo PR-001..PR-075', () => {
    expect(todas.length - delBanco.length).toBe(58)
    expect(todas.filter((c) => !ES_ID_DEL_BANCO(c.id)).every((c) => /^PR-0\d{2}$/.test(c.id))).toBe(true)
  })

  it('todas son Campeones válidos para el Card-Maker (validateCard) con ids únicos', () => {
    expect(new Set(delBanco.map((c) => c.id)).size).toBe(delBanco.length)
    for (const c of delBanco) {
      expect(c.type).toBe('Campeón')
      expect(validateCard(c), c.id).toEqual([])
    }
  })
})

describe('banco de élites: cubre las combinaciones', () => {
  const COMBOS: Combo[] = ['normal', 'soberano', 'emperador', 'unica', 'soberano-unica', 'emperador-unica']

  it.each(COMBOS)('%s: está en la cuadrícula de stats y en la de efectos', (combo) => {
    expect(banco.specs.some((s) => s.combo === combo && s.grupo === 'stats')).toBe(true)
    expect(banco.specs.some((s) => s.combo === combo && s.grupo === 'efecto')).toBe(true)
  })

  it('cada combinación tiene el rol, la rareza y los sacrificios que dice', () => {
    for (const s of banco.specs) {
      const c = carta(s.id)
      const esperadoSacrificios = s.combo.startsWith('soberano') ? 1 : s.combo.startsWith('emperador') ? 2 : 0
      const esperadaUnica = s.combo.endsWith('unica')
      expect(sacrificiosDe(c), s.id).toBe(esperadoSacrificios)
      expect(esUnica(c), s.id).toBe(esperadaUnica)
      expect(esElite(c), s.id).toBe(esperadoSacrificios > 0 || esperadaUnica)
    }
  })

  it('hay Soberanos y Emperadores que no son Únicas, y Únicas que no son ni Soberanos ni Emperadores', () => {
    expect(banco.specs.some((s) => s.combo === 'soberano')).toBe(true)
    expect(banco.specs.some((s) => s.combo === 'emperador')).toBe(true)
    expect(banco.specs.some((s) => s.combo === 'unica' && sacrificiosDe(carta(s.id)) === 0)).toBe(true)
  })

  it('las Campeones normales del banco cuestan 6 o más', () => {
    const normales = banco.specs.filter((s) => s.combo === 'normal')
    expect(normales.length).toBeGreaterThan(0)
    expect(normales.every((s) => s.coste >= 6)).toBe(true)
    expect(normales.every((s) => !esElite(carta(s.id)))).toBe(true)
  })

  it('incluye los costes 0 de élite (caso Idris) y los costes 6 a 10 de normales', () => {
    expect(banco.specs.some((s) => s.coste === 0 && s.combo !== 'normal')).toBe(true)
    for (const coste of [6, 7, 8, 9, 10]) expect(banco.specs.some((s) => s.combo === 'normal' && s.coste === coste)).toBe(true)
  })

  it('los tres niveles de efecto están presentes', () => {
    for (const nivel of ['medio', 'fuerte', 'tabu'] as const) expect(banco.specs.some((s) => s.nivelEfecto === nivel)).toBe(true)
  })
})

describe('banco de élites: cada carta cae donde dice su nombre (contra el oráculo del modal 📊)', () => {
  const stats = delGrupo('stats')

  it.each(stats.filter((s) => s.nivelStats === 'dentro').map((s) => [s.id, carta(s.id)?.nombre ?? s.id] as const))(
    '%s %s: dentro del presupuesto de stats, sin rebasar nada',
    (id) => {
      const rebasados = limitesDeCarta(carta(id)).filter((l) => l.estado === 'excede' || l.estado === 'bajo')
      expect(rebasados.map((l) => l.id)).toEqual([])
      expect(limite(id, 'suma')?.estado).toBe('dentro')
    },
  )

  it.each(stats.filter((s) => s.nivelStats === 'limite').map((s) => [s.id, carta(s.id)?.nombre ?? s.id] as const))(
    '%s %s: usa justo todo el presupuesto de stats, sin pasarse',
    (id) => {
      expect(limite(id, 'suma')?.estado).toBe('limite')
      expect(limite(id, 'suma')?.usado).toBe(limite(id, 'suma')?.limite)
    },
  )

  it.each(stats.filter((s) => s.nivelStats === 'exceso-suma').map((s) => [s.id, carta(s.id)?.nombre ?? s.id] as const))(
    '%s %s: se pasa del presupuesto de stats',
    (id) => {
      expect(limite(id, 'suma')?.estado).toBe('excede')
    },
  )

  it.each(stats.filter((s) => s.nivelStats === 'exceso-atq').map((s) => [s.id, carta(s.id)?.nombre ?? s.id] as const))(
    '%s %s: solo el ATQ pasa su tope (la suma cabe en el presupuesto)',
    (id) => {
      expect(limite(id, 'atq')?.estado).toBe('excede')
      expect(limite(id, 'res')?.estado).not.toBe('excede')
      expect(limite(id, 'suma')?.estado).not.toBe('excede')
    },
  )

  it.each(stats.filter((s) => s.nivelStats === 'exceso-res').map((s) => [s.id, carta(s.id)?.nombre ?? s.id] as const))(
    '%s %s: solo la RES pasa su tope (la suma cabe en el presupuesto)',
    (id) => {
      expect(limite(id, 'res')?.estado).toBe('excede')
      expect(limite(id, 'atq')?.estado).not.toBe('excede')
      expect(limite(id, 'suma')?.estado).not.toBe('excede')
    },
  )

  it('el presupuesto de una élite es mayor que el de una normal del mismo coste (6 por sacrificio, 5 por Única)', () => {
    const limiteSuma = (combo: Combo) => {
      const s = banco.specs.find((x) => x.combo === combo && x.coste === 5 && x.nivelStats === 'limite')
      if (!s) throw new Error(`Falta ${combo} c5 Límite`)
      return limite(s.id, 'suma')?.limite ?? 0
    }
    const soberano = limiteSuma('soberano')
    const emperador = limiteSuma('emperador')
    const unica = limiteSuma('unica')
    expect(emperador - soberano).toBe(6)
    expect(soberano - limiteSuma('unica')).toBe(1)
    expect(limiteSuma('soberano-unica') - soberano).toBe(5)
    expect(unica).toBeGreaterThan(0)
  })

  describe('con efecto', () => {
    const conEfecto = delGrupo('efecto')

    it.each(conEfecto.filter((s) => s.ajuste === 'ajustada').map((s) => [s.id, carta(s.id)?.nombre ?? s.id] as const))(
      '%s %s: con los stats ajustados al impuesto no se pasa del presupuesto de stats',
      (id) => {
        expect(limite(id, 'suma')?.estado).not.toBe('excede')
      },
    )

    it.each(conEfecto.filter((s) => s.ajuste === 'sin-impuesto').map((s) => [s.id, carta(s.id)?.nombre ?? s.id] as const))(
      '%s %s: sin descontar el impuesto del efecto se pasa del presupuesto de stats',
      (id) => {
        expect(limite(id, 'suma')?.estado).toBe('excede')
      },
    )

    it('las élites no tienen el tope plano de efecto por coste; las normales sí', () => {
      for (const s of conEfecto) {
        const fila = limite(s.id, 'efecto-por-coste')
        expect(fila?.estado === 'sin-limite', s.id).toBe(esElite(carta(s.id)))
      }
    })

    it('el nivel con tabú rebasa el presupuesto de tabú en las cartas de coste bajo y cabe en las de coste alto', () => {
      const tabu = conEfecto.filter((s) => s.nivelEfecto === 'tabu' && s.ajuste === 'ajustada')
      const estados = tabu.map((s) => limite(s.id, 'tabu')?.estado)
      expect(estados).toContain('excede')
      expect(estados).toContain('dentro')
    })

    it('el nivel medio no paga impuesto de efecto (por eso no tiene variante sin impuesto)', () => {
      const medios = conEfecto.filter((s) => s.nivelEfecto === 'medio')
      expect(medios.length).toBeGreaterThan(0)
      expect(medios.every((s) => s.ajuste === 'ajustada')).toBe(true)
    })
  })

  it('cada especificación tiene su carta en el JSON con los mismos stats', () => {
    for (const s of specs.values()) {
      expect(carta(s.id).stats, s.id).toEqual({ atq: s.atq, res: s.res })
      expect(carta(s.id).coste, s.id).toBe(s.coste)
    }
  })
})
