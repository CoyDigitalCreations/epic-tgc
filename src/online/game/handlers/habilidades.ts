/**
 * Handlers de HABILIDADES ACTIVAS (ADR-28): coste "(bloqueado)" con aura
 * mientras el Éter siga en eterBloqueado (Aurora FB-010, Ragnar DS-001,
 * Cassandra FB-016, Korr DS-016) y "paga 1 Éter y agota" con 1/turno
 * (opcionUsadaEsteTurno): Seraphina FB-013, Nymeria FB-017, Varek DS-013,
 * Vorlag DS-017.
 *
 * Las auras "Bloqueado" (Cassandra/Korr) se resuelven dinámicamente en
 * aurasDe() — no necesitan handler. Este archivo implementa solo los
 * handlers de trigger 'al-activar-habilidad' para los patrones "Agota" y
 * los patrones "Bloqueado" con targeting (Aurora/Ragnar).
 */

import { registrarEfecto, objetivosCampeonesValidos, statsDe } from '../efectos'
import { destruirCarta } from '../replacements'
import type { GameState, PlayerId } from '../types'

/** Arma un pendiente FIFO de elegir_objetivo si hay objetivos (patrón D1). */
const armarPendiente = (s: GameState, jugador: PlayerId, instId: string, trigger: string, opciones: string[]): void => {
  if (opciones.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), { jugador, instId, trigger, opciones }]
}

