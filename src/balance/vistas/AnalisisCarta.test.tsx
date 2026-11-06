import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { cardArtPath } from '../../shared/data/paquetes'
import type { FiltrosBalance } from '../metricas'
import { FILTROS_VACIOS, filtrarCartas } from '../metricas'
import type { CartaBalance } from '../tipos'
import { CARTAS, CARTAS_ANTES, CARTAS_DS_ANTES, CARTAS_ELENA_32 } from '../test/cartasReales'
import { useReferencia } from '../useReferencia'
import { AnalisisCarta } from './AnalisisCarta'
import FUENTE_VISTA from './AnalisisCarta.tsx?raw'

/** Arnés: guarda la carta en estado local (en la app vive en la URL) y la referencia en el hook real. */
function Arnes({
  inicial = null,
  filtros = FILTROS_VACIOS,
  onCarta,
  base = CARTAS,
}: {
  inicial?: string | null
  filtros?: FiltrosBalance
  onCarta?: (id: string | null) => void
  /** Las cartas publicadas que ve la vista (CARTAS_ANTES = Elena, Isolde y Mira como eran antes del rediseño de Estásis) */
  base?: CartaBalance[]
}) {
  const [carta, setCarta] = useState<string | null>(inicial)
  const referencia = useReferencia()
  return (
    <>
      <button type="button" onClick={() => referencia.setActiva(!referencia.activa)}>
        Alternar referencia
      </button>
      <AnalisisCarta
        cartas={filtrarCartas(base, filtros)}
        publicadas={base}
        filtros={filtros}
        carta={carta}
        onCarta={(id) => {
          onCarta?.(id)
          setCarta(id)
        }}
        referencia={referencia}
      />
    </>
  )
}

const selector = () => screen.getByRole('combobox', { name: 'Carta' })
const grupo = (nombre: string) => within(selector()).getByRole('group', { name: nombre })
const opciones = (nombre: string) => within(grupo(nombre)).getAllByRole('option')

