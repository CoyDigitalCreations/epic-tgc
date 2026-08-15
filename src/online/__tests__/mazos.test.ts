import { describe, expect, it } from 'vitest'
import { ALL_CARDS, ESTASIS_CARDS } from '../../shared/data/paquetes'
import type { AnyCard } from '../../shared/types'
import { getCardMeta, registrarCartas } from '../game'
import { buildDeck, cartasDisponibles, conteosDe, MAZOS, mazoParaBot } from '../mazos'
import { validarDeck } from '../game/initialState'

describe('cartasDisponibles', () => {
  it('sin colección devuelve solo los diseños del catálogo (ALL_CARDS)', () => {
    const disponibles = cartasDisponibles([])
    expect(disponibles.length).toBe(ALL_CARDS.length)
    expect(disponibles).toEqual(ALL_CARDS)
  })

  it('agrega cartas custom con id nuevo (no registrado en ALL_CARDS)', () => {
    const custom: AnyCard = {
      ...ESTASIS_CARDS[0],
      id: 'custom-nueva-1',
      name: 'Custom Nueva',
    }
    const disponibles = cartasDisponibles([custom])
    expect(disponibles.length).toBe(ALL_CARDS.length + 1)
    expect(disponibles[disponibles.length - 1].id).toBe('custom-nueva-1')
  })

  it('una custom que repite el id de un diseño NO pisa el diseño (sets puros)', () => {
    const diseno = ESTASIS_CARDS[0]
    const custom: AnyCard = { ...diseno, id: diseno.id, name: 'Nombre editado' }
    const disponibles = cartasDisponibles([custom])
    expect(disponibles.filter((c) => c.id === diseno.id)).toHaveLength(1)
    expect(disponibles.find((c) => c.id === diseno.id)?.name).toBe(diseno.name)
  })
})

describe('conteosDe / buildDeck', () => {
  it('conteosDe sobre el mazo de Estásis da 15 Éter + 45 Principal + 6 Vínculos', () => {
    const conteos = conteosDe(MAZOS[0].cardIds)
    expect(conteos).toEqual({ eter: 15, principal: 45, vinculos: 6 })
  })

  it('buildDeck expande copias respetando limiteCopias en orden estable', () => {
    const a = ESTASIS_CARDS[0]
    const b = ESTASIS_CARDS[1]
    const seleccion = new Map<string, number>([
      [a.id, Number(a.limiteCopias ?? 1)],
      [b.id, 1],
    ])
    const deck = buildDeck(seleccion)
    const copiasA = Number(a.limiteCopias ?? 1)
    expect(deck.length).toBe(copiasA + 1)
    // Orden estable: todas las copias de a, luego la de b
    expect(deck.slice(0, copiasA).every((id) => id === a.id)).toBe(true)
    expect(deck[copiasA]).toBe(b.id)
  })

  it('un mazo armado con buildDeck pasa validarDeck (exportada)', () => {
    const seleccion = new Map<string, number>()
    for (const c of ESTASIS_CARDS) {
      seleccion.set(c.id, Number(c.limiteCopias ?? 1))
    }
    const deck = buildDeck(seleccion)
    expect(deck).toHaveLength(66)
    expect(() => validarDeck(deck, 'test')).not.toThrow()
  })

  it('validarDeck exportada rechaza un mazo con distribución inválida', () => {
    const deckInvalido = Array.from({ length: 66 }, (_, i) => ESTASIS_CARDS[i % ESTASIS_CARDS.length].id)
    expect(() => validarDeck(deckInvalido, 'test')).toThrow(/15\/45\/6|se esperaban|inválido/)
  })
})

describe('mazoParaBot (elección determinista del mazo del bot)', () => {
  it('con humano custom usa MAZOS[seed % 2]', () => {
    expect(mazoParaBot(0, 'custom').id).toBe('estasis')
    expect(mazoParaBot(1, 'custom').id).toBe('disonancia')
    expect(mazoParaBot(42, 'custom').id).toBe('estasis')
  })

  it('con humano set usa el otro set (sin importar el seed)', () => {
    expect(mazoParaBot(0, 'estasis').id).toBe('disonancia')
    expect(mazoParaBot(1, 'estasis').id).toBe('disonancia')
    expect(mazoParaBot(0, 'disonancia').id).toBe('estasis')
    expect(mazoParaBot(99, 'disonancia').id).toBe('estasis')
  })
})

describe('registrarCartas (catálogo dinámico del motor)', () => {
  it('getCardMeta resuelve cartas registradas de la colección', () => {
    const diseno = ESTASIS_CARDS[0]
    const custom: AnyCard = { ...diseno, id: 'custom-catalogo', name: diseno.name }
    registrarCartas([custom])
    expect(getCardMeta('custom-catalogo')).toBe(custom)
  })

  it('las cartas originales del paquete siguen resolviendo tras registrar', () => {
    const original = ESTASIS_CARDS[0]
    expect(getCardMeta(original.id)?.id).toBe(original.id)
  })
})
