import { ALL_CARDS } from '../../shared/data/paquetes'
import { cargarCartas } from '../cargador'
import type { CartaBalance } from '../tipos'

/** Las 65 cartas publicadas ya normalizadas, para los tests de las vistas. */
const carga = cargarCartas(ALL_CARDS)
export const CARTAS: CartaBalance[] = carga.cartas
export const AVISOS: string[] = carga.avisos

export function carta(nombre: string): CartaBalance {
  const c = CARTAS.find((x) => x.nombre.startsWith(nombre))
  if (!c) throw new Error(`Falta la carta ${nombre}`)
  return c
}
