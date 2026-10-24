import { createContext, useContext } from 'react'

/**
 * Ids de instancia cuya carta REAL está oculta porque su "fantasma" está en
 * vuelo (animación de movimiento). El MiniCard lee esto y se pone invisible
 * (visibility: hidden conserva el hueco) hasta que el fantasma aterriza.
 */
export const EnVueloContext = createContext<ReadonlySet<string>>(new Set())

export function useEnVuelo(cardInstanceId: string): boolean {
  return useContext(EnVueloContext).has(cardInstanceId)
}

/** Ajuste "Animación" del tablero (rápida/normal = true, off = false): los efectos sueltos lo consultan. */
export const AnimacionActivaContext = createContext(true)

export function useAnimacionActiva(): boolean {
  return useContext(AnimacionActivaContext)
}
