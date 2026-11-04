import { useCallback } from 'react'
import { useSearchParams } from 'react-router'
import { CARD_TYPES, RARITIES } from '../shared/types/enums'
import type { FiltrosBalance } from './metricas'
import type { MazoId } from './tipos'

/** Las ocho vistas del tablero; la primera es la que se abre por defecto. */
export const VISTAS = [
  'resumen',
  'dispersion',
  'presupuesto',
  'verbos',
  'ranking',
  'curva',
  'comparador',
  'auditoria',
] as const
export type VistaBalance = (typeof VISTAS)[number]

const MAZOS: readonly MazoId[] = ['estasis', 'disonancia']
const VISTA_INICIAL: VistaBalance = VISTAS[0]

export type ClaveFiltro = keyof FiltrosBalance

function elegir<T extends string>(valor: string | null, validos: readonly T[]): T | null {
  return validos.find((v) => v === valor) ?? null
}

/** Lee filtros y vista de la URL; lo que no es válido se ignora. */
export function leerFiltros(params: URLSearchParams): { filtros: FiltrosBalance; vista: VistaBalance } {
  const coste = params.get('coste')
  const numero = coste === null || coste.trim() === '' ? Number.NaN : Number(coste)
  return {
    filtros: {
      mazo: elegir(params.get('mazo'), MAZOS),
      tipo: elegir(params.get('tipo'), CARD_TYPES),
      coste: Number.isInteger(numero) && numero >= 0 ? numero : null,
      rareza: elegir(params.get('rareza'), RARITIES),
    },
    vista: elegir(params.get('vista'), VISTAS) ?? VISTA_INICIAL,
  }
}

/**
 * Filtros y vista del tablero guardados en la URL (mazo, tipo, coste, rareza,
 * vista): se pueden compartir y sobreviven a una recarga.
 */
export function useFiltrosBalance() {
  const [params, setParams] = useSearchParams()
  const { filtros, vista } = leerFiltros(params)

  const cambiar = useCallback(
    (clave: string, valor: string | null) =>
      setParams((previos) => {
        const siguientes = new URLSearchParams(previos)
        if (valor === null) siguientes.delete(clave)
        else siguientes.set(clave, valor)
        return siguientes
      }),
    [setParams],
  )

  const setFiltro = useCallback(
    <K extends ClaveFiltro>(clave: K, valor: FiltrosBalance[K]) => cambiar(clave, valor === null ? null : String(valor)),
    [cambiar],
  )
  const setVista = useCallback((nueva: VistaBalance) => cambiar('vista', nueva), [cambiar])
  const limpiar = useCallback(
    () =>
      setParams((previos) => {
        const siguientes = new URLSearchParams(previos)
        for (const clave of ['mazo', 'tipo', 'coste', 'rareza']) siguientes.delete(clave)
        return siguientes
      }),
    [setParams],
  )

  return { filtros, vista, setFiltro, setVista, limpiar }
}
