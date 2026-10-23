import { useLayoutEffect, useState } from 'react'
import type { RefObject } from 'react'
import { ANCHO_CARTA_DEFECTO } from './tableroContext'

/** Relación alto/ancho de una carta (744×1038). */
export const RELACION_CARTA = 1038 / 744
/** La fila 1 (Éter pagado / bloqueado / Exilio) usa cartas más chicas: solo se referencian. */
export const ESCALA_FILA_ETER = 0.62
/** Los Vínculos (bloque lateral de 2×3) usan cartas más chicas que las casillas. */
export const ESCALA_VINCULO = 0.64
/** Ancho del panel lateral de cada jugador (nombre + zonas con su código), en unidades de ancho de carta. */
export const ANCHO_FLANCO = 1.9

const MIN_ANCHO = 40
const MAX_ANCHO = 130
/** Alto fijo de la mesa que NO escala con la carta: franja central (44) + padding de la mesa (16) + margen. */
const ALTO_FIJO = 66
/** Alto por tablero que no escala: separación entre las 3 filas + padding. */
const ALTO_FIJO_TABLERO = 20
/** Alto de las 3 filas de un tablero en unidades de ancho de carta (fila 1 chica + filas 2 y 3). */
const FILAS_EN_CARTAS = (ESCALA_FILA_ETER + 2) * RELACION_CARTA
/** Ancho fijo: padding (24) + 6 huecos entre columnas (48) + hueco a los Vínculos (16) + hueco al panel lateral (16). */
const ANCHO_FIJO = 24 + 48 + 16 + 16
/** Ancho en unidades de carta: 7 columnas (cada una del alto de una carta, por la carta girada) + Vínculos + panel lateral. */
const COLUMNAS_EN_CARTAS = 7 * RELACION_CARTA + 2 * ESCALA_VINCULO + ANCHO_FLANCO

/**
 * Ancho de carta (px) para que los dos campos entren en la mesa de `ancho`×`alto`
 * sin scroll: el menor entre lo que permite el alto (3 filas por jugador) y el ancho
 * (7 columnas + bloque de Vínculos). Función pura para poder testearla.
 */
export function calcularAnchoCarta(ancho: number, alto: number): number {
  const porAlto = ((alto - ALTO_FIJO) / 2 - ALTO_FIJO_TABLERO) / FILAS_EN_CARTAS
  const porAncho = (ancho - ANCHO_FIJO) / COLUMNAS_EN_CARTAS
  return Math.max(MIN_ANCHO, Math.min(MAX_ANCHO, Math.floor(Math.min(porAlto, porAncho))))
}

/** Alto de la ventana (reactivo al resize): dimensiona la mano sin depender de la mesa que se mide aparte. */
export function useAlturaVentana(): number {
  const [alto, setAlto] = useState(() => (typeof window === 'undefined' ? 900 : window.innerHeight))
  useLayoutEffect(() => {
    const alRedimensionar = () => setAlto(window.innerHeight)
    window.addEventListener('resize', alRedimensionar)
    return () => window.removeEventListener('resize', alRedimensionar)
  }, [])
  return alto
}

/** Mide el contenedor de la mesa y devuelve el ancho de carta que hace entrar todo. */
export function useAnchoTablero(mesaRef: RefObject<HTMLElement | null>): number {
  const [ancho, setAncho] = useState(ANCHO_CARTA_DEFECTO)

  useLayoutEffect(() => {
    const el = mesaRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const medir = () => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      setAncho(calcularAnchoCarta(r.width, r.height))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [mesaRef])

  return ancho
}
