/**
 * Textos golden de los efectos nuevos del Card-Maker (Aurora, Mira, Seraphina, Isolde, Rowena, Vaela, Último Refugio...).
 * Regla de oro: el texto sale SIEMPRE del generador a partir de campos; aquí se fija el texto exacto.
 */
import { describe, it, expect } from 'vitest'
import { generateEffectText } from '../EffectList'
import type { EfectoData } from '../../../../shared/types/cards'

const campeonPropio = { tipo: 'campeon', controlador: 'propio', zona: 'campo' } as const

describe('A) «Una vez por turno» genérico con coste', () => {
  const mira: EfectoData = {
    tipo: 'disparo',
    efecto: 'return_ether',
    costo: { tipo: 'eter', cantidad: 1 },
    activacion: 'una_por_turno',
    cantidad: 2,
    esHasta: true,
    objetivo: { tipo: 'eter', controlador: 'propio', zona: 'pagado', zonaDestino: 'reserva', controladorDestino: 'propio' },
  }

  it('Mira', () => {
    expect(generateEffectText(mira)).toBe('Puedes pagar 1 Éter, una vez por turno, devuelve hasta 2 Éter de tu zona de pago a tu Reserva.')
  })

  it('sin la marca el texto no cambia', () => {
    expect(generateEffectText({ ...mira, activacion: undefined })).toBe('Puedes pagar 1 Éter, devuelve hasta 2 Éter de tu zona de pago a tu Reserva.')
  })

  it('con el coste Agotar también lo dice tras la cláusula del coste', () => {
    const t = generateEffectText({ ...mira, costo: { tipo: 'exhaust' } })
    expect(t).toBe('Puedes agotar esta carta, una vez por turno, devuelve hasta 2 Éter de tu zona de pago a tu Reserva.')
  })
})

describe('B) Duraciones «mientras ese Éter esté bloqueado» vs «mientras tenga Éter bloqueado»', () => {
  const base: EfectoData = {
    tipo: 'continuo',
    efecto: 'steal_champion',
    objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
    costo: { tipo: 'bloqueo_fijo', cantidad: 4 },
  }

  it('conviven con textos distintos', () => {
    expect(generateEffectText({ ...base, duracion: 'mientras_ester_bloqueado' })).toContain('mientras ese Éter esté bloqueado')
    const nueva = generateEffectText({ ...base, duracion: 'mientras_tenga_eter_bloqueado' })
    expect(nueva).toContain('mientras tenga Éter bloqueado')
    expect(nueva).not.toContain('ese Éter')
  })
})

describe('C) Reagrupar con alcance', () => {
  const aurora: EfectoData = {
    tipo: 'continuo',
    efecto: 'steal_champion',
    objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
    duracion: 'mientras_ester_bloqueado',
    costo: { tipo: 'bloqueo_fijo', cantidad: 4 },
    activacion: 'una_por_turno',
    reagrupar: { fase: 'alba', turno: 'propio' },
  }
  const textoViejo = 'Una vez por turno, bloquea 4 Éter, toma control de 1 Campeón que controla el rival, mientras ese Éter esté bloqueado. Al inicio de tu Alba reagrupa el Éter usado por este efecto.'

  it('sin alcance (por defecto) el texto es el de siempre', () => {
    expect(generateEffectText(aurora)).toBe(textoViejo)
  })

  it('alcance «efecto» explícito = el de siempre', () => {
    expect(generateEffectText({ ...aurora, reagrupar: { fase: 'alba', turno: 'propio', alcance: 'efecto' } })).toBe(textoViejo)
  })

  it('alcance «todo»', () => {
    const t = generateEffectText({ ...aurora, reagrupar: { fase: 'alba', turno: 'propio', alcance: 'todo' } })
    expect(t.endsWith('. Al inicio de tu Alba reagrupa todo el Éter bloqueado en esta carta.')).toBe(true)
  })
})

describe('J) Cantidad explícita sin artículo duplicado ("1 Campeón", no "1 un Campeón")', () => {
  const rival = { tipo: 'campeon', controlador: 'rival', zona: 'campo' } as const
  const cem = { tipo: 'campeon', controlador: 'propio', zona: 'cementerio' } as const
  it.each([
    ['recuperar_mano', 'Devuelve a la mano de su dueño 1 Campeón que controla el rival.', rival],
    ['recuperar_mazo', 'Devuelve al mazo de su dueño 1 Campeón que controla el rival.', rival],
    ['recuperar_exilio', 'Devuelve del Exilio 1 Campeón que controla el rival.', rival],
    ['steal_champion', 'Toma control de 1 Campeón que controla el rival.', rival],
  ] as const)('%s', (efecto, esperado, objetivo) => {
    expect(generateEffectText({ tipo: 'hechizo', efecto, objetivo })).toBe(esperado)
  })

  it('con Mística no queda «1 una»', () => {
    const t = generateEffectText({ tipo: 'hechizo', efecto: 'recuperar_mano', objetivo: { tipo: 'mistica', controlador: 'propio', zona: 'cementerio' } })
    expect(t).not.toMatch(/1 una? /)
  })

  it('return_hand desde el Cementerio', () => {
    expect(generateEffectText({ tipo: 'hechizo', efecto: 'return_hand', objetivo: cem })).not.toMatch(/1 una? /)
  })
})

