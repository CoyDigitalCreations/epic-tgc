import { describe, it, expect, beforeAll } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { CARD_ART_IDS } from '../shared/data/paquetes'
import { canon, derivarCarta, parsearDataUrlImagen, type Json } from '../../scripts/lib/fuentes'

/**
 * Guardia de fuentes. Corre SIEMPRE (no depende de seed/FuenteArte.json):
 * - nadie en src/ importa FuenteArte.json (pesa ~13 MB y vive fuera de git);
 * - public/cartas/*.webp cubre exactamente CARD_ART_IDS.
 */
export function encontrarImportsDeFuenteArte(texto: string): string[] {
  const sinComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\/\/[^\n]*/g, ' ')
  const patron = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*)(['"`])[^'"`\n]*FuenteArte\.json\1/g
  return sinComentarios.match(patron) ?? []
}

/**
 * Cartas que ya existen en el seed pero cuya ilustración aún no se ha entregado (el usuario la sube después). La guardia sigue
 * exigiendo arte para todas las demás; si una de estas YA tiene su .webp la guardia falla para obligar a sacarla de la lista.
 * FB-033 «Runa de Ancla» (rediseño de Estásis): sin imageUrl en FuenteArte.json ni public/cartas/FB-033.webp.
 */
export const SIN_ARTE_PENDIENTE: readonly string[] = ['FB-033']

const RAIZ = resolve(__dirname, '../..')
const DIR_SRC = join(RAIZ, 'src')
const DIR_CARTAS = join(RAIZ, 'public', 'cartas')

function archivosDe(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivosDe(join(dir, e.name)) : [join(dir, e.name)],
  )
}

describe('detector de imports de FuenteArte.json', () => {
  it('detecta un import estático', () => {
    const texto = "import arte from '../../seed/FuenteArte.json'\n"
    expect(encontrarImportsDeFuenteArte(texto)).toHaveLength(1)
  })

  it('detecta un import dinámico', () => {
    const texto = "const m = await import('../../seed/FuenteArte.json')\n"
    expect(encontrarImportsDeFuenteArte(texto)).toHaveLength(1)
  })

  it('ignora menciones en comentarios', () => {
    const texto = "// import x from '../seed/FuenteArte.json'\n/* import('FuenteArte.json') */\nconst a = 1\n"
    expect(encontrarImportsDeFuenteArte(texto)).toEqual([])
  })
})

describe('guardia de fuentes (siempre)', () => {
  it('nadie en src/ importa FuenteArte.json', () => {
    const propio = join(DIR_SRC, 'balance', 'fuentes.test.ts')
    const hallazgos = archivosDe(DIR_SRC)
      .filter((f) => /\.(ts|tsx)$/.test(f) && f !== propio)
      .filter((f) => encontrarImportsDeFuenteArte(readFileSync(f, 'utf8')).length > 0)
    expect(hallazgos).toEqual([])
  })

  it('public/cartas/*.webp cubre exactamente CARD_ART_IDS', () => {
    const enDisco = readdirSync(DIR_CARTAS)
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.replace(/\.webp$/, ''))
      .sort()
    expect(enDisco).toEqual([...CARD_ART_IDS].filter((id) => !SIN_ARTE_PENDIENTE.includes(id)).sort())
  })
})

/**
 * Consistencia FuenteEfectos == FuenteArte (ignorando imageUrl). Requiere seed/FuenteArte.json, que es LOCAL y
 * está fuera de git: sin él (CI, Vercel, clones) estas pruebas se saltan con un aviso visible.
 * FUENTE_ARTE_RUTA permite apuntar a otra ruta (p. ej. para comprobar el salto o una copia alterada).
 */
export interface Diferencia {
  id: string
  campo: string
}

/** Ruta (a.b[0].c) del primer campo que difiere entre dos valores; null si son iguales. */
function primeraRutaDistinta(a: unknown, b: unknown, ruta: string): string | null {
  if (canon(a) === canon(b)) return null
  const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
  if (Array.isArray(a) && Array.isArray(b)) {
    const n = Math.max(a.length, b.length)
    for (let i = 0; i < n; i++) {
      const r = primeraRutaDistinta(a[i], b[i], `${ruta}[${i}]`)
      if (r) return r
    }
  } else if (esObjeto(a) && esObjeto(b)) {
    for (const k of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
      const r = primeraRutaDistinta(a[k], b[k], ruta ? `${ruta}.${k}` : k)
      if (r) return r
    }
  }
  return ruta
}

