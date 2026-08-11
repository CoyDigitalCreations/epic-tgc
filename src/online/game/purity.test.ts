// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Pureza del motor (spec R17): src/online/game/ y src/shared/rng.ts son TS puro
 * sin DOM — 0 imports de react/react-dom/jsdom; testeables con node/vitest.
 * El PRNG se comparte SOLO en una dirección: CardFrame (forge) importa de shared.
 */

const DIR_GAME = __dirname
const RNG_SHARED = join(__dirname, '..', '..', 'shared', 'rng.ts')

const PROHIBIDOS = ['react', 'react-dom', 'jsdom', '@testing-library']

function importsProhibidos(contenido: string): string[] {
  const encontrados = new Set<string>()
  for (const mod of PROHIBIDOS) {
    // import ... from 'mod' | import 'mod' | import('mod') | export ... from 'mod'
    const re = new RegExp(`(?:from\\s+|import\\s*\\()['"]${mod}[^'"]*['"]|import\\s+['"]${mod}['"]`)
    if (re.test(contenido)) encontrados.add(mod)
  }
  return [...encontrados]
}

function archivosMotor(): string[] {
  return readdirSync(DIR_GAME)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'))
    .map((f) => join(DIR_GAME, f))
}

describe('pureza del motor (spec R17)', () => {
  it('ningún módulo de src/online/game/ importa react, react-dom ni jsdom', () => {
    const archivos = archivosMotor()
    // El motor ya existe: el escaneo debe ser no-vacío para ser significativo
    expect(archivos.length).toBeGreaterThan(0)

    const violaciones: string[] = []
    for (const archivo of archivos) {
      const contenido = readFileSync(archivo, 'utf-8')
      for (const mod of importsProhibidos(contenido)) {
        violaciones.push(`${archivo} → importa '${mod}'`)
      }
    }
    expect(violaciones).toEqual([])
  })

  it('src/shared/rng.ts no importa react, react-dom ni jsdom', () => {
    const contenido = readFileSync(RNG_SHARED, 'utf-8')
    expect(importsProhibidos(contenido)).toEqual([])
  })

  it('ningún módulo del motor importa desde src/forge/ ni OnlineApp (solo el PRNG se comparte al revés)', () => {
    const archivos = archivosMotor()
    const contenidoTotal = archivos.map((f) => readFileSync(f, 'utf-8')).join('\n')
    expect(contenidoTotal).not.toMatch(/from\s+['"][^'"]*forge[^'"]*['"]/)
    expect(contenidoTotal).not.toMatch(/OnlineApp/)
  })
})
