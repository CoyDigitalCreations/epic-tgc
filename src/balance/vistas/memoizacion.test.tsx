import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { CARTAS } from '../test/cartasReales'
import { Auditoria } from './Auditoria'
import { Comparador } from './Comparador'
import { MatrizLetalidad } from './MatrizLetalidad'

// Espías transparentes: llaman a la implementación real y cuentan las invocaciones.
vi.mock('../ajuste', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('../ajuste')>()
  return { ...real, simularAjustes: vi.fn(real.simularAjustes) }
})
vi.mock('../letalidad', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('../letalidad')>()
  return {
    ...real,
    poolLetalidad: vi.fn(real.poolLetalidad),
    matrizLetalidad: vi.fn(real.matrizLetalidad),
    umbralesPorStat: vi.fn(real.umbralesPorStat),
  }
})
vi.mock('../metricas', async (importarOriginal) => {
  const real = await importarOriginal<typeof import('../metricas')>()
  return { ...real, evaluarCarta: vi.fn(real.evaluarCarta) }
})

import { simularAjustes } from '../ajuste'
import { matrizLetalidad, poolLetalidad, umbralesPorStat } from '../letalidad'
import { evaluarCarta } from '../metricas'

describe('los cálculos puros de las vistas no se repiten si las props no cambian', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('Comparador simula los ajustes una sola vez al volver a renderizar con las mismas props', () => {
    const { rerender } = render(<Comparador cartas={CARTAS} publicadas={CARTAS} ancho={600} alto={300} />)
    expect(simularAjustes).toHaveBeenCalledTimes(1)
    rerender(<Comparador cartas={CARTAS} publicadas={CARTAS} ancho={600} alto={300} />)
    expect(simularAjustes).toHaveBeenCalledTimes(1)
  })

  it('Comparador sí recalcula cuando cambian las cartas publicadas', () => {
    const { rerender } = render(<Comparador cartas={CARTAS} publicadas={CARTAS} ancho={600} alto={300} />)
    const menos = CARTAS.slice(0, -1)
    rerender(<Comparador cartas={CARTAS} publicadas={menos} ancho={600} alto={300} />)
    expect(simularAjustes).toHaveBeenCalledTimes(2)
  })

  it('MatrizLetalidad arma el pool, la matriz y los escalones una sola vez', () => {
    const { rerender } = render(<MatrizLetalidad cartas={CARTAS} publicadas={CARTAS} />)
    rerender(<MatrizLetalidad cartas={CARTAS} publicadas={CARTAS} />)
    expect(poolLetalidad).toHaveBeenCalledTimes(1)
    expect(matrizLetalidad).toHaveBeenCalledTimes(1)
    expect(umbralesPorStat).toHaveBeenCalledTimes(1)
  })

  it('Auditoría evalúa cada carta una sola vez al volver a renderizar con las mismas props', () => {
    const { rerender } = render(<Auditoria cartas={CARTAS} publicadas={CARTAS} avisos={[]} />)
    const primera = vi.mocked(evaluarCarta).mock.calls.length
    expect(primera).toBe(CARTAS.length)
    rerender(<Auditoria cartas={CARTAS} publicadas={CARTAS} avisos={[]} />)
    expect(evaluarCarta).toHaveBeenCalledTimes(primera)
  })
})