describe('AnalisisCarta: selector', () => {
  it('por defecto lista las 66 publicadas y ninguna carta de referencia', () => {
    render(<Arnes />)
    expect(screen.getByRole('heading', { level: 2, name: 'Análisis de carta' })).toBeInTheDocument()
    expect(opciones('Publicadas')).toHaveLength(66)
    expect(within(selector()).queryByRole('group', { name: 'Referencia (no publicadas)' })).not.toBeInTheDocument()
    expect(within(selector()).queryByRole('option', { name: /PR-/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('con la referencia activada aparecen las PR-xxx en su grupo etiquetado', async () => {
    render(<Arnes />)
    await userEvent.click(screen.getByRole('button', { name: 'Alternar referencia' }))
    await waitFor(() => expect(opciones('Referencia (no publicadas)')).toHaveLength(58))
    expect(opciones('Referencia (no publicadas)').every((o) => /\(PR-\d+\)/.test(o.textContent ?? ''))).toBe(true)
    expect(opciones('Publicadas')).toHaveLength(66)
  })

  it('la búsqueda por nombre o ID recorta las opciones', async () => {
    render(<Arnes />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o ID' }), 'elen')
    expect(within(grupo('Publicadas')).getByRole('option', { name: /Elena/ })).toBeInTheDocument()
    expect(opciones('Publicadas').length).toBeLessThan(65)
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Buscar por nombre o ID' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o ID' }), 'ds-011')
    expect(opciones('Publicadas')).toHaveLength(1)
  })

  it('respeta los filtros del tablero', () => {
    render(<Arnes filtros={{ ...FILTROS_VACIOS, mazo: 'estasis' }} />)
    expect(opciones('Publicadas')).toHaveLength(33)
  })

  it('sin coincidencias muestra el estado vacío, sin error ni carta seleccionada', async () => {
    render(<Arnes />)
    await userEvent.type(screen.getByRole('searchbox', { name: 'Buscar por nombre o ID' }), 'zzzzzz')
    expect(screen.getByRole('status')).toHaveTextContent('Sin cartas con estos filtros')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
  })

  it('elegir una carta la informa y muestra su título', async () => {
    const alElegir = vi.fn()
    render(<Arnes onCarta={alElegir} />)
    await userEvent.selectOptions(selector(), 'FB-015')
    expect(alElegir).toHaveBeenLastCalledWith('FB-015')
    expect(screen.getByRole('heading', { level: 3, name: /Elena/ })).toBeInTheDocument()
  })

  it('si la carta de la URL no cumple los filtros, avisa y la analiza igual', () => {
    render(<Arnes inicial="DS-011" filtros={{ ...FILTROS_VACIOS, mazo: 'estasis' }} />)
    expect(screen.getByText(/no cumple los filtros actuales/i)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/Kael/)
    expect(selector()).toHaveValue('DS-011')
  })

  it('elegir una referencia limpia la carta de la URL y apagar el interruptor limpia la selección', async () => {
    const alElegir = vi.fn()
    render(<Arnes inicial="FB-015" onCarta={alElegir} />)
    await userEvent.click(screen.getByRole('button', { name: 'Alternar referencia' }))
    await waitFor(() => expect(opciones('Referencia (no publicadas)')).toHaveLength(58))
    await userEvent.selectOptions(selector(), 'PR-030')
    expect(alElegir).toHaveBeenLastCalledWith(null)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent(/Muro Doble.*PR-030/)

    await userEvent.click(screen.getByRole('button', { name: 'Alternar referencia' }))
    expect(screen.queryByRole('heading', { level: 3 })).not.toBeInTheDocument()
    expect(selector()).toHaveValue('')
  })
})

describe('AnalisisCarta: arte', () => {
  it('Elena muestra su ilustración con alt, carga diferida y la ruta oficial', () => {
    render(<Arnes inicial="FB-015" />)
    const img = screen.getByRole('img', { name: /Elena/ })
    expect(img).toHaveAttribute('src', cardArtPath('FB-015'))
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('alt', expect.stringContaining('Elena'))
  })

  it('una carta de referencia no tiene arte y lo dice', async () => {
    render(<Arnes />)
    await userEvent.click(screen.getByRole('button', { name: 'Alternar referencia' }))
    await waitFor(() => expect(opciones('Referencia (no publicadas)')).toHaveLength(58))
    await userEvent.selectOptions(selector(), 'PR-010')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.getByText('Sin arte (carta de referencia)')).toBeInTheDocument()
  })
})

/* ───────────── 6.5: contenido del análisis ───────────── */

const porNombre = (nombre: string) => {
  const c = CARTAS.find((x) => x.nombre.startsWith(nombre))
  if (!c) throw new Error(`Falta ${nombre}`)
  return c
}
const medidor = (nombre: string) => screen.getByRole('meter', { name: nombre })
const bloque = (nombre: string) => screen.getByRole('region', { name: nombre })

describe('AnalisisCarta: contenido', () => {
  // Rediseño de Estásis: Elena real es 3/2 e Isolde 3/6 (coste 4). Los casos «Elena 3/0 bajo banda» e «Isolde 3/7 excede» se conservan
  // renderizando la vista con CARTAS_ANTES (esas cartas con su perfil anterior); abajo hay un caso nuevo con la Elena real.
  it('Elena (de antes): estadísticas, barras con texto de estado y cuánto puede subir', () => {
    render(<Arnes inicial="FB-015" base={CARTAS_ANTES} />)
    const stats = bloque('Estadísticas de la carta')
    const valorDe = (etiqueta: string) => within(stats).getByText(etiqueta, { selector: 'dt' }).nextElementSibling?.textContent
    expect(valorDe('Coste')).toBe('3')
    expect(valorDe('ATQ')).toBe('3')
    expect(valorDe('RES')).toBe('0')
    expect(valorDe('Suma')).toBe('3')
    expect(valorDe('Rareza')).toBe('Poco Común')
    expect(valorDe('Mazo')).toBe('Estásis')
    expect(valorDe('Tipo')).toBe('Campeón')
    expect(valorDe('Keywords')).toBeDefined()

    expect(medidor('ATQ')).toHaveAttribute('aria-valuenow', '3')
    expect(medidor('ATQ')).toHaveAttribute('aria-valuemax', '5')
    expect(medidor('RES')).toHaveAttribute('aria-valuenow', '0')
    expect(medidor('Suma')).toHaveAttribute('aria-valuenow', '3')

    const margenes = bloque('Márgenes de los stats')
    expect(within(margenes).getByText('Bajo banda: puede subir')).toBeInTheDocument()
    expect(within(margenes).getAllByText(/Puede subir hasta \+\d/).length).toBeGreaterThan(0)
  })

  it('Elena real (4/2, suma 6): dentro de banda, sin «bajo banda» ni ajuste propuesto', () => {
    render(<Arnes inicial="FB-015" />)
    const stats = bloque('Estadísticas de la carta')
    const valorDe = (etiqueta: string) => within(stats).getByText(etiqueta, { selector: 'dt' }).nextElementSibling?.textContent
    expect([valorDe('ATQ'), valorDe('RES'), valorDe('Suma')]).toEqual(['4', '2', '6'])
    const margenes = bloque('Márgenes de los stats')
    expect(within(margenes).queryByText('Bajo banda: puede subir')).not.toBeInTheDocument()
    expect(screen.getByText('Sin ajuste propuesto')).toBeInTheDocument()
  })

  it('Elena de antes (3/2): bajo banda y puede subir', () => {
    render(<Arnes inicial="FB-015" base={CARTAS_ELENA_32} />)
    const stats = bloque('Estadísticas de la carta')
    const valorDe = (etiqueta: string) => within(stats).getByText(etiqueta, { selector: 'dt' }).nextElementSibling?.textContent
    expect([valorDe('ATQ'), valorDe('RES'), valorDe('Suma')]).toEqual(['3', '2', '5'])
    const margenes = bloque('Márgenes de los stats')
    expect(within(margenes).getByText('Bajo banda: puede subir')).toBeInTheDocument()
  })

  it('Isolde (de antes): RES excede el tope y la razón cita el impuesto y el texto del efecto', () => {
    render(<Arnes inicial="FB-014" base={CARTAS_ANTES} />)
    expect(medidor('RES').closest('li')).toHaveTextContent('Excede el tope')
    const razones = screen.getByRole('list', { name: 'Razones' })
    expect(within(razones).getByText(/RES 7 pasa el tope de 5/)).toBeInTheDocument()
    expect(within(razones).getByText(/impuesto de 1\.0/)).toBeInTheDocument()
    expect(screen.getByText(/según CONFIG_V1 \(borrador\)/i)).toBeInTheDocument()
  })

  it('Marek en el tope de ATQ (5 del coste 3): «Cerca del tope», «No puede subir» y aviso de techo del pool sin bloquear', () => {
    // La Marek de antes (5/4); hoy es 4/3 (Lote 2 del rediseño de Disonancia) y ya no toca el tope
    render(<Arnes inicial={porNombre('Marek').id} base={CARTAS_DS_ANTES} />)
    const margenes = bloque('Márgenes de los stats')
    expect(within(margenes).getAllByText('Cerca del tope').length).toBeGreaterThan(0)
    expect(within(margenes).getAllByText('No puede subir').length).toBeGreaterThan(0)
    const avisos = screen.getByRole('list', { name: 'Avisos de letalidad' })
    expect(within(avisos).getByText(/ATQ.*supera el techo del pool \(5\)/)).toBeInTheDocument()
    expect(within(avisos).getByText(/es solo un aviso/i)).toBeInTheDocument()
  })

  it('un escalón plano de RES se avisa como «sin efecto práctico en el pool»', () => {
    render(<Arnes inicial="FB-015" base={CARTAS_ANTES} />)
    const avisos = screen.getByRole('list', { name: 'Avisos de letalidad' })
    expect(within(avisos).getByText(/RES.*sin efecto práctico en el pool/i)).toBeInTheDocument()
  })

  it('Aurora (Única, exenta) muestra su tope propio y nunca rojo ni «bajo banda»', () => {
    render(<Arnes inicial="FB-010" />)
    const margenes = bloque('Márgenes de los stats')
    expect(within(margenes).getAllByText('Exenta: tope propio')).toHaveLength(3)
    expect(within(margenes).queryByText('Excede el tope')).not.toBeInTheDocument()
    expect(within(margenes).queryByText('Bajo banda: puede subir')).not.toBeInTheDocument()
    expect(within(margenes).queryByText(/Puede subir hasta/)).not.toBeInTheDocument()
  })

  it('Elena (de antes): ajuste propuesto marcado «Exploratorio»; con las bandas v1.1 su ATQ 5 solo iguala el techo y no hay aviso', () => {
    render(<Arnes inicial="FB-015" base={CARTAS_ANTES} />)
    const ajuste = bloque('Ajuste propuesto')
    expect(within(ajuste).getByText('Exploratorio')).toBeInTheDocument()
    expect(within(ajuste).getByText(/3\/0/)).toBeInTheDocument()
    expect(within(ajuste).getByText(/5\/1/)).toBeInTheDocument()
    expect(within(ajuste).queryByText(/supera el techo del pool/i)).not.toBeInTheDocument()
  })

  it('Seraphina (dentro de banda) no tiene ajuste y lo dice', () => {
    render(<Arnes inicial={porNombre('Seraphina').id} />)
    expect(screen.getByText('Sin ajuste propuesto')).toBeInTheDocument()
  })

  it('desglose por efecto con su texto, por keyword y con la nota del peso por defecto del trigger', () => {
    render(<Arnes inicial="FB-010" />)
    const tabla = screen.getByRole('table', { name: 'Desglose del poder por efecto' })
    expect(within(tabla).getAllByRole('row').length).toBeGreaterThan(1)
    const keywords = screen.getByRole('table', { name: 'Desglose del poder por keyword' })
    expect(within(keywords).getByText('Inmortal')).toBeInTheDocument()
    expect(screen.getByText(/peso por defecto/i)).toBeInTheDocument()
  })

  it('el efecto de Comandante aparece etiquetado', () => {
    const conComandante = CARTAS.find((c) => c.efectos.some((e) => e.esComandante))
    if (!conComandante) throw new Error('Ninguna carta con Comandante')
    render(<Arnes inicial={conComandante.id} />)
    const tabla = screen.getByRole('table', { name: 'Desglose del poder por efecto' })
    // Aurora lleva dos efectos de Comandante: cada uno sale etiquetado
    const nComandante = conComandante.efectos.filter((e) => e.esComandante).length
    expect(nComandante).toBe(2)
    expect(within(tabla).getAllByText('Comandante')).toHaveLength(nComandante)
  })

  it('un Vínculo no tiene semáforo y avisa que no hay poder esperado comparable', () => {
    const vinculo = CARTAS.find((c) => c.tipo === 'Vínculo')
    if (!vinculo) throw new Error('Ningún Vínculo')
    render(<Arnes inicial={vinculo.id} />)
    expect(screen.getByText(/sin coste: no hay poder esperado comparable/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Semáforo:/)).not.toBeInTheDocument()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
    expect(screen.getByRole('table', { name: 'Desglose del poder por efecto' })).toBeInTheDocument()
    expect(screen.getByText('Índice de poder')).toBeInTheDocument()
  })

  it('una carta sin stats con coste muestra índice, poder esperado y holgura en puntos de poder', () => {
    const sinStats = CARTAS.find((c) => c.stats === null && c.tipo !== 'Vínculo' && c.coste > 0)
    if (!sinStats) throw new Error('Ninguna carta sin stats')
    render(<Arnes inicial={sinStats.id} />)
    const poder = bloque('Poder de la carta')
    expect(within(poder).getByText('Índice de poder')).toBeInTheDocument()
    expect(within(poder).getByText(/Poder esperado/)).toBeInTheDocument()
    expect(within(poder).getByText(/Holgura/)).toBeInTheDocument()
    expect(screen.queryByRole('meter')).not.toBeInTheDocument()
  })

  it('las cartas de referencia son de solo lectura: sin ajuste ni exportación', async () => {
    render(<Arnes />)
    await userEvent.click(screen.getByRole('button', { name: 'Alternar referencia' }))
    await waitFor(() => expect(opciones('Referencia (no publicadas)')).toHaveLength(58))
    await userEvent.selectOptions(selector(), 'PR-023')
    expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Ajuste propuesto' })).not.toBeInTheDocument()
    expect(screen.queryByText('Sin ajuste propuesto')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /exportar/i })).not.toBeInTheDocument()
    expect(screen.getByText(/solo lectura, sin ajuste ni exportación/i)).toBeInTheDocument()
  })

  it('cada estado tiene texto visible además del color', () => {
    for (const nombre of ['Elena', 'Isolde', 'Vaela', 'Aurora', 'Rowena']) {
      const { unmount } = render(<Arnes inicial={porNombre(nombre).id} />)
      for (const m of screen.getAllByRole('meter')) {
        const fila = m.closest('li')
        expect(fila?.textContent ?? '').toMatch(/Dentro del rango|Cerca del tope|Excede el tope|Bajo banda: puede subir|Exenta: tope propio/)
      }
      unmount()
    }
  })

  it('anuncia la carta en una región aria-live y mueve el foco al título al cambiar', async () => {
    const { container } = render(<Arnes inicial="FB-015" />)
    const viva = container.querySelector('[aria-live="polite"]')
    expect(viva).not.toBeNull()
    expect(viva).toHaveTextContent(/Analizando Elena/)
    expect(screen.getByRole('heading', { level: 3 })).toHaveFocus()

    await userEvent.selectOptions(selector(), 'FB-014')
    expect(viva).toHaveTextContent(/Analizando Isolde/)
    expect(screen.getByRole('heading', { level: 3, name: /Isolde/ })).toHaveFocus()
  })

  it('no importa Recharts ni FuenteArte', () => {
    expect(FUENTE_VISTA).not.toMatch(/recharts/i)
    expect(FUENTE_VISTA).not.toMatch(/FuenteArte/)
  })

  it('ningún texto de las 65 cartas usa voseo rioplatense ni NaN', () => {
    const voseo = /(?<![\p{L}])(tenés|podés|querés|sabés|sos|vos|mirá|fijate|elegí|ponete|acá|decime|pasá)(?![\p{L}])/iu
    const { container, rerender } = render(<AnalisisCarta cartas={CARTAS} publicadas={CARTAS} carta={CARTAS[0].id} onCarta={() => {}} />)
    for (const c of CARTAS) {
      rerender(<AnalisisCarta cartas={CARTAS} publicadas={CARTAS} carta={c.id} onCarta={() => {}} />)
      const texto = container.textContent ?? ''
      expect(texto, c.id).toContain(c.nombre)
      expect(texto, c.id).not.toMatch(voseo)
      expect(texto, c.id).not.toContain('NaN')
      expect(texto, c.id).not.toContain('undefined')
    }
  })
})

