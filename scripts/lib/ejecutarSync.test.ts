import { describe, it, expect } from 'vitest'
import { Buffer } from 'node:buffer'
import { ejecutarSync, type IoSync, type OpcionesSync } from './ejecutarSync'
import type { Json } from './fuentes'

const OPTS: OpcionesSync = {
  rutaArte: '/seed/FuenteArte.json',
  rutaEfectos: '/seed/FuenteEfectos.json',
  dirCartas: '/public/cartas',
  dryRun: false,
  prune: false,
}

const webp = (texto: string) => `data:image/webp;base64,${Buffer.from(texto).toString('base64')}`

const carta = (id: string, extra: Json = {}): Json => ({
  id,
  name: `Carta ${id}`,
  type: 'Campeón',
  paqueteId: 'estasis',
  stats: { cost: 2, poder: 5, resistencia: 3 },
  efectos: [{ tipo: 'pasivo', efecto: 'buff', objetivo: { tipo: 'campeon', controlador: 'propio' } }],
  ...extra,
})

/** fs simulado en memoria: registra escrituras y borrados. */
function crearIo(archivos: Record<string, string | Buffer>) {
  const fs = new Map<string, string | Buffer>(Object.entries(archivos))
  const logs: string[] = []
  const errores: string[] = []
  const escrituras: string[] = []
  const borrados: string[] = []
  const io: IoSync = {
    existe: (r) => fs.has(r),
    leerTexto: (r) => {
      const v = fs.get(r)
      if (v === undefined) throw new Error(`ENOENT ${r}`)
      return v.toString()
    },
    listar: (dir) => [...fs.keys()].filter((k) => k.startsWith(`${dir}/`)).map((k) => k.slice(dir.length + 1)),
    leerBytes: (r) => Buffer.from(fs.get(r) as Buffer),
    escribirAtomico: (r, c) => {
      fs.set(r, c)
      escrituras.push(r)
    },
    borrar: (r) => {
      fs.delete(r)
      borrados.push(r)
    },
    log: (m) => logs.push(m),
    error: (m) => errores.push(m),
  }
  return { io, fs, logs, errores, escrituras, borrados }
}

const arteDe = (cartas: Json[]) => JSON.stringify(cartas)

