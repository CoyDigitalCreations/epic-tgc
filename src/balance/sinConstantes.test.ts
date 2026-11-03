import { describe, it, expect } from 'vitest'

/**
 * Guardia estática: los módulos de cálculo de src/balance no pueden tener
 * literales de banda, peso o umbral. Todo vive en config.ts.
 * Se permiten solo los números estructurales de la lista.
 */
const PERMITIDOS = new Set(['0', '1', '-1', '10', '100'])

/** Quita comentarios y cadenas para no confundirlos con código. */
function sinComentariosNiCadenas(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/[^\n]*/g, ' ')
    .replace(/'(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`/g, "''")
}

export function literalesNumericos(src: string): string[] {
  const limpio = sinComentariosNiCadenas(src)
  const encontrados = limpio.match(/(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])/g) ?? []
  return encontrados.filter((n) => !PERMITIDOS.has(n))
}

const archivos = import.meta.glob<string>('./*.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const EXCLUIDOS = /(?:config|tipos)\.ts$|\.test\.ts$/

describe('detector de literales', () => {
  it('detecta números sueltos en código', () => {
    expect(literalesNumericos('const banda = suma > 8')).toEqual(['8'])
    expect(literalesNumericos('const peso = atq * 1.25')).toEqual(['1.25'])
  })

  it('ignora comentarios, cadenas y números estructurales', () => {
    expect(literalesNumericos('const a = 0 // tope 9\nconst b = "7-9" + x[1]')).toEqual([])
    expect(literalesNumericos('/* 18 */ const c = Math.round(x * 10) / 10')).toEqual([])
  })
})

describe('src/balance sin constantes sueltas', () => {
  const modulos = Object.entries(archivos).filter(([ruta]) => !EXCLUIDOS.test(ruta))

  it('revisa al menos un módulo de cálculo', () => {
    expect(modulos.length).toBeGreaterThan(0)
  })

  it.each(modulos)('%s no tiene literales de banda, peso ni umbral', (_ruta, src) => {
    expect(literalesNumericos(src)).toEqual([])
  })
})
