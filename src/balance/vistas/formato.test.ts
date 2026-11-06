import { describe, expect, it } from 'vitest'
import { evaluarConImpuesto } from '../presupuesto'
import { carta, legado, legadoDS } from '../test/cartasReales'
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
    // Elena real (4/2, suma 6) está dentro; la de antes (3/2, suma 5) conserva el caso «por debajo».
    expect(veredictoDe(ev('Elena'))).toBe('Dentro de banda')
    const elenaAntes = evaluarConImpuesto(legado('Elena 3/2'))
    if (elenaAntes === null) throw new Error('sin evaluación')
    expect(veredictoDe(elenaAntes)).toBe('Fuera de banda: por debajo')
    // Rediseño de Estásis: Isolde y Vaela ya caben en su banda; «por encima» lo ilustra Kael (DS-011, coste 2, 5/3).
    // Isolde pasa a «por encima» con el tope de costo del 50 % (índice 4.75, impuesto 1.4); Vaela sigue dentro.
    expect(veredictoDe(ev('Isolde'))).toBe('Fuera de banda: por encima')
    expect(veredictoDe(ev('Vaela'))).toBe('Dentro de banda')
    // «Por encima» lo ilustraba Kael 5/3; con el rediseño de Disonancia (Lote 2) Kael es 4/2 y cabe: el caso usa la Kael de antes
    const kaelAntes = evaluarConImpuesto(legadoDS('Kael'))
    if (kaelAntes === null) throw new Error('sin evaluación')
    expect(veredictoDe(kaelAntes)).toBe('Fuera de banda: por encima')
    expect(veredictoDe(ev('Kael'))).toBe('Dentro de banda')
    expect(veredictoDe(ev('Seraphina'))).toBe('Dentro de banda')
    expect(veredictoDe(ev('Aurora'))).toBe('Exenta: dentro de su tope propio')
  })
})