describe('D) activar_disparo (Aurora)', () => {
  const aurora: EfectoData = {
    tipo: 'disparo',
    efecto: 'activar_disparo',
    costo: { tipo: 'eter', cantidad: 2 },
    activacion: 'una_por_turno',
    objetivo: { ...campeonPropio, excluyeEsta: true },
    sinPagarCosto: true,
    sinAgotar: true,
  }

  it('sin pagar su costo ni agotarlo', () => {
    expect(generateEffectText(aurora)).toBe('Puedes pagar 2 Éter, una vez por turno, activa un efecto Disparo de otro Campeón que controles sin pagar su costo ni agotarlo.')
  })

  it('solo sinAgotar', () => {
    expect(generateEffectText({ ...aurora, sinPagarCosto: undefined })).toBe('Puedes pagar 2 Éter, una vez por turno, activa un efecto Disparo de otro Campeón que controles sin agotarlo.')
  })

  it('solo sinPagarCosto', () => {
    expect(generateEffectText({ ...aurora, sinAgotar: undefined })).toBe('Puedes pagar 2 Éter, una vez por turno, activa un efecto Disparo de otro Campeón que controles sin pagar su costo.')
  })

  it('sin opciones', () => {
    expect(generateEffectText({ ...aurora, sinAgotar: undefined, sinPagarCosto: undefined })).toBe('Puedes pagar 2 Éter, una vez por turno, activa un efecto Disparo de otro Campeón que controles.')
  })
})

describe('E) anclar_eter', () => {
  it('Mística con Presteza: hasta N Éter de la zona de pago del rival', () => {
    const t = generateEffectText({
      tipo: 'hechizo',
      efecto: 'anclar_eter',
      cantidad: 2,
      objetivo: { tipo: 'eter', controlador: 'rival', zona: 'pagado' },
      duracion: 'hasta_fase',
      duracionFase: 'alba',
      duracionControlador: 'rival',
    })
    expect(t).toBe('Selecciona hasta 2 Éter que controla el rival en su zona de pago, estos no se reagrupan en su próxima Alba.')
  })
})

