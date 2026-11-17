// @vitest-environment node
/**
 * Los efectos que ve el JUGADOR (modal de pre-efectos, inspector de carta) salen en lenguaje natural: el `texto` de cada efecto.
 * Antes salía la descripción técnica pensada para el log: «change_type sobre todos tus Campeones (costo: 3 Éter)»,
 * «cuando_campeon_propio_cambia_esencia → Buff +1 ATQ a campeon_del_trigger».
 *
 * Genérico: la regla se comprueba sobre TODAS las cartas del juego, no sobre una concreta.
 */
import { describe, expect, it } from 'vitest'
import { DISONANCIA_CARDS, ESTASIS_CARDS, MUTACION_CARDS, PURGA_CARDS } from '../../shared/data/paquetes'
import type { EfectoData } from '../../shared/types/cards'
import { describirEfectosDeCarta, textoEfectoParaJugador, textosDeEfectosParaJugador } from '../describirEfecto'

const TODAS = [...ESTASIS_CARDS, ...DISONANCIA_CARDS, ...PURGA_CARDS, ...MUTACION_CARDS] as unknown as { id: string; name: string; efectos?: EfectoData[]; efectoComandante?: EfectoData | EfectoData[] }[]
/** Un identificador interno: palabras en minúscula unidas por «_» (change_type, campeon_del_trigger, cuando_juegas_mistica…) */
const NOMBRE_INTERNO = /\b[a-z]+_[a-z_]+\b/

describe('textos de efectos para el jugador', () => {
  it('ninguna línea de ninguna carta real muestra nombres internos del motor', () => {
    const feas: string[] = []
    for (const c of TODAS) for (const l of textosDeEfectosParaJugador(c)) if (NOMBRE_INTERNO.test(l)) feas.push(`${c.id} ${c.name}: ${l}`)
    expect(feas).toEqual([])
  })

  it('cada carta con efectos produce una línea por efecto, igual que el log técnico', () => {
    for (const c of TODAS) expect(textosDeEfectosParaJugador(c)).toHaveLength(describirEfectosDeCarta(c).length)
  })

  it('usa el texto del efecto cuando lo trae', () => {
    const e = { tipo: 'hechizo', efecto: 'change_type', texto: ' Todos tus Campeones se convierten en la esencia que elijas. ' } as EfectoData
    expect(textoEfectoParaJugador(e)).toBe('Todos tus Campeones se convierten en la esencia que elijas.')
  })

  it('sin texto cae a la descripción técnica (no queda vacío)', () => {
    const e = { tipo: 'hechizo', efecto: 'draw', cantidad: 2 } as EfectoData
    expect(textoEfectoParaJugador(e)).toBe('Roba 2 carta(s)')
    expect(textoEfectoParaJugador({ tipo: 'hechizo', efecto: 'draw', texto: '   ' } as EfectoData)).toBe('Roba 1 carta(s)')
  })

  it('el log técnico NO cambia: sigue describiendo la semántica del efecto', () => {
    const e = { tipo: 'hechizo', efecto: 'change_type', texto: 'Todos tus Campeones cambian de esencia.', costo: { tipo: 'eter', cantidad: 3 } } as EfectoData
    expect(describirEfectosDeCarta({ efectos: [e] })[0]).toBe('change_type sobre el objetivo (costo: 3 Éter)')
  })

  it('el efecto de Comandante lleva su prefijo y también sale en texto natural', () => {
    const e = { tipo: 'comandante', efecto: 'buff', texto: 'Tus Campeones ganan 1 de ATQ.' } as EfectoData
    expect(textosDeEfectosParaJugador({ efectoComandante: e })).toEqual(['Comandante: Tus Campeones ganan 1 de ATQ.'])
  })
})
