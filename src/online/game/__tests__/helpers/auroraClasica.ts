/**
 * Fixture: la Aurora «clásica» (diseño previo al rediseño de Estásis).
 *
 * Aurora (FB-010) dejó de robar Campeones: ahora tiene activar_disparo y
 * modificar_regla. Varios tests del motor ejercitan el steal_champion con
 * bloqueo_fijo de 4 Éter, «una vez por turno» y reagrupo en el Alba propia, y
 * ese comportamiento sigue siendo mecánica vigente del motor (el set PR-025
 * Ladrona usa bloqueo_fijo de 2 sin límite por turno). Esta carta sintética
 * conserva el diseño viejo para que esos tests sigan cubriendo la mecánica sin
 * depender de una carta real que cambió.
 *
 * SOLO PARA TESTS.
 */
import { registrarCartas } from '../../cards'
import type { AnyCard } from '../../../../shared/types'

/** Id de la Aurora clásica (steal por bloqueo_fijo 4, una vez por turno). */
export const AURORA_CLASICA = 'TEST-AURORA-CLASICA'

export const CARTA_AURORA_CLASICA = {
  "id": "TEST-AURORA-CLASICA",
  "name": "Aurora Clásica (fixture)",
  "type": "Campeón",
  "rarity": "Única",
  "keywords": [
    "Inmortal"
  ],
  "paqueteId": "test",
  "limiteCopias": "1",
  "createdAt": "2026-08-03T00:00:00.000Z",
  "updatedAt": "2026-10-24T18:15:01.960Z",
  "facciones": [
    "Orden"
  ],
  "esencia": "Céleste",
  "roles": [
    "Soberano"
  ],
  "catHabilidad": [
    "Comandante",
    "Singular"
  ],
  "stats": {
    "cost": 4,
    "poder": 9,
    "resistencia": 9
  },
  "disparoAgota": "No",
  "disparoUnSoloUso": "No",
  "efectos": [
    {
      "tipo": "disparo",
      "efecto": "destroy",
      "objetivo": {
        "tipo": "mistica_arcana",
        "controlador": "rival",
        "zona": "campo"
      },
      "texto": "Puedes pagar 2 Éter, destruye 1 Mística o Arcana que controla el rival.",
      "costo": {
        "tipo": "eter",
        "cantidad": 2
      }
    },
    {
      "tipo": "continuo",
      "efecto": "steal_champion",
      "objetivo": {
        "tipo": "campeon",
        "controlador": "rival",
        "zona": "campo"
      },
      "texto": "Una vez por turno, bloquea 4 Éter, toma control de 1 un Campeón que controla el rival, mientras ese Éter esté bloqueado, Al inicio de tu Alba reagrupa el Éter usado por este efecto.",
      "duracion": "mientras_ester_bloqueado",
      "costo": {
        "tipo": "bloqueo_fijo",
        "cantidad": 4
      },
      "reagrupar": {
        "fase": "alba",
        "turno": "propio"
      },
      "activacion": "una_por_turno"
    }
  ],
  "efectoComandante": {
    "tipo": "pasivo",
    "efecto": "buff",
    "texto": "Todos tus Campeones ganan 2 de ATQ y 2 de RES.",
    "stats": {
      "ATQ": 2,
      "RES": 2
    },
    "objetivo": {
      "tipo": "todos_campeones_propios",
      "controlador": "propio",
      "zona": "campo"
    }
  },
  "flavorText": ""
} as unknown as AnyCard

let registrada = false

/** Registra la Aurora clásica en el catálogo del motor (idempotente). */
export function registrarAuroraClasica(): void {
  if (registrada) return
  registrarCartas([CARTA_AURORA_CLASICA])
  registrada = true
}
