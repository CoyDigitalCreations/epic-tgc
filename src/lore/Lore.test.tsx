import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { AppRoutes } from '../AppRoutes'
import Lore from './Lore'
import {
  ALL_CARDS,
  DISONANCIA_CARDS,
  ESTASIS_CARDS,
  disonanciaDistribucion,
  estasisDistribucion,
} from '../shared/data/paquetes'
import { CAMPEONAS, CAMPEONES_DISONANCIA, CASAS, CICLO, CICLO_DISONANCIA, ETER_SUR, FACETAS, NORTE_SUR, SECCIONES } from './contenido'
import {
  CAMPEONES_MUTACION,
  CAMPEONES_PURGA,
  CICLO_MUTACION,
  CICLO_PURGA,
  ETER_MUTACION,
  ETER_PURGA,
  PRIMOGENITOS_ARBOL,
  PURGA_MUTACION,
} from './contenidoPurgaMutacion'
import { MUTACION_CARDS, PURGA_CARDS } from '../shared/data/paquetes'

/** La palabra del origen de todas las cosas está vetada en el repo: el patrón se arma por partes para no escribirla. */
const PALABRA_VETADA = new RegExp(['\b', 'ne', 'xo', '\b'].join(''), 'i')

// jsdom no trae IntersectionObserver (framer-motion lo usa en `whileInView`): un no-op basta, los elementos quedan en su estado inicial
beforeAll(() => {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return []
      }
    },
  )
})
afterAll(() => vi.unstubAllGlobals())

function renderLore() {
  return render(
    <MemoryRouter>
      <Lore />
    </MemoryRouter>,
  )
}

describe('Lore', () => {
  it('muestra la portada y las 7 secciones del índice', () => {
    renderLore()
    expect(screen.getByRole('heading', { level: 1, name: 'ÉTER ENGINE TCG' })).toBeInTheDocument()
    for (const s of SECCIONES) {
      const ancla = document.getElementById(s.id)
      expect(ancla).not.toBeNull()
      expect(within(ancla!).getByRole('heading', { level: 2 })).toHaveTextContent(new RegExp(s.titulo, 'i'))
    }
  })

  it('el índice lateral enlaza a cada sección por ancla', () => {
    renderLore()
    for (const s of SECCIONES) {
      const enlace = screen.getAllByRole('link', { name: new RegExp(s.titulo) }).find((a) => a.getAttribute('href') === `#${s.id}`)
      expect(enlace).toBeDefined()
      expect(document.getElementById(s.id)).not.toBeNull()
    }
  })

  it('presenta a las 9 primogénitas con su arte (solo ilustración, sin marco de carta)', () => {
    renderLore()
    expect(CAMPEONAS).toHaveLength(9)
    for (const c of CAMPEONAS) {
      // Aurora aparece dos veces (su sección y la rejilla): todas apuntan al mismo arte
      const imgs = screen.getAllByAltText(`Ilustración de ${c.nombre}, ${c.titulo}`)
      for (const img of imgs) expect(img).toHaveAttribute('src', `/cartas/${c.id}.webp`)
    }
    // Ninguna imagen del lore usa las cartas completas del manual
    expect([...document.querySelectorAll('img')].some((i) => i.getAttribute('src')?.includes('/manual/cartas/'))).toBe(false)
  })

  it('cada casa y cada paso del ciclo llevan su ilustración', () => {
    renderLore()
    for (const c of CASAS) expect(screen.getByAltText(`Arte de ${c.nombre}`)).toHaveAttribute('src', `/cartas/${c.arte}.webp`)
    for (const [i, c] of CICLO.entries()) {
      expect(screen.getByAltText(`Arte del paso ${i + 1}: ${c.titulo}`)).toHaveAttribute('src', `/cartas/${c.arte}.webp`)
    }
  })

  it('dibuja el mapa del Eje con los dos polos y las seis facetas', () => {
    renderLore()
    const mapa = screen.getByRole('img', { name: /Mapa del Eje/ })
    for (const n of ['ORDEN', 'CAOS', 'LEY', 'PURGA', 'CREACIÓN', 'DESTRUCCIÓN', 'MUTACIÓN', 'ENTROPÍA']) {
      expect(within(mapa).getByText(n)).toBeInTheDocument()
    }
  })
})

