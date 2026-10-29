import { describe, expect, it } from 'vitest'
import { listarMazosNube, planificarSincronizacion, subirMazo } from '../backend/mazosNube'
import type { MazoPersonalizado } from '../useMazosStore'

const mazo = (id: string, nombre = id): MazoPersonalizado => ({ id, nombre, cardIds: ['a'] })

describe('planificarSincronizacion', () => {
  it('los de la nube van primero y los locales que faltan allí se suben', () => {
    const plan = planificarSincronizacion([mazo('l1'), mazo('n1', 'viejo')], [mazo('n1', 'nuevo'), mazo('n2')])
    expect(plan.resultado.map((m) => m.id)).toEqual(['n1', 'n2', 'l1'])
    expect(plan.subir.map((m) => m.id)).toEqual(['l1'])
  })

  it('con el mismo id gana la versión de la nube', () => {
    const plan = planificarSincronizacion([mazo('n1', 'local')], [mazo('n1', 'nube')])
    expect(plan.resultado).toEqual([mazo('n1', 'nube')])
    expect(plan.subir).toEqual([])
  })

  it('sin nada en la nube conserva los locales y los sube todos', () => {
    const plan = planificarSincronizacion([mazo('a'), mazo('b')], [])
    expect(plan.resultado.map((m) => m.id)).toEqual(['a', 'b'])
    expect(plan.subir).toHaveLength(2)
  })
})

describe('sin Supabase configurado', () => {
  it('todo es no-op y no lanza', async () => {
    expect(await subirMazo(mazo('a'))).toBe(false)
    expect(await listarMazosNube()).toBeNull()
  })
})
