import { useCallback, useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { CARD_TYPES, RARITIES } from '../shared/types/enums'
import type { FiltrosBalance } from './metricas'
import type { MazoId } from './tipos'

/** Las diez vistas del tablero; la primera es la que se abre por defecto. */
export const VISTAS = [
  'resumen',
  'dispersion',
  'presupuesto',
  'verbos',
  'ranking',
  'curva',
  'letalidad',
  'comparador',
  'auditoria',
  'analisis',
] as const
export type VistaBalance = (typeof VISTAS)[number]

const MAZOS: readonly MazoId[] = ['estasis', 'disonancia']
const VISTA_INICIAL: VistaBalance = VISTAS[0]

export type ClaveFiltro = keyof FiltrosBalance

function elegir<T extends string>(valor: string | null, validos: readonly T[]): T | null {
  return validos.find((v) => v === valor) ?? null
}

/**
 * Lee filtros, vista y carta de la URL; lo que no es válido se ignora. La carta solo vale si es
 * una de `idsValidos` (las publicadas); sin ese conjunto no hay forma de validarla y queda en null.
 */
export function leerFiltros(
  params: URLSearchParams,
  idsValidos?: ReadonlySet<string>,
): { filtros: FiltrosBalance; vista: VistaBalance; carta: string | null } {
  const coste = params.get('coste')
  const numero = coste === null || coste.trim() === '' ? Number.NaN : Number(coste)
  const carta = params.get('carta')
  return {
    filtros: {
      mazo: elegir(params.get('mazo'), MAZOS),
      tipo: elegir(params.get('tipo'), CARD_TYPES),
      coste: Number.isInteger(numero) && numero >= 0 ? numero : null,
      rareza: elegir(params.get('rareza'), RARITIES),
    },
    vista: elegir(params.get('vista'), VISTAS) ?? VISTA_INICIAL,
    carta: carta !== null && idsValidos?.has(carta) === true ? carta : null,
  }
}

/**
 * Filtros, vista y carta del tablero guardados en la URL (mazo, tipo, coste, rareza,
 * vista, carta): se pueden compartir y sobreviven a una recarga. Con `idsValidos`, una
 * carta que no existe se borra de la URL (replace, sin ensuciar el historial).
 * `limpiar()` solo quita los filtros: la carta y la vista no son filtros.
 */
export function useFiltrosBalance(idsValidos?: ReadonlySet<string>) {
  const [params, setParams] = useSearchParams()
  const { filtros, vista, carta } = leerFiltros(params, idsValidos)
  const hayCartaInvalida = idsValidos !== undefined && params.has('carta') && carta === null

  useEffect(() => {
    if (!hayCartaInvalida) return
    setParams(
      (previos) => {
        const siguientes = new URLSearchParams(previos)
        siguientes.delete('carta')
        return siguientes
      },
      { replace: true },
    )
  }, [hayCartaInvalida, setParams])

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
  const setCarta = useCallback((id: string | null) => cambiar('carta', id), [cambiar])
  /** Abre el análisis de una carta: vista y carta en UN solo cambio (dos seguidos se pisarían). */
  const analizar = useCallback(
    (id: string) =>
      setParams((previos) => {
        const siguientes = new URLSearchParams(previos)
        siguientes.set('vista', 'analisis')
        siguientes.set('carta', id)
        return siguientes
      }),
    [setParams],
  )
  const limpiar = useCallback(
    () =>
      setParams((previos) => {
        const siguientes = new URLSearchParams(previos)
        for (const clave of ['mazo', 'tipo', 'coste', 'rareza']) siguientes.delete(clave)
        return siguientes
      }),
    [setParams],
  )

  return { filtros, vista, carta, setFiltro, setVista, setCarta, analizar, limpiar }
}