describe('F) modificar_regla con reglas enumeradas (Comandante / Continuo de Aurora)', () => {
  it('disparo_sin_agotar con «una vez por turno»', () => {
    const t = generateEffectText({ tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar', activacion: 'una_por_turno' })
    expect(t).toBe('Una vez por turno por Campeón, el efecto Disparo no agota.')
  })

  it('disparo_sin_agotar sin la marca', () => {
    const t = generateEffectText({ tipo: 'comandante', efecto: 'modificar_regla', reglaEnumerada: 'disparo_sin_agotar' })
    expect(t).toBe('El efecto Disparo no agota.')
  })

  const tributo: EfectoData = {
    tipo: 'continuo',
    efecto: 'modificar_regla',
    costo: { tipo: 'bloqueo_fijo', cantidad: 3 },
    activacion: 'una_por_turno',
    reglaEnumerada: 'coste_campeones_rival_mas',
    reglaValor: 1,
    duracion: 'mientras_tenga_eter_bloqueado',
    reagrupar: { fase: 'alba', turno: 'propio', alcance: 'todo' },
  }

  it('Tributo del Reino (Continuo de Aurora)', () => {
    expect(generateEffectText(tributo)).toBe(
      'Una vez por turno, bloquea 3 Éter, los Campeones del rival cuestan 1 Éter más, mientras tenga Éter bloqueado. Al inicio de tu Alba reagrupa todo el Éter bloqueado en esta carta.',
    )
  })

  it('con 2: «2 Éter más»', () => {
    expect(generateEffectText({ ...tributo, reglaValor: 2 })).toContain('los Campeones del rival cuestan 2 Éter más')
  })

  it('retrocompatibilidad: duración «ese Éter» + alcance «efecto» = mismo texto, con punto antes de «Al inicio» (puntuación unificada)', () => {
    const t = generateEffectText({ ...tributo, duracion: 'mientras_ester_bloqueado', reagrupar: { fase: 'alba', turno: 'propio', alcance: 'efecto' } })
    expect(t).toBe('Una vez por turno, bloquea 3 Éter, los Campeones del rival cuestan 1 Éter más, mientras ese Éter esté bloqueado. Al inicio de tu Alba reagrupa el Éter usado por este efecto.')
  })

  it('la regla del catálogo (REGLAS) sigue igual', () => {
    const t = generateEffectText({ tipo: 'pasivo', efecto: 'modificar_regla', objetivo: { tipo: 'self', controlador: 'propio', zona: 'campo' }, regla: { id: 'limiteMano', operacion: 'sumar', valor: 2 } })
    expect(t).toBe('Límite de mano +2.')
  })
})

describe('G) Texto del Comandante implícito', () => {
  const comandante = (stats: { ATQ?: number; RES?: number }, efecto: 'buff' | 'debuff' = 'buff'): EfectoData => ({
    tipo: 'comandante',
    efecto,
    stats,
    objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' },
  })

  it('+2 ATQ y +2 RES', () => {
    expect(generateEffectText(comandante({ ATQ: 2, RES: 2 }))).toBe('Incremento de 2 de ATQ y 2 de RES.')
  })

  it('solo ATQ', () => {
    expect(generateEffectText(comandante({ ATQ: 3 }))).toBe('Incremento de 3 de ATQ.')
  })

  it('solo RES', () => {
    expect(generateEffectText(comandante({ RES: 1 }))).toBe('Incremento de 1 de RES.')
  })

  it('debuff: «Reducción de…»', () => {
    expect(generateEffectText(comandante({ ATQ: 1, RES: 1 }, 'debuff'))).toBe('Reducción de 1 de ATQ y 1 de RES.')
  })

  it('sin objetivo (la UI lo oculta en un Comandante) sale igual', () => {
    expect(generateEffectText({ tipo: 'comandante', efecto: 'buff', stats: { ATQ: 2, RES: 2 } })).toBe('Incremento de 2 de ATQ y 2 de RES.')
  })

  it('keyword: «Ganan Indestructible.»', () => {
    expect(generateEffectText({ tipo: 'comandante', efecto: 'grant_keyword', keyword: 'Indestructible', objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' } })).toBe('Ganan Indestructible.')
  })

  it('un pasivo con el mismo contenido conserva «Todos tus Campeones ganan…»', () => {
    expect(generateEffectText({ ...comandante({ ATQ: 2, RES: 2 }), tipo: 'pasivo' })).toBe('Todos tus Campeones ganan 2 de ATQ y 2 de RES.')
  })
})

describe('H) Trigger «cuando un Campeón sea enviado al Cementerio» (Memoria del Reino)', () => {
  const memoria: EfectoData = {
    tipo: 'hechizo',
    trigger: 'cuando_campeon_propio_al_cementerio',
    costo: { tipo: 'bloqueo_fijo', cantidad: 2 },
    activacion: 'una_por_turno',
    efecto: 'recuperar_mano',
    objetivo: { tipo: 'campeon_del_trigger', controlador: 'propio', zona: 'cementerio' },
  }

  it('propio', () => {
    expect(generateEffectText(memoria)).toBe('Una vez por turno, cuando un Campeón que controles sea enviado al Cementerio, bloquea 2 Éter, devuélvelo a tu mano.')
  })

  it('variante rival', () => {
    expect(generateEffectText({ ...memoria, controladorTrigger: 'rival' })).toBe('Una vez por turno, cuando un Campeón del rival sea enviado al Cementerio, bloquea 2 Éter, devuélvelo a tu mano.')
  })

  it('sin «una vez por turno»', () => {
    expect(generateEffectText({ ...memoria, activacion: undefined })).toBe('Cuando un Campeón que controles sea enviado al Cementerio, bloquea 2 Éter, devuélvelo a tu mano.')
  })

  it('Reino Perdido (Lote 3): vuelve a la mano de su DUEÑO y reagrupa en el Alba propia', () => {
    const reino: EfectoData = {
      ...memoria,
      objetivo: { ...memoria.objetivo!, controladorDestino: 'dueno' },
      reagrupar: { fase: 'alba', turno: 'propio' },
    }
    expect(generateEffectText(reino)).toBe('Una vez por turno, cuando un Campeón que controles sea enviado al Cementerio, bloquea 2 Éter, devuélvelo a la mano de su dueño. Al inicio de tu Alba reagrupa el Éter usado por este efecto.')
  })

  it('con otro verbo el objetivo se dice «ese Campeón»', () => {
    expect(generateEffectText({ ...memoria, efecto: 'exile', cantidad: 1, activacion: undefined })).toContain('exilia 1 ese Campeón')
  })
})

describe('I) Textos adicionales (golden)', () => {
  it('Seraphina', () => {
    const t = generateEffectText({ tipo: 'disparo', efecto: 'toggle_exhaust', costo: { tipo: 'eter', cantidad: 1 }, cantidad: 1, objetivo: campeonPropio })
    expect(t).toBe('Puedes pagar 1 Éter, cambia el agotamiento de 1 Campeón que controles.')
  })

  it('toggle_exhaust sin cantidad conserva «un Campeón» (texto de siempre)', () => {
    const t = generateEffectText({ tipo: 'disparo', efecto: 'toggle_exhaust', costo: { tipo: 'eter', cantidad: 3 }, objetivo: campeonPropio })
    expect(t).toBe('Puedes pagar 3 Éter, cambia el agotamiento de un Campeón que controles.')
  })

  it('Isolde', () => {
    const t = generateEffectText({ tipo: 'disparo', efecto: 'grant_keyword', keyword: 'Inmortal', costo: { tipo: 'eter', cantidad: 2 }, cantidad: 1, objetivo: campeonPropio, duracion: 'turno' })
    expect(t).toBe('Puedes pagar 2 Éter, 1 Campeón que controles gana Inmortal, hasta el final del turno.')
  })

  it('Último Refugio', () => {
    const t = generateEffectText({
      tipo: 'hechizo',
      efecto: 'toggle_exhaust',
      objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo', filtros: { agotado: true } },
    })
    expect(t).toBe('Cambia el agotamiento de todos tus Campeones agotados.')
  })

  it('Vaela (obligatorio: sin «puedes»)', () => {
    const t = generateEffectText({
      tipo: 'pasivo',
      trigger: 'al_matar_en_combate',
      efecto: 'return_ether',
      obligatorio: true,
      cantidad: 1,
      objetivo: { tipo: 'eter', controlador: 'propio', zona: 'pagado', zonaDestino: 'reserva', controladorDestino: 'propio' },
    })
    expect(t).toBe('Al matar en combate, devuelve 1 Éter de tu zona de pago a tu Reserva.')
  })

  it('Vaela sin el flag conserva «puedes» (texto de siempre)', () => {
    const t = generateEffectText({
      tipo: 'pasivo',
      trigger: 'al_matar_en_combate',
      efecto: 'return_ether',
      cantidad: 1,
      objetivo: { tipo: 'eter', controlador: 'propio', zona: 'pagado', zonaDestino: 'reserva', controladorDestino: 'propio' },
    })
    expect(t).toBe('Al matar en combate, puedes devolver 1 Éter de tu zona de pago a tu Reserva.')
  })

  it('Rowena', () => {
    const t = generateEffectText({
      tipo: 'disparo',
      efecto: 'recuperar_campo',
      costo: { tipo: 'eter', cantidad: 4 },
      activacion: 'una_por_turno',
      cantidad: 1,
      objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'cementerio', filtros: { costeMax: 3 } },
    })
    expect(t).toBe('Puedes pagar 4 Éter, una vez por turno, invoca 1 Campeón de coste 3 o menos de tu Cementerio.')
  })

  it('Éter de pago: Tirador hasta el final del turno', () => {
    const t = generateEffectText({ tipo: 'pago', efecto: 'grant_keyword', keyword: 'Tirador', objetivo: campeonPropio, duracion: 'turno' })
    expect(t).toBe('Un Campeón que controles gana Tirador, hasta el final del turno.')
  })

  it('Éter de pago: Carga hasta el final del turno', () => {
    const t = generateEffectText({ tipo: 'pago', efecto: 'grant_keyword', keyword: 'Carga', objetivo: campeonPropio, duracion: 'turno' })
    expect(t).toBe('Un Campeón que controles gana Carga, hasta el final del turno.')
  })

  it('scry sin opcionFondo conserva el texto de siempre', () => {
    const t = generateEffectText({ tipo: 'pago', efecto: 'scry', cantidad: 1, objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' } })
    expect(t).toBe('Mira 1 carta de tu mazo.')
  })

  it('Éter de pago: scry de 1 carta con opción de enviarla al fondo', () => {
    const t = generateEffectText({
      tipo: 'pago',
      efecto: 'scry',
      cantidad: 1,
      opcionFondo: true,
      objetivo: { tipo: 'carta', controlador: 'propio', zona: 'mazo' },
    })
    expect(t).toBe('Mira la carta superior de tu mazo y puedes enviarla al fondo.')
  })
})
