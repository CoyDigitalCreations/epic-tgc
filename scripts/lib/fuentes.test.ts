import { describe, it, expect } from 'vitest'
import { canon, derivarCarta, derivarEfectos, idsDuplicados, planArte, sinArte, validarCarta, type Json } from './fuentes'

const campeon = (extra: Json = {}): Json => ({
  id: 'FB-001',
  name: 'Vaela',
  type: 'Campeón',
  paqueteId: 'estasis',
  stats: { cost: 2, poder: 5, resistencia: 3 },
  efectos: [{ tipo: 'pasivo', efecto: 'buff', objetivo: { tipo: 'campeon', controlador: 'propio' } }],
  ...extra,
})

describe('sinArte', () => {
  it('quita imageUrl en data-URI y hasImage', () => {
    const out = sinArte({ id: 'A', imageUrl: 'data:image/webp;base64,AAAA', hasImage: true, name: 'x' })
    expect(out).toEqual({ id: 'A', name: 'x' })
  })

  it('conserva rutas estáticas y no muta la entrada', () => {
    const entrada = { id: 'A', imageUrl: '/cartas/A.webp' }
    const out = sinArte(entrada)
    expect(out).toEqual({ id: 'A', imageUrl: '/cartas/A.webp' })
    expect(out).not.toBe(entrada)
  })
})

describe('canon', () => {
  it('es estable ante el orden de las llaves, también anidadas', () => {
    expect(canon({ b: 1, a: { d: 2, c: 3 } })).toBe(canon({ a: { c: 3, d: 2 }, b: 1 }))
  })

  it('distingue valores distintos y respeta el orden de arreglos', () => {
    expect(canon({ a: 1 })).not.toBe(canon({ a: 2 }))
    expect(canon([1, 2])).not.toBe(canon([2, 1]))
  })

  it('ignora llaves undefined y serializa con formato fijo', () => {
    expect(canon({ a: 1, b: undefined })).toBe('{"a":1}')
    expect(canon([1, 'x', null])).toBe('[1,"x",null]')
  })
})

describe('validarCarta', () => {
  it('una carta correcta no tiene errores', () => {
    const d = validarCarta(campeon(), 0)
    expect(d.cardId).toBe('FB-001')
    expect(d.errores).toEqual([])
  })

  it('una acción desconocida es error', () => {
    const d = validarCarta(campeon({ efectos: [{ tipo: 'pasivo', efecto: 'inventada' }] }), 0)
    expect(d.errores).toEqual(['efectos[0].efecto inválido: "inventada" — no está en EfectoAccion vivo'])
  })

  it('id faltante, nombre vacío y tipo inválido son errores; usa #idx como id', () => {
    const d = validarCarta({ name: ' ', type: 'Otro', stats: {} }, 4)
    expect(d.cardId).toBe('#idx-4')
    expect(d.errores).toContain('id falta o no es string')
    expect(d.errores).toContain('name falta o vacío')
    expect(d.errores.some((e) => e.startsWith('type inválido'))).toBe(true)
  })

  it('un debuff con ATQ negativo es solo aviso', () => {
    const d = validarCarta(
      campeon({ efectos: [{ tipo: 'pasivo', efecto: 'debuff', stats: { ATQ: -2 } }] }),
      0,
    )
    expect(d.errores).toEqual([])
    expect(d.avisos.some((a) => a.includes('debuff con ATQ negativo (-2)'))).toBe(true)
  })

  it('un campo legacy es aviso', () => {
    const d = validarCarta(campeon({ efectoPasivo: {} }), 0)
    expect(d.avisos).toContain('campo legacy "efectoPasivo" presente — el motor lo ignora; preferible limpiarlo')
  })
})

describe('idsDuplicados', () => {
  it('devuelve cada id repetido con su conteo', () => {
    expect(idsDuplicados([{ id: 'A' }, { id: 'B' }, { id: 'A' }, { id: 'A' }, { id: 'B' }, { id: 'C' }])).toEqual([
      ['A', 3],
      ['B', 2],
    ])
  })

  it('ignora cartas sin id y devuelve vacío si no hay repetidos', () => {
    expect(idsDuplicados([{ id: 'A' }, { name: 'sin id' }, { id: '' }])).toEqual([])
  })
})

describe('derivarCarta', () => {
  it('quita el arte y limpia restos de otros efectos (debuff negativo pasa a positivo)', () => {
    const carta = campeon({
      imageUrl: 'data:image/webp;base64,AAAA',
      hasImage: true,
      efectos: [{ tipo: 'pasivo', efecto: 'debuff', stats: { ATQ: -2 }, copyAttributes: ['atq'] }],
    })
    expect(derivarCarta(carta)).toEqual(
      campeon({ efectos: [{ tipo: 'pasivo', efecto: 'debuff', stats: { ATQ: 2 } }] }),
    )
  })
})

