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

/* ───────── Modo compacto (celular / tablet en horizontal) ─────────
   El escritorio NO cambia: todas las constantes de arriba siguen siendo las suyas. El modo compacto
   solo se activa en viewports que el escritorio no alcanza (ancho < 1100 o alto < 600) y usa su propia
   tabla: mínimos más bajos, franja central y márgenes más finos, y flancos de ancho fijo (no escalan). */
/** Por debajo de este ancho (px) el lateral fijo de 320px deja de caber: pasa a panel desplegable. */
export const ANCHO_MODO_COMPACTO = 1100
/** Por debajo de este alto (px) los dos campos no entran con cartas de 40px: se afina todo el chrome. */
export const ALTO_MODO_COMPACTO = 600
/** Ancho (px) del flanco de cada jugador en modo compacto (cuadrícula de 2 columnas, código + cantidad). */
export const ANCHO_FLANCO_COMPACTO = 84

const MIN_ANCHO_COMPACTO = 24
/** Franja central (28) + padding de la mesa (4) + borde y margen. */
const ALTO_FIJO_COMPACTO = 38
/** Incluye la etiqueta ATQ/RES que cuelga bajo cada Campeón (16-29px fijos, no escalan con la carta). */
const ALTO_FIJO_TABLERO_COMPACTO = 22
/** Padding (8) + 6 huecos entre columnas (48) + hueco a los Vínculos (4) + hueco al flanco (4) + flanco fijo. */
const ANCHO_FIJO_COMPACTO = 8 + 48 + 4 + 4 + ANCHO_FLANCO_COMPACTO
const COLUMNAS_EN_CARTAS_COMPACTO = 7 * RELACION_CARTA + 2 * ESCALA_VINCULO

/** ¿El viewport es de celular/tablet (modo compacto) o de escritorio? Función pura. */
export function esViewportCompacto(ancho: number, alto: number): boolean {
  return ancho < ANCHO_MODO_COMPACTO || alto < ALTO_MODO_COMPACTO
}

/**
 * Ancho de carta (px) para que los dos campos entren en la mesa de `ancho`×`alto`
 * sin scroll: el menor entre lo que permite el alto (3 filas por jugador) y el ancho
 * (7 columnas + bloque de Vínculos). Función pura para poder testearla.
 * `compacto` usa la tabla de celular/tablet; sin él, el cálculo es el del escritorio.
 */
export function calcularAnchoCarta(ancho: number, alto: number, compacto = false): number {
  if (compacto) {
    const porAlto = ((alto - ALTO_FIJO_COMPACTO) / 2 - ALTO_FIJO_TABLERO_COMPACTO) / FILAS_EN_CARTAS
    const porAncho = (ancho - ANCHO_FIJO_COMPACTO) / COLUMNAS_EN_CARTAS_COMPACTO
    return Math.max(MIN_ANCHO_COMPACTO, Math.min(MAX_ANCHO, Math.floor(Math.min(porAlto, porAncho))))
  }
  const porAlto = ((alto - ALTO_FIJO) / 2 - ALTO_FIJO_TABLERO) / FILAS_EN_CARTAS
  const porAncho = (ancho - ANCHO_FIJO) / COLUMNAS_EN_CARTAS
  return Math.max(MIN_ANCHO, Math.min(MAX_ANCHO, Math.floor(Math.min(porAlto, porAncho))))
}

/** Tamaño del viewport (reactivo al resize y a la rotación del dispositivo). */
export function useViewport(): { ancho: number; alto: number } {
  const leer = () =>
    typeof window === 'undefined' ? { ancho: 1440, alto: 900 } : { ancho: window.innerWidth, alto: window.innerHeight }
  const [viewport, setViewport] = useState(leer)
  useLayoutEffect(() => {
    const alRedimensionar = () => {
      const nuevo = leer()
      setViewport((actual) => (actual.ancho === nuevo.ancho && actual.alto === nuevo.alto ? actual : nuevo))
    }
    window.addEventListener('resize', alRedimensionar)
    window.addEventListener('orientationchange', alRedimensionar)
    return () => {
      window.removeEventListener('resize', alRedimensionar)
      window.removeEventListener('orientationchange', alRedimensionar)
    }
  }, [])
  return viewport
}

/** Alto de la ventana (reactivo al resize): dimensiona la mano sin depender de la mesa que se mide aparte. */
export function useAlturaVentana(): number {
  return useViewport().alto
}

/** Mide el contenedor de la mesa y devuelve el ancho de carta que hace entrar todo. */
export function useAnchoTablero(mesaRef: RefObject<HTMLElement | null>, compacto = false): number {
  const [ancho, setAncho] = useState(ANCHO_CARTA_DEFECTO)

  useLayoutEffect(() => {
    const el = mesaRef.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const medir = () => {
      const r = el.getBoundingClientRect()
      if (r.width <= 0 || r.height <= 0) return
      setAncho(calcularAnchoCarta(r.width, r.height, compacto))
    }
    medir()
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => observador.disconnect()
  }, [mesaRef, compacto])

  return ancho
}
