import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getCardById } from './paquetes'

/**
 * El manual (public/manual.html) se imprime: tiene que seguir siendo un documento ESTÁTICO,
 * con hoja de impresión propia, y cada carta de ejemplo tiene que existir en la colección.
 */
const html = readFileSync(resolve(process.cwd(), 'public/manual.html'), 'utf8')
const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>'))

describe('manual.html — documento imprimible', () => {
  it('es estático: sin animaciones, transiciones, hover, scripts ni texto con degradado', () => {
    for (const prohibido of ['@keyframes', 'transition', 'animation', ':hover', 'background-clip', 'text-fill-color']) {
      expect(css, prohibido).not.toContain(prohibido)
    }
    expect(html).not.toMatch(/<script/i)
  })

  it('define su hoja de impresión: tamaño Carta, tema claro y numeración de páginas', () => {
    expect(css).toMatch(/@page\s*\{[^}]*size:\s*Letter/)
    expect(css).toContain('@media print')
    expect(css).toContain('counter(page)')
  })

  it('cada imagen de carta existe en disco y corresponde a una carta de la colección', () => {
    const imgs = [...html.matchAll(/<img[^>]*src="\/manual\/cartas\/([\w-]+)\.webp"[^>]*alt="([^"]*)"/g)]
    expect(imgs.length).toBeGreaterThan(20)
    for (const [, id, alt] of imgs) {
      expect(existsSync(resolve(process.cwd(), `public/manual/cartas/${id}.webp`)), `${id}.webp`).toBe(true)
      const carta = getCardById(id)
      expect(carta, `carta ${id}`).toBeDefined()
      expect(alt, `alt de ${id}`).toContain(id)
      expect(alt, `alt de ${id}`).toContain(carta!.name)
    }
  })

  it('todas las imágenes tienen alt', () => {
    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) expect(tag).toMatch(/alt="[^"]+"/)
  })

  it('el índice enlaza las 14 secciones y no hay ids repetidos', () => {
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
    expect(new Set(ids).size).toBe(ids.length)
    const enlaces = [...html.matchAll(/class="toc-item" href="#([^"]+)"/g)].map((m) => m[1])
    expect(enlaces).toHaveLength(14)
    for (const id of enlaces) expect(ids, id).toContain(id)
  })
})
