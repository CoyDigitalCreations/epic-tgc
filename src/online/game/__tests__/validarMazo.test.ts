// @vitest-environment node
/**
 * F8 — Validación del mazo en el motor (manual §3 y §12): 15 Éter + 45 Principal + 6 Vínculos,
 * límite de copias por carta, Vínculo ×3 como tope y rareza Única ×1. Cartas SINTÉTICAS.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import { registrarCartas } from '../cards'
import { createInitialState, limiteCopiasDe, validarDeck } from '../initialState'

const base = {
  flavorText: '',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  paqueteId: 'test',
}
type Rareza = 'Común' | 'Única'
const campeon = (id: string, limiteCopias?: string, rarity: Rareza = 'Común') => ({
  ...base, id, name: `Campeón ${id}`, type: 'Campeón' as const, keywords: [], efectos: [], rarity,
  ...(limiteCopias !== undefined ? { limiteCopias } : {}),
  facciones: ['Orden' as const], stats: { cost: 1, poder: 2, resistencia: 2 },
})
const eter = (id: string, limiteCopias = '3') => ({ ...base, id, name: id, type: 'Éter' as const, efectos: [], rarity: 'Común' as const, limiteCopias, stats: { cost: 0 } })
const vinculo = (id: string, limiteCopias?: string) => ({
  ...base, id, name: id, type: 'Vínculo' as const, efectos: [], rarity: 'Común' as const,
  ...(limiteCopias !== undefined ? { limiteCopias } : {}), stats: { cost: 0 },
})

const copias = (id: string, n: number) => Array.from({ length: n }, () => id)

/** Un mazo legal: 5 Éter ×3, 15 Campeones ×3, 6 Vínculos distintos ×1. */
function mazoLegal(): string[] {
  return [
    ...[1, 2, 3, 4, 5].flatMap((n) => copias(`V-ETER-${n}`, 3)),
    ...Array.from({ length: 15 }, (_, i) => i + 1).flatMap((n) => copias(`V-CAMP-${n}`, 3)),
    ...[1, 2, 3, 4, 5, 6].map((n) => `V-VINC-${n}`),
  ]
}

beforeAll(() => {
  registrarCartas([
    ...[1, 2, 3, 4, 5].map((n) => eter(`V-ETER-${n}`)),
    ...Array.from({ length: 15 }, (_, i) => campeon(`V-CAMP-${i + 1}`, '3')),
    ...[1, 2, 3, 4, 5, 6].map((n) => vinculo(`V-VINC-${n}`, '1')),
    campeon('V-SIN-LIMITE'), // sin limiteCopias
    campeon('V-X2', '2'),
    campeon('V-UNICA-X3', '3', 'Única'), // Única con limiteCopias mal capturado
    campeon('V-UNICA', '1', 'Única'),
    vinculo('V-VINC-X3', '3'),
    vinculo('V-VINC-X5', '5'), // dato fuera de rango: el tope del manual manda
    campeon('V-LIMITE-RARO', 'abc'),
  ])
})

describe('F8 — limiteCopiasDe', () => {
  it('usa el limiteCopias de la carta', () => {
    expect(limiteCopiasDe('V-CAMP-1')).toBe(3)
    expect(limiteCopiasDe('V-X2')).toBe(2)
  })
  it('sin limiteCopias vale 1 (igual que el editor de mazos)', () => {
    expect(limiteCopiasDe('V-SIN-LIMITE')).toBe(1)
  })
  it('un limiteCopias ilegible vale 1', () => {
    expect(limiteCopiasDe('V-LIMITE-RARO')).toBe(1)
  })
  it('la rareza Única es siempre ×1, aunque limiteCopias diga 3 (§12)', () => {
    expect(limiteCopiasDe('V-UNICA-X3')).toBe(1)
    expect(limiteCopiasDe('V-UNICA')).toBe(1)
  })
  it('un Vínculo nunca pasa de 3 (§3.1)', () => {
    expect(limiteCopiasDe('V-VINC-X3')).toBe(3)
    expect(limiteCopiasDe('V-VINC-X5')).toBe(3)
  })
  it('un cardId desconocido vale 0', () => {
    expect(limiteCopiasDe('NO-EXISTE')).toBe(0)
  })
})

