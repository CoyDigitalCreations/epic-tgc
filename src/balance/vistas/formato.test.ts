import { describe, expect, it } from 'vitest'
import { evaluarConImpuesto } from '../presupuesto'
import { carta } from '../test/cartasReales'
import { NOMBRE_MAZO, num, veredictoDe } from './formato'

const ev = (nombre: string) => {
  const e = evaluarConImpuesto(carta(nombre))
  if (e === null) throw new Error('sin evaluación')
  return e
}

describe('formato de las vistas', () => {
  it('num muestra una raya para null y el número en otro caso', () => {
    expect(num(null)).toBe('—')
    expect(num(7.29)).toBe('7.29')
    expect(num(0)).toBe('0')
  })

  it('num redondea a dos decimales para no mostrar ruido de punto flotante', () => {
    expect(num(0.8500000000000001)).toBe('0.85')
    expect(num(8.8)).toBe('8.8')
    expect(num(3)).toBe('3')
  })

  it('nombra los mazos con acento', () => {
    expect(NOMBRE_MAZO.estasis).toBe('Estásis')
    expect(NOMBRE_MAZO.disonancia).toBe('Disonancia')
  })

  it('veredicto en palabras', () => {
    expect(veredictoDe(ev('Elena'))).toBe('Fuera de banda: por debajo')
    expect(veredictoDe(ev('Isolde'))).toBe('Fuera de banda: por encima')
    expect(veredictoDe(ev('Vaela'))).toBe('Dentro de banda')
    expect(veredictoDe(ev('Aurora'))).toBe('Exenta: dentro de su tope propio')
  })
})