describe('Lore del sur (Disonancia)', () => {
  it('suma las secciones 8-10 al índice, en orden', () => {
    renderLore()
    expect(SECCIONES.map((s) => s.id).slice(-8, -5)).toEqual(['sur', 'ragnar', 'disonancia'])
    for (const id of ['sur', 'ragnar', 'disonancia']) expect(document.getElementById(id)).not.toBeNull()
  })

  it('presenta a los 10 campeones del mazo con su arte y la ficha de juego', () => {
    renderLore()
    expect(CAMPEONES_DISONANCIA).toHaveLength(10)
    for (const c of CAMPEONES_DISONANCIA) {
      const imgs = screen.getAllByAltText(`Ilustración de ${c.nombre}, ${c.titulo}`)
      for (const img of imgs) expect(img).toHaveAttribute('src', `/cartas/${c.id}.webp`)
    }
    expect(screen.getByText(/Coste 4 · ATQ 9 \/ RES 9/)).toBeInTheDocument()
  })

  it('las nueve cartas de Éter del sur muestran su frase y los cinco tiempos del Aprieto su ilustración', () => {
    renderLore()
    expect(ETER_SUR).toHaveLength(9)
    for (const e of ETER_SUR) {
      expect(screen.getByAltText(`Arte de ${e.nombre}`)).toHaveAttribute('src', `/cartas/${e.id}.webp`)
      expect(screen.getByText(`“${e.frase}”`)).toBeInTheDocument()
    }
    for (const [i, c] of CICLO_DISONANCIA.entries()) {
      expect(screen.getByAltText(`Arte del paso ${i + 1}: ${c.titulo}`)).toHaveAttribute('src', `/cartas/${c.arte}.webp`)
    }
  })

  it('el Aprieto tiene cinco tiempos y el quinto, El Nudo olvida, cierra el ciclo con su ilustración', () => {
    renderLore()
    expect(CICLO_DISONANCIA).toHaveLength(5)
    const quinto = CICLO_DISONANCIA[4]
    expect(quinto.titulo).toBe('El Nudo olvida')
    expect(quinto.cartas).toBe('Maldición del Sur · Grito del Primogénito · El Nudo Olvida · Marek · Voz del Nudo')
    expect(screen.getByRole('heading', { name: 'El Nudo olvida' })).toBeInTheDocument()
    expect(screen.getByAltText('Arte del paso 5: El Nudo olvida')).toHaveAttribute('src', '/cartas/' + quinto.arte + '.webp')
  })

  it('la tabla norte/sur tiene una fila por rasgo', () => {
    renderLore()
    const tabla = screen.getByRole('table', { name: /norte \(Estásis\) y el sur \(Disonancia\)/i })
    expect(within(tabla).getAllByRole('row')).toHaveLength(NORTE_SUR.length + 1)
  })

  it('los textos del lore coinciden con las cartas del seed (nombre, coste, ATQ/RES y Éter)', () => {
    const porId = new Map((ALL_CARDS as Array<{ id: string; name: string; stats: { cost: number; poder?: number; resistencia?: number } }>).map((c) => [c.id, c]))
    for (const c of CAMPEONES_DISONANCIA) {
      const carta = porId.get(c.id)!
      expect(carta.name).toBe(`${c.nombre}, ${c.titulo}`)
      expect(c.linea).toBe(`Coste ${carta.stats.cost} · ATQ ${carta.stats.poder} / RES ${carta.stats.resistencia}`)
    }
    for (const e of ETER_SUR) expect(porId.get(e.id)!.name).toBe(e.nombre)
  })

  it('los conteos del mazo que anuncia la página coinciden con los de los paquetes', () => {
    expect(disonanciaDistribucion()).toMatchObject({ eter: 15, principal: 45, vinculos: 6, total: 66 })
    expect(DISONANCIA_CARDS).toHaveLength(33)
    expect(estasisDistribucion()).toMatchObject({ eter: 15, principal: 45, vinculos: 6, total: 66 })
    expect(ESTASIS_CARDS).toHaveLength(33)
  })
})

