import { createContext, useContext } from 'react'
import type { PlayerId } from '../game'
import { DORSO_INICIAL } from './dorsos'
import type { DorsoId } from './dorsos'

/** Reverso de las cartas de cada asiento. Cada jugador ve los dorsos de su rival con el reverso que ESE rival eligió. */
export type DorsosPorAsiento = Record<PlayerId, DorsoId>

const POR_DEFECTO: DorsosPorAsiento = { A: DORSO_INICIAL, B: DORSO_INICIAL }

export const DorsosContext = createContext<DorsosPorAsiento>(POR_DEFECTO)

/** Reversos por asiento del tablero en el que estamos (sin proveedor: todos con el inicial). */
export const useDorsos = (): DorsosPorAsiento => useContext(DorsosContext)
