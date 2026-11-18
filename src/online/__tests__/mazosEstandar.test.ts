// @vitest-environment node
/**
 * Mazos oficiales con el set estándar: cada uno recorta COPIAS de sus cartas (no diseños) y mete cartas genéricas ST-xxx
 * (1 Vínculo, 2 Éter y 7 de Principal). El tope `limiteCopias` NO se toca: sigue siendo el de los mazos personalizados.
 */
import { describe, expect, it } from 'vitest'
import { ALL_CARDS } from '../../shared/data/paquetes'
import { getCardMeta } from '../game/cards'
import { MAZOS, conteosDe, type SetId } from '../mazos'

const copias = (cardIds: string[]) => cardIds.reduce<Record<string, number>>((acc, id) => ({ ...acc, [id]: (acc[id] ?? 0) + 1 }), {})

/** Qué entra de ST-xxx en cada mazo (id → copias): el reparto aprobado del papel. */
const ESTANDAR_EN_MAZO: Record<SetId, Record<string, number>> = {
  estasis: { 'ST-001': 1, 'ST-003': 1, 'ST-010': 2, 'ST-011': 1, 'ST-020': 1, 'ST-021': 1, 'ST-024': 2, 'ST-040': 1 },
  disonancia: { 'ST-002': 1, 'ST-004': 1, 'ST-012': 2, 'ST-013': 1, 'ST-020': 1, 'ST-022': 1, 'ST-030': 1, 'ST-031': 1, 'ST-042': 1 },
  purga: { 'ST-001': 1, 'ST-003': 1, 'ST-014': 1, 'ST-015': 1, 'ST-020': 1, 'ST-023': 1, 'ST-034': 2, 'ST-033': 1, 'ST-041': 1 },
  mutacion: { 'ST-005': 1, 'ST-004': 1, 'ST-016': 2, 'ST-017': 1, 'ST-020': 1, 'ST-021': 1, 'ST-030': 1, 'ST-031': 1, 'ST-043': 1 },
}

describe('mazos oficiales con el set estándar', () => {
  for (const mazo of MAZOS) {
    describe(mazo.nombre, () => {
      const c = copias(mazo.cardIds)

      it('suma 66 cartas: 15 Éter + 45 Principal + 6 Vínculos', () => {
        expect(mazo.cardIds).toHaveLength(66)
        expect(conteosDe(mazo.cardIds)).toEqual({ eter: 15, principal: 45, vinculos: 6 })
      })

      it('ninguna carta supera su límite de copias', () => {
        for (const [id, n] of Object.entries(c)) {
          const lim = Number(ALL_CARDS.find((x) => x.id === id)?.limiteCopias ?? 1)
          expect(n, id).toBeLessThanOrEqual(lim)
        }
      })

      it('lleva exactamente las cartas estándar del reparto aprobado', () => {
        const estandar = Object.fromEntries(Object.entries(c).filter(([id]) => id.startsWith('ST-')))
        expect(estandar).toEqual(ESTANDAR_EN_MAZO[mazo.id])
      })

      it('los Campeones estándar son de la facción del mazo', () => {
        for (const id of Object.keys(c).filter((x) => x.startsWith('ST-'))) {
          const meta = getCardMeta(id)
          if (meta?.type === 'Campeón') expect(meta.facciones, id).toContain(mazo.id === 'estasis' ? 'Orden' : mazo.id === 'disonancia' ? 'Caos' : mazo.id === 'purga' ? 'Purga' : 'Mutación')
        }
      })

      it('mete 10 espacios estándar: 1 Vínculo, 2 Éter y 7 de Principal', () => {
        const estandar = Object.entries(c).filter(([id]) => id.startsWith('ST-'))
        const por = (tipo: string) => estandar.filter(([id]) => getCardMeta(id)?.type === tipo).reduce((a, [, n]) => a + n, 0)
        expect(por('Vínculo')).toBe(1)
        expect(por('Éter')).toBe(2)
        expect(por('Campeón') + por('Mística') + por('Arcana')).toBe(7)
      })
    })
  }

  it('Estásis recorta copias de Lamento de las Casas (3→1) y de Isolde (2→1)', () => {
    const c = copias(MAZOS.find((m) => m.id === 'estasis')!.cardIds)
    expect(c['FB-020']).toBe(1)
    expect(c['FB-014']).toBe(1)
    expect(c['FB-027']).toBeUndefined() // sale Refugio de las Casas (su Vínculo de 1 copia)
  })

  it('el tope de copias del diseño no se toca (los mazos personalizados siguen pudiendo llevar 3 Lamento de las Casas)', () => {
    expect(Number(ALL_CARDS.find((x) => x.id === 'FB-020')?.limiteCopias)).toBe(3)
  })
})
