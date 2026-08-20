import { registrarEfectosCampeones } from './campeones'
import { registrarEfectosCombate } from './combate'
import { registrarEfectosEteres } from './eteres'
import { registrarEfectosHabilidades } from './habilidades'
import { registrarEfectosSoporte } from './soporte'
import { registrarEfectosVinculos } from './vinculos'
import { registrarGuardsArcanas } from '../effects-guards'

/**
 * Registra TODOS los handlers de efectos de cartas (ADR-20). C1 define el
 * esqueleto por familia (vacío); cada commit C2-C6 puebla la suya. index.ts lo
 * invoca al importar el motor (patrón registrarEfectos, ADR-20).
 */
export function registrarEfectos(): void {
  registrarEfectosEteres()
  registrarEfectosCampeones()
  registrarEfectosHabilidades()
  registrarEfectosSoporte()
  registrarEfectosVinculos()
  registrarEfectosCombate()
  registrarGuardsArcanas()
}
