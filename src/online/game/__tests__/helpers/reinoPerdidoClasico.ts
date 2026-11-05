/**
 * Fixture: El Reino Perdido «clásico» (diseño previo al rediseño de Estásis).
 *
 * El Reino Perdido (FB-023) dejó de robar con candado en el Alba: ahora recupera
 * a la mano un Campeón que va al Cementerio (trigger cuando_campeon_propio_al_cementerio).
 * Varios tests del motor usan una Arcana de coste 2 con candado inicio_alba, condición
 * «controlar mínimo 2 Campeones con Éter bloqueado» y recompensa de robar 2: la mecánica
 * de candado y de Arcana de un solo uso sigue vigente, así que esta carta sintética
 * conserva el diseño viejo para esos tests.
 *
 * SOLO PARA TESTS.
 */
import { registrarCartas } from '../../cards'
import type { AnyCard } from '../../../../shared/types'

/** Id del Reino Perdido clásico (Arcana coste 2, candado inicio_alba, roba 2). */
export const REINO_PERDIDO_CLASICO = 'TEST-REINO-PERDIDO-CLASICO'

export const CARTA_REINO_PERDIDO_CLASICO = {
  "id": "TEST-REINO-PERDIDO-CLASICO",
  "name": "El Reino Perdido (clásico)",
  "type": "Arcana",
  "rarity": "Rara",
  "keywords": [],
  "flavorText": "",
  "paqueteId": "test",
  "limiteCopias": "3",
  "createdAt": "2026-08-03T00:00:00.000Z",
  "updatedAt": "2026-09-24T05:23:08.788Z",
  "stats": {
    "cost": 2
  },
  "condicion": {
    "trigger": "inicio_alba",
    "condiciones": [
      {
        "tipo": "controlar_minimo",
        "cantidad": 2,
        "objetivo": {
          "tipo": "campeon",
          "controlador": "propio",
          "filtros": {
            "conEterBloqueado": true
          }
        }
      }
    ]
  },
  "recompensa": "Roba 2 cartas y un Campeón que controles gana +3 de Poder hasta el final del turno.",
  "efectos": [
    {
      "tipo": "hechizo",
      "efecto": "draw",
      "objetivo": {
        "tipo": "carta",
        "controlador": "propio",
        "zona": "mazo",
        "filtros": {}
      },
      "texto": "Roba 2 carta de tu mazo.",
      "cantidad": 2
    }
  ]
} as unknown as AnyCard

let registrada = false

/** Registra el Reino Perdido clásico en el catálogo del motor (idempotente). */
export function registrarReinoPerdidoClasico(): void {
  if (registrada) return
  registrarCartas([CARTA_REINO_PERDIDO_CLASICO])
  registrada = true
}
