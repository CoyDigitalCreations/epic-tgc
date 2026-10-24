import { describe, expect, it } from 'vitest'
import { trayectoriaDe } from '../useAnimacionCartas'
import type { Medida, Vuelo } from '../useAnimacionCartas'

const medida = (cx: number, cy: number, rot = 0): Medida => ({ cx, cy, ancho: 80, rot, enCelda: true })

function vuelo(estilo: Vuelo['estilo']): Pick<Vuelo, 'origen' | 'destino' | 'duracion' | 'delay' | 'estilo'> {
  return { origen: medida(100, 400), destino: medida(700, 120), duracion: 0.7, delay: 0, estilo }
}

describe('trayectoriaDe', () => {
  it.each(['normal', 'eter', 'destruccion', 'exilio'] as const)(
    '%s: cada propiedad tiene tantos keyframes como "times" (si no, framer-motion falla en silencio)',
    (estilo) => {
      const { animate, transition } = trayectoriaDe(vuelo(estilo))
      for (const [propiedad, valores] of Object.entries(animate)) {
        expect(valores, propiedad).toHaveLength(transition.times.length)
      }
      if (Array.isArray(transition.ease)) expect(transition.ease).toHaveLength(transition.times.length - 1)
    },
  )

  it.each(['normal', 'eter', 'destruccion', 'exilio'] as const)('%s: arranca en el origen y termina en el destino', (estilo) => {
    const { animate } = trayectoriaDe(vuelo(estilo))
    expect(animate.x[0]).toBe(100 - 700)
    expect(animate.y[0]).toBe(400 - 120)
    expect(animate.x.at(-1)).toBe(0)
    expect(animate.y.at(-1)).toBe(0)
  })

  it('destrucción: sacude y destella en el lugar ANTES de caer, con filtro rojo', () => {
    const { animate, transition } = trayectoriaDe(vuelo('destruccion'))
    const i = transition.times.findIndex((t) => t >= 0.4)
    // Todo el tramo inicial (el sacudón) se queda en el origen
    expect(new Set(animate.x.slice(0, i))).toEqual(new Set([100 - 700]))
    expect(new Set(animate.rotate.slice(0, i)).size).toBeGreaterThan(1)
    expect(animate.filter.some((f) => String(f).includes('239,68,68'))).toBe(true)
    // Termina intacta para aterrizar como una carta normal del cementerio
    expect(animate.scale.at(-1)).toBe(1)
    expect(animate.opacity).toBeUndefined()
  })

  it('exilio: gira, se encoge y se desvanece en violeta (distinto de la destrucción)', () => {
    const { animate } = trayectoriaDe(vuelo('exilio'))
    expect(animate.opacity).toEqual([1, 1, 0])
    expect(animate.scale.at(-1)).toBeLessThan(0.3)
    expect(Math.abs(Number(animate.rotate.at(-1)) - Number(animate.rotate[0]))).toBeGreaterThanOrEqual(360)
    expect(animate.filter.some((f) => String(f).includes('168,85,247'))).toBe(true)
    expect(animate.filter.some((f) => String(f).includes('239,68,68'))).toBe(false)
  })

  it('Éter: arco más bajo que una carta normal', () => {
    const alto = (estilo: Vuelo['estilo']) => Math.abs(Number(trayectoriaDe(vuelo(estilo)).animate.y[1]) - (400 - 120) / 2)
    expect(alto('eter')).toBeLessThan(alto('normal'))
  })
})
