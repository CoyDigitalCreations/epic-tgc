import type { CartaBalance } from '../tipos'

/** Props comunes de las vistas. `ancho` y `alto` fijan la gráfica (los tests); sin ellos se adapta al contenedor. */
export interface PropsVista {
  /** Cartas visibles (ya filtradas). */
  cartas: CartaBalance[]
  ancho?: number
  alto?: number
}

/**
 * Vistas que calculan sobre el conjunto completo (simulación, pool de letalidad, exportación) y
 * solo muestran lo filtrado. Si falta `publicadas`, se usa `cartas`. La referencia nunca va aquí.
 */
export interface PropsVistaConPool extends PropsVista {
  publicadas?: CartaBalance[]
}
