import { createContext, useContext } from 'react'
import type { AnyCard } from '../../shared/types'
import type { CardInstance } from '../game'

/** Ancho por defecto (px) de una carta del tablero cuando no se puede medir (tests/SSR). */
export const ANCHO_CARTA_DEFECTO = 74

/**
 * Ancho (px) de una carta de casilla del tablero. Lo calcula el Tablero según el
 * espacio disponible para que los dos campos entren en pantalla sin scroll;
 * las casillas, la grilla y las cartas lo leen de aquí en vez de un tamaño fijo.
 */
export const AnchoTableroContext = createContext<number>(ANCHO_CARTA_DEFECTO)

export function useAnchoCarta(): number {
  return useContext(AnchoTableroContext)
}

/** ¿El tablero está en modo compacto (celular/tablet en horizontal)? Lo decide el Tablero según el viewport. */
export const CompactoContext = createContext<boolean>(false)

export function useCompacto(): boolean {
  return useContext(CompactoContext)
}

/** Carta que el jugador está mirando (hover): la instancia y la carta con sus stats VIVAS. */
export interface Inspeccion {
  inst: CardInstance
  carta: AnyCard
}

/** Setter del inspector: el MiniCard lo invoca al pasar el mouse por encima. */
export const InspeccionContext = createContext<(sel: Inspeccion) => void>(() => {})

export function useInspeccionar(): (sel: Inspeccion) => void {
  return useContext(InspeccionContext)
}