export function registrarEfectosHabilidades(): void {
  // ──── Patrón "Agota": paga 1 Éter + agota + 1/turno ────────────────

  // FB-013 Seraphina: "Una vez por turno, paga 1 Éter y agota esta carta:
  // cambia el agotamiento de un Campeón que controla el rival (de agotado a
  // no agotado, o viceversa)."
  registrarEfecto('al-activar-habilidad', 'FB-013', (s, _ctx, _inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const objetivo = s.instances[payload.objetivoId!]
      if (objetivo) objetivo.agotado = !objetivo.agotado
      return
    }
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    armarPendiente(s, payload.jugador, _inst.cardInstanceId, 'al-activar-habilidad',
      objetivosCampeonesValidos(s, rival))
  })

  // FB-017 Nymeria: "Una vez por turno, paga 1 Éter y agota esta carta: libera
  // hasta 2 Éter bloqueados de Campeones que controla el rival (van a la zona
  // de pago de su dueño)."
  registrarEfecto('al-activar-habilidad', 'FB-017', (s, ctx, _inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const objetivo = s.instances[payload.objetivoId!]
      if (!objetivo || !objetivo.eterBloqueado || objetivo.eterBloqueado.length === 0) return
      const liberados = objetivo.eterBloqueado.splice(0, 2)
      const ownerRival: PlayerId = objetivo.owner
      s.players[ownerRival].eterPagado.push(...liberados)
      ctx.emit({ type: 'eter_reagrupado', jugador: ownerRival, eterIds: liberados })
      return
    }
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    const opciones = objetivosCampeonesValidos(s, rival).filter((id) => {
      const inst = s.instances[id]
      return inst && (inst.eterBloqueado?.length ?? 0) > 0
    })
    armarPendiente(s, payload.jugador, _inst.cardInstanceId, 'al-activar-habilidad', opciones)
  })

  // DS-013 Varek: "Una vez por turno, paga 1 Éter y agota esta carta: destruye
  // un Campeón que controla el rival con 3 o menos de RES."
  registrarEfecto('al-activar-habilidad', 'DS-013', (s, ctx, _inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      destruirCarta(s, ctx, payload.objetivoId!, 'efecto')
      return
    }
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    const opciones = objetivosCampeonesValidos(s, rival).filter((id) => {
      const inst = s.instances[id]
      if (!inst) return false
      const stats = statsDe(s, id)
      return stats.resistencia <= 3
    })
    armarPendiente(s, payload.jugador, _inst.cardInstanceId, 'al-activar-habilidad', opciones)
  })

  // DS-017 Vorlag: "Una vez por turno, paga 1 Éter y agota esta carta: toma
  // control de hasta 2 Éter bloqueados en Campeones que controla el rival
  // (van a tu Reserva). Mientras esta carta esté en el campo, controla esos
  // Éteres."
  registrarEfecto('al-activar-habilidad', 'DS-017', (s, ctx, _inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const objetivo = s.instances[payload.objetivoId!]
      if (!objetivo || !objetivo.eterBloqueado || objetivo.eterBloqueado.length === 0) return
      const robados = objetivo.eterBloqueado.splice(0, 2)
      const vorlagController: PlayerId = payload.jugador
      s.players[vorlagController].eterReserva.push(...robados)
      // Trackear que Vorlag controla estos éteres para que no se devuelvan
      // (se elimina si Vorlag sale del campo)
      for (const eId of robados) {
        const eInst = s.instances[eId]
        if (eInst) eInst.stolenBy = _inst.cardInstanceId
      }
      ctx.emit({ type: 'eter_reagrupado', jugador: vorlagController, eterIds: robados })
      return
    }
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    const opciones = objetivosCampeonesValidos(s, rival).filter((id) => {
      const inst = s.instances[id]
      return inst && (inst.eterBloqueado?.length ?? 0) > 0
    })
    armarPendiente(s, payload.jugador, _inst.cardInstanceId, 'al-activar-habilidad', opciones)
  })

  // DS-017 Vorlag: al salir del campo, devuelve los éteres robados a sus
  // dueños originales.
  registrarEfecto('al-ser-enviado-al-cementerio', 'DS-017', (s, _ctx, inst) => {
    const vorlagId = inst.cardInstanceId
    for (const j of ['A', 'B'] as PlayerId[]) {
      for (const eId of s.players[j].eterReserva) {
        const eInst = s.instances[eId]
        if (eInst && eInst.stolenBy === vorlagId) {
          // Devolver al owner original en Reserva (ya están en 2A del dueño
          // del éter, que es el owner de la instancia)
          eInst.stolenBy = undefined
          // No mover — el éter ya está en la reserva del dueño correcto.
          // El stolenBy era solo para control de "mientras esta carta esté
          // en el campo". Al salir Vorlag, se limpia.
        }
      }
    }
  })

  // ──── Patrón "Bloqueado" con targeting (Aurora/Ragnar) ──────────────

  // FB-010 Aurora (Activo): "Paga 2 Éter (bloqueado): mientras ese Éter esté
  // bloqueado, un Campeón que controles gana +2 de ATQ y +2 de RES. Al inicio
  // de tu próxima Alba reagrupa el Éter usado por este efecto."
  // → El bloqueo ocurre en ejecutarActivarHabilidad + marca liberarEnAlba.
  //   El targeting pide elegir un campeón propio; se aplica mod +2/+2
  //   con expira 'alba-dueño' (se purga cuando el éter se libera en Alba).
  registrarEfecto('al-activar-habilidad', 'FB-010', (s, _ctx, _inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const objetivo = s.instances[payload.objetivoId!]
      if (!objetivo) return
      objetivo.modificadores = [
        ...(objetivo.modificadores ?? []),
        { stat: 'poder', valor: 2, expira: 'alba-dueño' },
        { stat: 'resistencia', valor: 2, expira: 'alba-dueño' },
      ]
      return
    }
    // ARMADO: campeones propios válidos (el jugador elige cuál buffear)
    const opciones = objetivosCampeonesValidos(s, payload.jugador)
    armarPendiente(s, payload.jugador, _inst.cardInstanceId, 'al-activar-habilidad', opciones)
  })

  // DS-001 Ragnar (Activo): "Paga 2 Éter (bloqueado): mientras ese Éter esté
  // bloqueado, un Campeón que controla el rival pierde 2 de ATQ y 2 de RES.
  // Al inicio de tu próxima Alba reagrupa el Éter usado por este efecto."
  // → Mismo patrón que Aurora, pero aplica una MODIFICACIÓN al rival en vez
  //   de una aura own-friendly. Se aplica como mod temporal.
  registrarEfecto('al-activar-habilidad', 'DS-001', (s, _ctx, _inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const objetivo = s.instances[payload.objetivoId!]
      if (!objetivo) return
      // Aplica -2/-2 temporal. El modifier se purga cuando el éter se libera
      // (purgarEfectosTemporales).
      const mods: { stat: 'poder' | 'resistencia'; valor: number }[] = [
        { stat: 'poder', valor: -2 },
        { stat: 'resistencia', valor: -2 },
      ]
      for (const mod of mods) {
        objetivo.modificadores = [...(objetivo.modificadores ?? []), {
          stat: mod.stat,
          valor: mod.valor,
          expira: 'alba-dueño', // purgado en Alba del dueño del objetivo
        }]
      }
      return
    }
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    armarPendiente(s, payload.jugador, _inst.cardInstanceId, 'al-activar-habilidad',
      objetivosCampeonesValidos(s, rival))
  })
}
