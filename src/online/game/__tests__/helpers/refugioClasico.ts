/**
 * Fixture: el Último Refugio «clásico» (diseño previo al rediseño de Estásis).
 *
 * Último Refugio (FB-022) dejó de copiar y ahora cambia el agotamiento de tus
 * Campeones agotados. La mecánica de copy con bloqueo_fijo de 3 Éter (Mística
 * Fugaz, «solo una vez mientras siga bloqueado») sigue vigente en el motor y en
 * la UI, así que esta carta sintética conserva el diseño viejo para que esos
 * tests sigan cubriéndola sin depender de una carta real que cambió.
 *
 * SOLO PARA TESTS.
 */
import { registrarCartas } from '../../cards'
import type { AnyCard } from '../../../../shared/types'

/** Id del Refugio clásico (Mística Fugaz, copy, bloqueo_fijo 3). */
export const REFUGIO_CLASICO = 'TEST-REFUGIO-CLASICO'

export const CARTA_REFUGIO_CLASICO = {
  "id": "TEST-REFUGIO-CLASICO",
  "name": "Último Refugio (clásico)",
  "type": "Mística",
  "rarity": "Común",
  "keywords": [
    "Fugaz"
  ],
  "flavorText": "",
  "paqueteId": "test",
  "limiteCopias": "3",
  "createdAt": "2026-08-03T00:00:00.000Z",
  "updatedAt": "2026-10-22T01:00:26.833Z",
  "stats": {
    "cost": 3
  },
  "efectos": [
    {
      "tipo": "hechizo",
      "efecto": "copy",
      "objetivo": {
        "tipo": "mistica_arcana",
        "controlador": "rival",
        "zona": "campo"
      },
      "texto": "Bloquea 3 Éter (solo una vez mientras siga bloqueado), copia el efecto de hechizo, el efecto continuo y la recompensa de una Mística o Arcana que controla el rival, mientras ese Éter esté bloqueado.",
      "duracion": "mientras_ester_bloqueado",
      "costo": {
        "tipo": "bloqueo_fijo",
        "cantidad": 3
      },
      "copyAttributes": [
        "mistica_hechizo",
        "mistica_continuo",
        "arcana_recompensa"
      ],
      "activacion": "una_mientras_bloqueado"
    }
  ]
} as unknown as AnyCard

let registrada = false

/** Registra el Refugio clásico en el catálogo del motor (idempotente). */
export function registrarRefugioClasico(): void {
  if (registrada) return
  registrarCartas([CARTA_REFUGIO_CLASICO])
  registrada = true
}
