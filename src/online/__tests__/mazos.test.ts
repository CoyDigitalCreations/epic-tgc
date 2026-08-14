import { describe, expect, it } from 'vitest'
import { ESTASIS_CARDS } from '../../shared/data/paquetes'
import type { AnyCard } from '../../shared/types'
import { getCardMeta, registrarCartas } from '../game'
import { armarMazoConColeccion, MAZOS } from '../mazos'

describe('armarMazoConColeccion', () => {
  it('colección vacía → el mazo del paquete queda intacto', () => {
    const { mazo, reemplazadas } = armarMazoConColeccion(MAZOS[0], [])
    expect(mazo.cardIds).toEqual(MAZOS[0].cardIds)
    expect(reemplazadas).toBe(0)
  })

  it('reemplaza cada copia de un diseño por la versión de la colección (mismo nombre y type)', () => {
    const diseno = ESTASIS_CARDS[0]
    const custom: AnyCard = { ...diseno, id: 'custom-estasis-1', name: diseno.name }
    const copias = Number(diseno.limiteCopias ?? 1)

    const { mazo, reemplazadas } = armarMazoConColeccion(MAZOS[0], [custom])

    expect(reemplazadas).toBe(copias)
    const apariciones = mazo.cardIds.filter((id) => id === custom.id)
    expect(apariciones.length).toBe(copias)
    // El diseño original ya no aparece
    expect(mazo.cardIds.filter((id) => id === diseno.id).length).toBe(0)
  })

  it('el match por nombre es case-insensitive y con espacios', () => {
    const diseno = ESTASIS_CARDS[1]
    const custom: AnyCard = { ...diseno, id: 'custom-2', name: `  ${diseno.name.toUpperCase()}  ` }
    const { reemplazadas } = armarMazoConColeccion(MAZOS[0], [custom])
    expect(reemplazadas).toBe(Number(diseno.limiteCopias ?? 1))
  })

  it('NO reemplaza si el type difiere aunque el nombre coincida (preserva la distribución 15/45/6)', () => {
    const diseno = ESTASIS_CARDS.find((c) => c.type !== 'Éter')!
    const custom = {
      ...diseno,
      id: 'custom-mal',
      type: diseno.type === 'Campeón' ? ('Mística' as const) : ('Campeón' as const),
    } as unknown as AnyCard

    const { reemplazadas } = armarMazoConColeccion(MAZOS[0], [custom])
    expect(reemplazadas).toBe(0)
    expect(MAZOS[0].cardIds).toContain(diseno.id)
  })

  it('la distribución del mazo resultante se conserva (15 Éter + 45 Principal + 6 Vínculos)', () => {
    const coleccion = ESTASIS_CARDS.map((c) => ({ ...c, id: `custom-${c.id}` }))
    registrarCartas(coleccion) // el catálogo debe resolver los ids custom para el conteo
    const { mazo } = armarMazoConColeccion(MAZOS[0], coleccion)
    const porTipo = { 'Éter': 0, 'Vínculo': 0, principal: 0 }
    for (const id of mazo.cardIds) {
      const meta = getCardMeta(id)
      if (!meta) continue
      if (meta.type === 'Éter') porTipo['Éter'] += 1
      else if (meta.type === 'Vínculo') porTipo['Vínculo'] += 1
      else porTipo.principal += 1
    }
    expect(porTipo['Éter']).toBe(15)
    expect(porTipo['Vínculo']).toBe(6)
    expect(porTipo.principal).toBe(45)
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