describe('ejecutarSync', () => {
  const A = carta('A-1', { imageUrl: webp('arte-a') })
  const B = carta('B-1', { imageUrl: webp('arte-b') })

  it('S5.1 --dry-run lista los cambios y no escribe nada', () => {
    const sim = crearIo({
      [OPTS.rutaArte]: arteDe([A, B]),
      [OPTS.rutaEfectos]: JSON.stringify([]),
    })
    const r = ejecutarSync({ ...OPTS, dryRun: true }, sim.io)
    expect(r.codigo).toBe(0)
    expect(r.escrituras).toBe(0)
    expect(sim.escrituras).toEqual([])
    expect(sim.borrados).toEqual([])
    // 2 cartas nuevas + 2 ilustraciones nuevas + el JSON se reescribiría
    expect(r.cambios).toBe(5)
    const salida = sim.logs.join('\n')
    expect(salida).toContain('Nuevas en motor:     2 → A-1, B-1')
    expect(salida).toContain('Ilustraciones por escribir: 2 → A-1.webp, B-1.webp')
    expect(salida).toContain('DRY-RUN: no se escribió nada')
  })

  it('S5.2 sin FuenteArte.json sale con error claro y no escribe', () => {
    const sim = crearIo({ [OPTS.rutaEfectos]: '[]' })
    const r = ejecutarSync(OPTS, sim.io)
    expect(r.codigo).not.toBe(0)
    expect(sim.errores.join('\n')).toContain('FuenteArte.json no está disponible')
    expect(sim.escrituras).toEqual([])
  })

  it('JSON inválido o que no es array: error y no escribe', () => {
    const malo = crearIo({ [OPTS.rutaArte]: '{no es json', [OPTS.rutaEfectos]: '[]' })
    expect(ejecutarSync(OPTS, malo.io).codigo).not.toBe(0)
    expect(malo.errores.join('\n')).toContain('No se pudo leer/parsear')
    const objeto = crearIo({ [OPTS.rutaArte]: '{"a":1}', [OPTS.rutaEfectos]: '[]' })
    expect(ejecutarSync(OPTS, objeto.io).codigo).not.toBe(0)
    expect(objeto.errores.join('\n')).toContain('debe ser un ARRAY')
    expect(malo.escrituras.concat(objeto.escrituras)).toEqual([])
  })

  it('valida TODO antes de escribir: una carta inválida aborta aunque el arte sea correcto', () => {
    const mala = carta('M-1', { efectos: [{ tipo: 'pasivo', efecto: 'inventada' }], imageUrl: webp('m') })
    const sim = crearIo({ [OPTS.rutaArte]: arteDe([A, mala]), [OPTS.rutaEfectos]: '[]' })
    const r = ejecutarSync(OPTS, sim.io)
    expect(r.codigo).not.toBe(0)
    expect(sim.errores.join('\n')).toContain('M-1')
    expect(sim.escrituras).toEqual([])
  })

  it('un arte que no es webp aborta sin escribir nada (ni el JSON)', () => {
    const png = carta('P-1', { imageUrl: `data:image/png;base64,${Buffer.from('p').toString('base64')}` })
    const sim = crearIo({ [OPTS.rutaArte]: arteDe([A, png]), [OPTS.rutaEfectos]: '[]' })
    const r = ejecutarSync(OPTS, sim.io)
    expect(r.codigo).not.toBe(0)
    expect(sim.errores.join('\n')).toContain('P-1: el arte es png y debe ser webp')
    expect(sim.escrituras).toEqual([])
  })

  it('escribe FuenteEfectos (sin imageUrl) y las ilustraciones', () => {
    const sim = crearIo({ [OPTS.rutaArte]: arteDe([A, B]), [OPTS.rutaEfectos]: '[]' })
    const r = ejecutarSync(OPTS, sim.io)
    expect(r.codigo).toBe(0)
    expect(sim.escrituras.sort()).toEqual(
      ['/public/cartas/A-1.webp', '/public/cartas/B-1.webp', OPTS.rutaEfectos].sort(),
    )
    const efectos = JSON.parse(sim.fs.get(OPTS.rutaEfectos) as string) as Json[]
    expect(efectos.map((c) => c.id)).toEqual(['A-1', 'B-1'])
    expect(efectos.some((c) => 'imageUrl' in c)).toBe(false)
    expect((sim.fs.get('/public/cartas/A-1.webp') as Buffer).toString()).toBe('arte-a')
  })

  it('es idempotente: la segunda corrida reporta 0 cambios y no escribe', () => {
    const sim = crearIo({ [OPTS.rutaArte]: arteDe([A, B]), [OPTS.rutaEfectos]: '[]' })
    ejecutarSync(OPTS, sim.io)
    sim.escrituras.length = 0
    sim.logs.length = 0
    const r = ejecutarSync(OPTS, sim.io)
    expect(r.codigo).toBe(0)
    expect(r.cambios).toBe(0)
    expect(r.escrituras).toBe(0)
    expect(sim.escrituras).toEqual([])
    expect(sim.logs.join('\n')).toContain('0 cambios')
  })

  it('sin --prune conserva cartas y arte obsoletos; con --prune los elimina', () => {
    const base = {
      [OPTS.rutaArte]: arteDe([A]),
      [OPTS.rutaEfectos]: JSON.stringify([carta('Z-9')]),
      '/public/cartas/Z-9.webp': Buffer.from('z'),
    }
    const sinPrune = crearIo(base)
    ejecutarSync(OPTS, sinPrune.io)
    expect(sinPrune.borrados).toEqual([])
    expect((JSON.parse(sinPrune.fs.get(OPTS.rutaEfectos) as string) as Json[]).map((c) => c.id)).toEqual(['Z-9', 'A-1'])

    const conPrune = crearIo(base)
    const r = ejecutarSync({ ...OPTS, prune: true }, conPrune.io)
    expect(r.borrados).toBe(1)
    expect(conPrune.borrados).toEqual(['/public/cartas/Z-9.webp'])
    expect((JSON.parse(conPrune.fs.get(OPTS.rutaEfectos) as string) as Json[]).map((c) => c.id)).toEqual(['A-1'])
  })

  it('no reescribe una ilustración idéntica ni el JSON si el texto no cambió', () => {
    const sim = crearIo({ [OPTS.rutaArte]: arteDe([A]), [OPTS.rutaEfectos]: '[]' })
    ejecutarSync(OPTS, sim.io)
    sim.escrituras.length = 0
    // cambia solo B: A no se toca
    const sim2 = crearIo({
      [OPTS.rutaArte]: arteDe([A, B]),
      [OPTS.rutaEfectos]: sim.fs.get(OPTS.rutaEfectos) as string,
      '/public/cartas/A-1.webp': sim.fs.get('/public/cartas/A-1.webp') as Buffer,
    })
    ejecutarSync(OPTS, sim2.io)
    expect(sim2.escrituras).not.toContain('/public/cartas/A-1.webp')
    expect(sim2.escrituras).toContain('/public/cartas/B-1.webp')
  })

  it('un FuenteEfectos idéntico salvo por el salto de línea final cuenta como 0 cambios (el seed real no lo trae)', () => {
    const sim = crearIo({ [OPTS.rutaArte]: arteDe([A]), [OPTS.rutaEfectos]: '[]' })
    ejecutarSync(OPTS, sim.io)
    const sinSalto = (sim.fs.get(OPTS.rutaEfectos) as string).trimEnd()
    const sim2 = crearIo({
      [OPTS.rutaArte]: arteDe([A]),
      [OPTS.rutaEfectos]: sinSalto,
      '/public/cartas/A-1.webp': sim.fs.get('/public/cartas/A-1.webp') as Buffer,
    })
    const r = ejecutarSync(OPTS, sim2.io)
    expect(r.cambios).toBe(0)
    expect(sim2.escrituras).toEqual([])
  })
})
