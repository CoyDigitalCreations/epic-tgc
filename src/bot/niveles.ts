/**
 * Calibración (arena, 92+ partidas, % de victorias contra el Difícil): Fácil ≈ 23%, Medio ≈ 40%. El ruido es la palanca principal del nivel.
 * Los tres niveles del bot nuevo: el mismo motor de búsqueda con distinta profundidad, presupuesto y dosis de error.
 */
import type { Bot } from './arena'
import { CONFIG } from './busqueda'
import type { Config } from './busqueda'
import { crearBotBusqueda } from './dificil'

export const CONFIG_FACIL: Config = { ...CONFIG, profundidad: 2, anchoRival: 1, presupuesto: 120, ruido: 0.7 }
export const CONFIG_MEDIO: Config = { ...CONFIG, profundidad: 4, anchoRival: 2, presupuesto: 500, ruido: 0.12 }
export const CONFIG_DIFICIL: Config = CONFIG

export const botFacilNuevo: Bot = crearBotBusqueda(CONFIG_FACIL)
export const botMedioNuevo: Bot = crearBotBusqueda(CONFIG_MEDIO)
export const botDificilNuevo: Bot = crearBotBusqueda(CONFIG_DIFICIL)
