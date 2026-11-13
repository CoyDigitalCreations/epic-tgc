import { describe, it, expect } from 'vitest'
import { ALL_CARDS } from './test/seedClasico'
import type { Ajuste } from './ajuste'
import { simularAjustes } from './ajuste'
import { cargarCartas } from './cargador'
import { CONFIG_V1 } from './config'
import { CARTAS_DS_ANTES } from './test/cartasReales'
import { aExportacion, aJson } from './exportacion'

const { cartas } = cargarCartas(ALL_CARDS)
const { ajustes } = simularAjustes(cartas)
// Disonancia de ANTES del rediseño (Lote 2): Draven 4/4 de coste 2 sobre el máximo; hoy (3/3) ya cabe en banda
const { ajustes: ajustesDS } = simularAjustes(CARTAS_DS_ANTES)

const ajusteSintetico = (id: string, antes: [number, number], despues: [number, number]): Ajuste => ({
  id,
  nombre: id,
  antes: { poder: antes[0], resistencia: antes[1] },
  despues: { poder: despues[0], resistencia: despues[1] },
  motivo: 'Prueba.',
  fueraDeIdentidad: [],
  superaTecho: false,
  avisos: [],
  letalidadAntes: null,
  letalidadDespues: null,
  letalidadDespuesTodos: null,
})

describe('exportación JSON', () => {
  // Isolde (ahora 3/6 coste 4) ya no se ajusta; el caso lo tomó Draven (DS-012, 4/4 coste 2 sobre el máximo) y con el rediseño de
  // Disonancia (3/3) tampoco: se conserva con la Draven de antes (CARTAS_DS_ANTES), con las mismas aserciones.
  it('S3.1: Draven sale con id, antes, después y motivo en español', () => {
    const cambio = aExportacion(ajustesDS).cambios.find((c) => c.id === 'DS-012')
    expect(cambio?.antes).toEqual({ poder: 4, resistencia: 4 })
    expect(cambio?.despues.poder).toBeLessThan(10)
    expect(cambio?.motivo).toMatch(/suma/)
  })

  it('lleva la versión de la config y solo los campos del contrato', () => {
    const e = aExportacion(ajustes)
    expect(e.version).toBe(CONFIG_V1.version)
    expect(Object.keys(e)).toEqual(['version', 'cambios'])
    expect(Object.keys(e.cambios[0])).toEqual(['id', 'antes', 'despues', 'motivo'])
    expect(Object.keys(e.cambios[0].antes)).toEqual(['poder', 'resistencia'])
  })

  it('ordena por id con localeCompare en español', () => {
    const e = aExportacion([ajusteSintetico('FB-020', [1, 1], [2, 2]), ajusteSintetico('DS-011', [1, 1], [2, 2]), ajusteSintetico('FB-003', [1, 1], [2, 2])])
    expect(e.cambios.map((c) => c.id)).toEqual(['DS-011', 'FB-003', 'FB-020'])
  })

  it('S1.3: lo que no cambia no aparece', () => {
    const e = aExportacion([ajusteSintetico('A', [4, 4], [4, 4]), ajusteSintetico('B', [1, 1], [2, 2])])
    expect(e.cambios.map((c) => c.id)).toEqual(['B'])
  })

  it('S3.2: dos exportaciones seguidas son idénticas byte a byte y sin fechas', () => {
    const a = aJson(ajustes)
    expect(aJson(simularAjustes(cartas).ajustes)).toBe(a)
    expect(a).not.toMatch(/\d{4}-\d{2}-\d{2}/)
  })

  it('serializa con sangría de dos espacios y es JSON válido', () => {
    const texto = aJson(ajustes)
    expect(texto.startsWith('{\n  "version": "v1",\n  "cambios": [')).toBe(true)
    expect(JSON.parse(texto)).toEqual(aExportacion(ajustes))
  })

  it('sin ajustes exporta una lista vacía', () => {
    expect(aExportacion([]).cambios).toEqual([])
  })

  it('no incluye letalidad ni avisos internos', () => {
    expect(aJson(ajustes)).not.toMatch(/letalidad|fueraDeIdentidad|superaTecho/)
  })
})