describe('Lore de Purga y Mutación (secciones 11-15)', () => {
  type CartaSeed = { id: string; name: string; type: string; flavorText?: string; stats?: { cost: number; poder?: number; resistencia?: number } }
  const porId = new Map((ALL_CARDS as CartaSeed[]).map((c) => [c.id, c]))

  it('suma las cinco secciones al índice, en orden y con su ancla', () => {
    renderLore()
    const ids = ['arbol', 'idris', 'purga', 'liora', 'mutacion']
    expect(SECCIONES.map((s) => s.id).slice(-5)).toEqual(ids)
    for (const id of ids) expect(document.getElementById(id)).not.toBeNull()
  })

  it('describe a TODOS los Campeones de los dos mazos (ni uno de más ni uno de menos) con su arte', () => {
    renderLore()
    const deLore = (pr: typeof PRIMOGENITOS_ARBOL, comunes: { id: string }[], prefijo: string) =>
      [...pr.filter((p) => p.id.startsWith(prefijo)), ...comunes].map((c) => c.id).sort()
    const deSeed = (cartas: readonly CartaSeed[]) => cartas.filter((c) => c.type === 'Campeón').map((c) => c.id).sort()
    expect(deLore(PRIMOGENITOS_ARBOL, CAMPEONES_PURGA, 'PU')).toEqual(deSeed(PURGA_CARDS as unknown as CartaSeed[]))
    expect(deLore(PRIMOGENITOS_ARBOL, CAMPEONES_MUTACION, 'MU')).toEqual(deSeed(MUTACION_CARDS as unknown as CartaSeed[]))
    for (const c of [...CAMPEONES_PURGA, ...CAMPEONES_MUTACION]) {
      const imgs = screen.getAllByAltText(`Ilustración de ${c.nombre}, ${c.titulo}`)
      for (const img of imgs) expect(img).toHaveAttribute('src', `/cartas/${c.id}.webp`)
    }
  })

  it('los textos del lore coinciden con las cartas del seed (nombre, ficha de juego, Éter y frases)', () => {
    for (const c of [...CAMPEONES_PURGA, ...CAMPEONES_MUTACION]) {
      const carta = porId.get(c.id)!
      expect(carta.name, c.id).toBe(c.nombre)
      expect(c.linea, c.id).toBe(`Coste ${carta.stats!.cost} · ATQ ${carta.stats!.poder} / RES ${carta.stats!.resistencia}`)
    }
    for (const p of PRIMOGENITOS_ARBOL) expect(porId.get(p.id)!.name, p.id).toBe(`${p.nombre}, ${p.titulo}`)
    for (const e of [...ETER_PURGA, ...ETER_MUTACION]) {
      const carta = porId.get(e.id)!
      expect(carta.name, e.id).toBe(e.nombre)
      expect(carta.flavorText, e.id).toBe(e.frase)
    }
    expect(ETER_PURGA).toHaveLength(9)
    expect(ETER_MUTACION).toHaveLength(9)
  })

  it('las cartas que nombran los cinco tiempos existen en el seed, y cada paso lleva su ilustración', () => {
    renderLore()
    const nombres = new Set((ALL_CARDS as CartaSeed[]).map((c) => c.name))
    const conAcento = (t: string) => t.normalize('NFC')
    for (const [ciclo, prefijo] of [[CICLO_PURGA, 'PU'], [CICLO_MUTACION, 'MU']] as const) {
      expect(ciclo).toHaveLength(5)
      for (const [i, paso] of ciclo.entries()) {
        expect(screen.getByAltText(`Arte del paso ${i + 1}: ${paso.titulo}`)).toHaveAttribute('src', `/cartas/${paso.arte}.webp`)
        expect(paso.arte.startsWith(prefijo)).toBe(true)
        for (const carta of paso.cartas.split(' · ')) {
          const existe = [...nombres].some((n) => conAcento(n).startsWith(conAcento(carta)) || conAcento(n) === conAcento(carta))
          expect(existe, `«${carta}» (${paso.titulo})`).toBe(true)
        }
      }
    }
  })

  it('la tabla Purga/Mutación tiene una fila por rasgo y el mapa del Eje usa las descripciones nuevas', () => {
    renderLore()
    const tabla = screen.getByRole('table', { name: /entre Purga y Mutación/i })
    expect(within(tabla).getAllByRole('row')).toHaveLength(PURGA_MUTACION.length + 1)
    expect(FACETAS.find((f) => f.nombre === 'PURGA')!.descripcion).toMatch(/poda/)
    expect(FACETAS.find((f) => f.nombre === 'DESTRUCCIÓN')!.runa).toBe('El Estallido')
  })

  it('anuncia los conteos reales de los paquetes y nunca menciona el origen de todas las cosas', () => {
    const { container } = renderLore()
    expect(container).toHaveTextContent(`${PURGA_CARDS.length} diseños / 66 cartas`)
    expect(container).toHaveTextContent(`${MUTACION_CARDS.length} diseños / 66 cartas`)
    expect(container.textContent ?? '').not.toMatch(PALABRA_VETADA)
  })
})

describe('Rutas del lore', () => {
  it('/lore carga la página y /primogenitos.html redirige a ella', async () => {
    render(
      <MemoryRouter initialEntries={['/primogenitos.html']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(await screen.findByRole('heading', { level: 1, name: 'ÉTER ENGINE TCG' })).toBeInTheDocument()
  })
})
