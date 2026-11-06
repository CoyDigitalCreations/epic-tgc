/**
 * Fixture: el Éter del Viento «clásico» (DS-006 antes del rediseño de Disonancia, Lote 2).
 *
 * DS-006 era un Pasivo 1A de pago: «Bloquea 1 Éter de tu Reserva sobre un Campeón que pueda recibir Éter bloqueado, una vez por turno».
 * Con el rediseño pasó a «mover hasta 2 Éter de la Reserva del rival a su zona de pago» y ya no bloquea. Varios tests del Éter externo
 * (etiquetado #ext, cupo de Aurora, regreso al salir) ejercitan esa mecánica, que sigue vigente en el motor, así que esta carta sintética
 * conserva el diseño viejo (tomado del seed de entonces, `balance/test/disonancia-legado.json`) para no depender de una carta real que cambió.
 *
 * SOLO PARA TESTS.
 */
import { registrarCartas } from '../../cards'
import type { AnyCard } from '../../../../shared/types'
import disonanciaLegado from '../../../../balance/test/disonancia-legado.json'

/** Id del Éter del Viento clásico (Pasivo 1A que bloquea 1 Éter sobre un Campeón). */
export const ETER_BLOQUEA_CLASICO = 'TEST-ETER-BLOQUEA-CLASICO'

export const CARTA_ETER_BLOQUEA_CLASICO = {
  ...(disonanciaLegado as unknown as AnyCard[]).find((c) => c.id === 'DS-006')!,
  id: ETER_BLOQUEA_CLASICO,
} as AnyCard

let registrada = false

/** Registra el Éter clásico en el catálogo del motor (idempotente). */
export function registrarEterBloqueaClasico(): void {
  if (registrada) return
  registrarCartas([CARTA_ETER_BLOQUEA_CLASICO])
  registrada = true
}