describe('derivarEfectos', () => {
  const A = campeon({ id: 'A-1', name: 'A' })
  const B = campeon({ id: 'B-1', name: 'B' })
  const C = campeon({ id: 'C-1', name: 'C' })

  it('S4.1 normaliza: el resultado no lleva imageUrl y pasa la validación', () => {
    const plan = derivarEfectos([{ ...A, imageUrl: 'data:image/webp;base64,AAAA' }], [], { prune: false })
    expect(plan.errores).toEqual([])
    expect(plan.resultado).toEqual([A])
    expect(plan.nuevos).toEqual(['A-1'])
  })

  it('S4.2 prune deja exactamente los ids del export', () => {
    const plan = derivarEfectos([A, B], [C, A], { prune: true })
    expect(plan.resultado?.map((c) => c.id)).toEqual(['A-1', 'B-1'])
    expect(plan.soloMotor).toEqual(['C-1'])
    expect(plan.nuevos).toEqual(['B-1'])
  })

  it('sin prune conserva las del motor, respeta su orden y agrega las nuevas al final', () => {
    const Anueva = { ...A, name: 'A2' }
    const plan = derivarEfectos([B, Anueva], [C, A], { prune: false })
    expect(plan.resultado?.map((c) => c.id)).toEqual(['C-1', 'A-1', 'B-1'])
    expect(plan.resultado?.[1]).toEqual(Anueva)
    expect(plan.actualizados).toEqual(['A-1'])
    expect(plan.nuevos).toEqual(['B-1'])
    expect(plan.soloMotor).toEqual(['C-1'])
  })

  it('S4.3 es idempotente: repetir con el resultado no produce nuevos ni actualizados', () => {
    const primera = derivarEfectos([A, B], [], { prune: true })
    const segunda = derivarEfectos([A, B], primera.resultado!, { prune: true })
    expect(segunda.nuevos).toEqual([])
    expect(segunda.actualizados).toEqual([])
    expect(segunda.sinCambios).toEqual(['A-1', 'B-1'])
    expect(segunda.resultado).toEqual(primera.resultado)
  })

  it('S4.4 una acción desconocida da error y NO hay resultado', () => {
    const mala = campeon({ id: 'M-1', efectos: [{ tipo: 'pasivo', efecto: 'inventada' }] })
    const plan = derivarEfectos([A, mala], [], { prune: false })
    expect(plan.errores.map((d) => d.cardId)).toEqual(['M-1'])
    expect(plan.resultado).toBeNull()
  })

  it('ids duplicados en el export también bloquean', () => {
    const plan = derivarEfectos([A, A], [], { prune: false })
    expect(plan.duplicados).toEqual([['A-1', 2]])
    expect(plan.resultado).toBeNull()
  })

  it('los avisos se reportan sin bloquear', () => {
    const plan = derivarEfectos([campeon({ id: 'W-1', efectoPasivo: {} })], [], { prune: false })
    expect(plan.avisos.map((d) => d.cardId)).toEqual(['W-1'])
    expect(plan.resultado).toHaveLength(1)
  })
})

describe('planArte', () => {
  const dataUrl = (tipo: string, texto: string) => `data:image/${tipo};base64,${Buffer.from(texto).toString('base64')}`
  const conArte = (id: string, url?: string): Json => campeon({ id, ...(url ? { imageUrl: url } : {}) })

  it('S4.5 data-URI webp: escribe {id}.webp con los bytes decodificados', () => {
    const plan = planArte([conArte('A-1', dataUrl('webp', 'hola'))], new Map(), { prune: false })
    expect(plan.errores).toEqual([])
    expect(plan.escribir).toHaveLength(1)
    expect(plan.escribir[0].id).toBe('A-1')
    expect(plan.escribir[0].archivo).toBe('A-1.webp')
    expect(plan.escribir[0].bytes.toString()).toBe('hola')
  })

  it('S4.5 sin imageUrl: aviso (sinImagen) y ningún archivo', () => {
    const plan = planArte([conArte('A-1'), conArte('B-1', '/cartas/B-1.webp')], new Map(), { prune: false })
    expect(plan.sinImagen).toEqual(['A-1', 'B-1'])
    expect(plan.escribir).toEqual([])
    expect(plan.errores).toEqual([])
  })

  it('un arte que no es webp es error', () => {
    const plan = planArte([conArte('A-1', dataUrl('png', 'x'))], new Map(), { prune: false })
    expect(plan.errores).toEqual(['A-1: el arte es png y debe ser webp (cardArtPath apunta a {id}.webp)'])
    expect(plan.escribir).toEqual([])
  })

  it('un data-URI que no es base64 de imagen es error', () => {
    const plan = planArte([conArte('A-1', 'data:text/plain;base64,AAAA')], new Map(), { prune: false })
    expect(plan.errores).toEqual(['A-1: formato dataURL no reconocido'])
  })

  it('igual a la existente: iguales; distinta: escribir', () => {
    const existentes = new Map([
      ['A-1.webp', Buffer.from('hola')],
      ['B-1.webp', Buffer.from('viejo')],
    ])
    const plan = planArte(
      [conArte('A-1', dataUrl('webp', 'hola')), conArte('B-1', dataUrl('webp', 'nuevo'))],
      existentes,
      { prune: false },
    )
    expect(plan.iguales).toEqual(['A-1'])
    expect(plan.escribir.map((e) => e.id)).toEqual(['B-1'])
  })

  it('obsoletos: se detectan siempre pero solo se eliminan con prune', () => {
    const existentes = new Map([
      ['A-1.webp', Buffer.from('hola')],
      ['Z-9.webp', Buffer.from('z')],
      ['Y-8.png', Buffer.from('y')],
      ['LEEME.txt', Buffer.from('no es arte')],
    ])
    const cartas = [conArte('A-1', dataUrl('webp', 'hola'))]
    expect(planArte(cartas, existentes, { prune: false })).toMatchObject({ obsoletos: ['Z-9.webp', 'Y-8.png'], eliminar: [] })
    expect(planArte(cartas, existentes, { prune: true }).eliminar).toEqual(['Z-9.webp', 'Y-8.png'])
  })
})
