import type { Bot } from './arena'
import { botBase } from './base'
import { CONFIG } from './busqueda'
import type { Config } from './busqueda'
import { crearBotBusqueda } from './dificil'
import { botDificilNuevo, botFacilNuevo, botMedioNuevo } from './niveles'

/** Todos los bots que la arena sabe enfrentar, por nombre. */
export const BOTS: Record<string, Bot> = {
  'base-facil': botBase('facil'),
  'base-medio': botBase('medio'),
  'base-dificil': botBase('dificil'),
  facil: botFacilNuevo,
  medio: botMedioNuevo,
  dificil: botDificilNuevo,
}

/**
 * Un bot por nombre, o uno ad hoc para afinar niveles: `cfg:prof=2,pres=120,ancho=1,ruido=0.35` (lo no indicado queda como el Difícil).
 */
export function resolverBot(nombre: string): Bot | undefined {
  if (!nombre.startsWith('cfg:')) return BOTS[nombre]
  const cfg: Config = { ...CONFIG }
  for (const par of nombre.slice(4).split(',')) {
    const [k, v] = par.split('=')
    const n = Number(v)
    if (k === 'prof') cfg.profundidad = n
    else if (k === 'pres') cfg.presupuesto = n
    else if (k === 'ancho') cfg.anchoRival = n
    else if (k === 'ruido') cfg.ruido = n
  }
  return crearBotBusqueda(cfg)
}