describe('AnalisisCarta: tabú', () => {
  const porId = (id: string) => CARTAS.find((c) => c.id === id)?.nombre ?? id

  it('Aurora (Única): puntos, nivel máximo, reglas que rompe con la regla del manual y veredicto exenta', () => {
    render(<Arnes inicial="FB-010" />)
    const tabu = bloque('Tabú')
    expect(within(tabu).getByRole('heading', { level: 4, name: 'Tabú' })).toBeInTheDocument()
    const valorDe = (etiqueta: string) => within(tabu).getByText(etiqueta, { selector: 'dt' }).nextElementSibling?.textContent
    expect([valorDe('Puntos de tabú'), valorDe('Nivel máximo'), valorDe('Máximo por coste 4')]).toEqual(['6', '2', '3'])
    expect(within(tabu).getByText('Exenta del presupuesto de tabú')).toBeInTheDocument()
    expect(within(tabu).getByText(/sin ella se pasaría por 3/)).toBeInTheDocument()
    const reglas = within(tabu).getByRole('list', { name: 'Reglas que rompe' })
    expect(within(reglas).getAllByRole('listitem')).toHaveLength(5)
    expect(within(reglas).getByText('sin_pagar_costo').closest('li')).toHaveTextContent(/\(nivel 2\): §8\.3a: un Disparo se activa pagando su costo/)
  })

  it('un Éter de coste 1 que arrebata Éter (DS-007) excede su presupuesto de tabú y dice por cuánto', () => {
    render(<Arnes inicial="DS-007" />)
    const tabu = bloque('Tabú')
    expect(within(tabu).getByText('Excede el presupuesto de tabú')).toBeInTheDocument()
    expect(within(tabu).getByText(/1 punto de tabú contra un máximo de 0 para coste 1: se pasa por 1/)).toBeInTheDocument()
    expect(within(within(tabu).getByRole('list', { name: 'Reglas que rompe' })).getByText('steal_ether')).toBeInTheDocument()
  })

  it('el tabú es un eje aparte: no cambia el estado general ni las razones de la carta', () => {
    render(<Arnes inicial="DS-007" />)
    expect(screen.getByText(/Estado:/)).not.toHaveTextContent(/tabú/i)
    expect(within(screen.getByRole('region', { name: 'Por qué' })).queryByText(/tabú/i)).not.toBeInTheDocument()
  })

  it('Elena agota su presupuesto: «En el límite»', () => {
    render(<Arnes inicial="FB-015" />)
    const tabu = bloque('Tabú')
    expect(within(tabu).getByText('En el límite del presupuesto de tabú')).toBeInTheDocument()
    expect(within(tabu).getByText(/usa todo su presupuesto/)).toBeInTheDocument()
  })

  it('una carta que no rompe nada lo dice y queda dentro del presupuesto', () => {
    render(<Arnes inicial="FB-021" />)
    const tabu = bloque('Tabú')
    expect(within(tabu).getByText('No rompe ninguna regla del manual.')).toBeInTheDocument()
    expect(within(tabu).getByText('Dentro del presupuesto de tabú')).toBeInTheDocument()
    expect(within(tabu).queryByRole('list', { name: 'Reglas que rompe' })).not.toBeInTheDocument()
  })

  it('un Vínculo de coste 0 no tiene presupuesto ni veredicto, pero sí su tabú', () => {
    render(<Arnes inicial="DS-028" />)
    const tabu = bloque('Tabú')
    expect(within(tabu).getByText('Sin presupuesto de tabú')).toBeInTheDocument()
    expect(within(tabu).getByText(/no tienen presupuesto de tabú/)).toBeInTheDocument()
    expect(within(tabu).getByText('steal_ether')).toBeInTheDocument()
  })

  it('el veredicto siempre tiene texto además del color y explica la escala de niveles', () => {
    for (const id of ['FB-010', 'DS-007', 'FB-015', 'FB-021', 'DS-028']) {
      const { unmount } = render(<Arnes inicial={id} />)
      const tabu = bloque('Tabú')
      expect(tabu.textContent, porId(id)).toMatch(/Dentro del presupuesto|En el límite|Excede el presupuesto|Exenta del presupuesto|Sin presupuesto de tabú/)
      expect(tabu).toHaveTextContent(/Niveles: 0 no rompe ninguna regla; 1 cambia una regla con hueco previsto/)
      unmount()
    }
  })

  it('una carta de referencia también muestra su tabú', async () => {
    render(<Arnes />)
    await userEvent.click(screen.getByRole('button', { name: 'Alternar referencia' }))
    await waitFor(() => expect(opciones('Referencia (no publicadas)')).toHaveLength(58))
    await userEvent.selectOptions(selector(), 'PR-023')
    expect(bloque('Tabú')).toBeInTheDocument()
  })
})