/**
 * Compara FuenteArte contra FuenteEfectos tras la MISMA normalización del script (derivarCarta + canon).
 * Devuelve una diferencia por carta distinta (id y primer campo que difiere) o ausente de un lado.
 */
export function compararFuentes(arte: Json[], efectos: Json[]): Diferencia[] {
  const derivadas = new Map(arte.map((c) => [String(c.id), derivarCarta(c)]))
  const enEfectos = new Map(efectos.map((c) => [String(c.id), c]))
  const diferencias: Diferencia[] = []
  for (const [id, carta] of derivadas) {
    const otra = enEfectos.get(id)
    if (!otra) diferencias.push({ id, campo: 'ausente en FuenteEfectos' })
    else {
      const campo = primeraRutaDistinta(carta, otra, '')
      if (campo) diferencias.push({ id, campo })
    }
  }
  for (const id of enEfectos.keys()) {
    if (!derivadas.has(id)) diferencias.push({ id, campo: 'ausente en FuenteArte' })
  }
  return diferencias
}

const RUTA_ARTE = process.env.FUENTE_ARTE_RUTA ?? join(RAIZ, 'seed', 'FuenteArte.json')
const RUTA_EFECTOS = join(RAIZ, 'seed', 'FuenteEfectos.json')
const hayArte = existsSync(RUTA_ARTE)

if (!hayArte) {
  console.warn('FuenteArte.json no está disponible, no se comprobó la consistencia')
}

describe('comparación de fuentes (fixtures)', () => {
  const carta = (id: string, poder: number): Json => ({ id, name: id, stats: { cost: 2, poder, resistencia: 3 } })

  it('S1.1 cartas iguales ignorando imageUrl no reportan diferencias', () => {
    const arte = [{ ...carta('A', 5), imageUrl: 'data:image/webp;base64,AAAA', hasImage: true }, carta('B', 4)]
    expect(compararFuentes(arte, [carta('A', 5), carta('B', 4)])).toEqual([])
  })

  it('S1.2 una carta con ATQ distinto reporta el id y el campo', () => {
    expect(compararFuentes([carta('A', 5), carta('B', 4)], [carta('A', 5), carta('B', 6)])).toEqual([
      { id: 'B', campo: 'stats.poder' },
    ])
  })

  it('reporta cartas que faltan en cualquiera de los dos lados', () => {
    expect(compararFuentes([carta('A', 5), carta('B', 4)], [carta('A', 5), carta('C', 4)])).toEqual([
      { id: 'B', campo: 'ausente en FuenteEfectos' },
      { id: 'C', campo: 'ausente en FuenteArte' },
    ])
  })
})

describe.skipIf(!hayArte)(
  hayArte
    ? 'consistencia con seed/FuenteArte.json (presente: se comprueba)'
    : 'consistencia con seed/FuenteArte.json (ausente: se salta)',
  () => {
  let arte: Json[] = []
  let efectos: Json[] = []

  // Lectura ÚNICA: el archivo pesa ~13 MB
  beforeAll(() => {
    arte = JSON.parse(readFileSync(RUTA_ARTE, 'utf8')) as Json[]
    efectos = JSON.parse(readFileSync(RUTA_EFECTOS, 'utf8')) as Json[]
  }, 30_000)

  it('S1.1 FuenteEfectos == FuenteArte ignorando imageUrl, con los mismos ids y sin duplicados', () => {
    const idsArte = arte.map((c) => String(c.id))
    expect(new Set(idsArte).size).toBe(idsArte.length)
    expect(compararFuentes(arte, efectos)).toEqual([])
    expect(efectos.map((c) => String(c.id)).sort()).toEqual([...idsArte].sort())
  })

  it('S1.3 public/cartas/*.webp cubre exactamente los ids de FuenteArte', () => {
    const enDisco = readdirSync(DIR_CARTAS)
      .filter((f) => f.endsWith('.webp'))
      .map((f) => f.replace(/\.webp$/, ''))
      .sort()
    expect(enDisco).toEqual(arte.map((c) => String(c.id)).filter((id) => !SIN_ARTE_PENDIENTE.includes(id)).sort())
  })

  it('las ilustraciones data:image/webp son idénticas a los archivos', () => {
    const distintas = arte.flatMap((c) => {
      const imagen = typeof c.imageUrl === 'string' ? parsearDataUrlImagen(c.imageUrl) : null
      if (!imagen) return []
      const archivo = join(DIR_CARTAS, `${String(c.id)}.webp`)
      const igual = imagen.tipo === 'webp' && existsSync(archivo) && readFileSync(archivo).equals(imagen.bytes)
      return igual ? [] : [String(c.id)]
    })
    expect(distintas).toEqual([])
  })
})
