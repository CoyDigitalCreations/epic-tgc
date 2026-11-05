/**
 * Normalización única de `efectoComandante`.
 *
 * Una carta puede traer UN efecto de Comandante (objeto, formato histórico: Ragnar y las cartas de prueba) o VARIOS
 * (arreglo: Aurora lleva un incremento y una regla). Todo consumidor lee el campo a través de `efectosComandante`.
 */
import type { EfectoData } from './types/cards'

export function efectosComandante(valor: EfectoData | EfectoData[] | null | undefined): EfectoData[] {
  if (!valor) return []
  return Array.isArray(valor) ? valor : [valor]
}
