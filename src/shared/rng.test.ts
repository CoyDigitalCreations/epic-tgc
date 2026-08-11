import { describe, it, expect } from 'vitest'
import { hashStr, mulberry32 } from './rng'

const generarSecuencia = (seed: number, n: number): number[] => {
  const rand = mulberry32(seed)
  const secuencia: number[] = []
  for (let i = 0; i < n; i++) secuencia.push(rand())
  return secuencia
}

describe('rng — PRNG determinístico compartido', () => {
  describe('mulberry32', () => {
    it('genera la misma secuencia para el mismo seed (1000 valores)', () => {
      const a = generarSecuencia(42, 1000)
      const b = generarSecuencia(42, 1000)
      expect(a).toEqual(b)
    })

    it('genera una secuencia distinta para un seed distinto', () => {
      const a = generarSecuencia(42, 1000)
      const b = generarSecuencia(43, 1000)
      expect(a).not.toEqual(b)
      // Además, la primera extracción ya difiere
      expect(a[0]).not.toBe(b[0])
    })

    it('devuelve floats en [0, 1)', () => {
      const rand = mulberry32(7)
      for (let i = 0; i < 1000; i++) {
        const v = rand()
        expect(v).toBeGreaterThanOrEqual(0)
        expect(v).toBeLessThan(1)
      }
    })

    it('la secuencia conocida es estable (contrato de reproducibilidad)', () => {
      // Fija la secuencia del seed 1 para detectar cambios accidentales en la implementación
      expect(generarSecuencia(1, 5)).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522, 0.9810509674716741, 0.9683778982143849])
    })
  })

  describe('hashStr (djb2)', () => {
    it('devuelve un uint32 (>>> 0) para cualquier entrada', () => {
      for (const s of ['', 'a', 'test', 'Éter', 'Campeón', 'variante-con-ñandú-✓']) {
        const h = hashStr(s)
        expect(Number.isInteger(h)).toBe(true)
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThanOrEqual(0xffffffff)
      }
    })

    it('es determinístico: misma entrada → mismo hash', () => {
      expect(hashStr('Campeón')).toBe(hashStr('Campeón'))
      expect(hashStr('Éter')).toBe(hashStr('Éter'))
    })

    it('produce valores conocidos (djb2 de referencia)', () => {
      expect(hashStr('test')).toBe(2090756197)
      expect(hashStr('Éter')).toBe(2093826713)
      expect(hashStr('Campeón')).toBe(326471596)
    })
  })
})