describe('F8 — validarDeck', () => {
  it('un mazo legal pasa (y createInitialState lo acepta)', () => {
    expect(() => validarDeck(mazoLegal(), 'A')).not.toThrow()
    expect(() => createInitialState(mazoLegal(), mazoLegal(), 1)).not.toThrow()
  })

  it('un Campeón por encima de su límite de copias se rechaza, con nombre, cantidad y límite', () => {
    const mazo = mazoLegal()
    mazo[mazo.indexOf('V-CAMP-15')] = 'V-CAMP-1' // V-CAMP-1 pasa a 4 copias, V-CAMP-15 queda en 2
    expect(() => validarDeck(mazo, 'A')).toThrow(/"Campeón V-CAMP-1" \(V-CAMP-1\) lleva 4 copias y su límite es 3/)
  })

  it('un Éter por encima de su límite se rechaza', () => {
    const mazo = mazoLegal()
    mazo[mazo.indexOf('V-ETER-5')] = 'V-ETER-1'
    expect(() => validarDeck(mazo, 'B')).toThrow(/Mazo B inválido: "V-ETER-1" \(V-ETER-1\) lleva 4 copias/)
  })

  it('el límite ×2 se respeta', () => {
    const mazo = mazoLegal()
    // sustituye 3 campeones por 3 copias de V-X2
    for (let i = 0; i < 3; i++) mazo[mazo.indexOf('V-CAMP-15')] = 'V-X2'
    expect(() => validarDeck(mazo, 'A')).toThrow(/lleva 3 copias y su límite es 2/)
  })

  it('una carta sin limiteCopias solo admite 1 copia', () => {
    const mazo = mazoLegal()
    for (let i = 0; i < 2; i++) mazo[mazo.indexOf('V-CAMP-15')] = 'V-SIN-LIMITE'
    expect(() => validarDeck(mazo, 'A')).toThrow(/lleva 2 copias y su límite es 1/)
  })

  it('una Única va una sola vez; con 2 se rechaza aunque limiteCopias diga 3', () => {
    const ok = mazoLegal()
    ok[ok.indexOf('V-CAMP-15')] = 'V-UNICA-X3'
    expect(() => validarDeck(ok, 'A')).not.toThrow()
    const dos = mazoLegal()
    for (let i = 0; i < 2; i++) dos[dos.indexOf('V-CAMP-15')] = 'V-UNICA-X3'
    expect(() => validarDeck(dos, 'A')).toThrow(/lleva 2 copias y su límite es 1/)
  })

  it('Vínculos: hasta 3 copias del mismo Vínculo sí (2 diseños ×3)', () => {
    const mazo = mazoLegal().filter((id) => !id.startsWith('V-VINC-')).concat(copias('V-VINC-X3', 3), ['V-VINC-1', 'V-VINC-2', 'V-VINC-3'])
    expect(() => validarDeck(mazo, 'A')).not.toThrow()
  })

  it('Vínculos: 4 copias del mismo Vínculo se rechazan (tope 3 aunque limiteCopias diga 5)', () => {
    const mazo = mazoLegal().filter((id) => !id.startsWith('V-VINC-')).concat(copias('V-VINC-X5', 4), ['V-VINC-1', 'V-VINC-2'])
    expect(() => validarDeck(mazo, 'A')).toThrow(/lleva 4 copias y su límite es 3/)
  })

  it('un Vínculo con limiteCopias 1 no se repite', () => {
    const mazo = mazoLegal().filter((id) => !id.startsWith('V-VINC-')).concat(copias('V-VINC-1', 2), ['V-VINC-2', 'V-VINC-3', 'V-VINC-4', 'V-VINC-5'])
    expect(() => validarDeck(mazo, 'A')).toThrow(/"V-VINC-1" \(V-VINC-1\) lleva 2 copias y su límite es 1/)
  })

  it('las validaciones anteriores siguen primero: tamaño, distribución y cardId desconocido', () => {
    expect(() => validarDeck(mazoLegal().slice(1), 'A')).toThrow(/65 cartas/)
    const sinVinculos = mazoLegal().filter((id) => !id.startsWith('V-VINC-')).concat(copias('V-CAMP-1', 6))
    expect(() => validarDeck(sinVinculos, 'A')).toThrow(/se esperaban 15\/45\/6/)
    const fantasma = mazoLegal()
    fantasma[fantasma.indexOf('V-CAMP-15')] = 'NO-EXISTE' // cuenta como Principal: la distribución sigue 15/45/6
    expect(() => validarDeck(fantasma, 'A')).toThrow(/cardId desconocido/)
  })
})
