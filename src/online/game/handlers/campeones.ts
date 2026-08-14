/**
 * Handlers de efectos de CAMPEONES (ADR-21/28): al-invocar (Aurora control
 * prestado, Ragnar destruir), al-atacar (Vaela, Kael), al-matar-en-combate
 * (Draven), auras de campo en statsDe (Isolde, Thane, Elena, Marek),
 * Transmutar de Mira y targeting con Protector (ADR-24).
 *
 * C1 (esqueleto): la estructura queda definida; los handlers reales se registran
 * en el commit C3 (campeones.test.ts RED → GREEN). C3b: auras de campo (D6).
 */
import { aplicarMod, objetivosCampeonesValidos, registrarAuraCampo, registrarEfecto } from '../efectos'
import { destruirCarta } from '../replacements'
import { copiasEnCampo } from '../campo'
import { slotAZona } from '../zones'
import type { GameState, PlayerId } from '../types'

/** Controlador actual de una instancia = campo donde está (D2: al robar
 * control la instancia se MUEVE; owner NO cambia). Solo miran los campeones. */
function controladorDe(s: GameState, id: string): PlayerId | null {
  for (const j of ['A', 'B'] as PlayerId[]) {
    if (s.players[j].campo.campeones.includes(id)) return j
  }
  return null
}

/** Rival del controlador de una instancia (para auras que miran al rival). */
function rivalDe(s: GameState, id: string): PlayerId | null {
  const c = controladorDe(s, id)
  return c ? (c === 'A' ? 'B' : 'A') : null
}

export function registrarEfectosCampeones(): void {
  // Auras de campo (D6): Σ aditivo en statsDe vía aurasDe. Solo campo propio
  // (el scan de aurasDe itera el campo donde está el objetivo).

  // FB-014 Isolde: "Los OTROS Campeones que controles ganan +1/+1".
  registrarAuraCampo('FB-014', (_s, fuente, objetivo) => {
    if (objetivo === fuente) return null
    return { atq: 1, res: 1 }
  })

  // DS-014 Thane: "Los OTROS Campeones que controlas ganan +1 de ATQ".
  registrarAuraCampo('DS-014', (_s, fuente, objetivo) => {
    if (objetivo === fuente) return null
    return { atq: 1 }
  })

  // FB-015 Elena: "Mientras esta carta tenga ≥1 Éter bloqueado, gana +1 ATQ".
  registrarAuraCampo('FB-015', (s, fuente, objetivo) => {
    if (objetivo !== fuente) return null
    if ((s.instances[fuente]?.eterBloqueado?.length ?? 0) < 1) return null
    return { atq: 1 }
  })

  // DS-015 Marek: "Mientras un Campeón que controla el RIVAL tenga ≥1 Éter
  // bloqueado, esta carta gana +1 ATQ".
  registrarAuraCampo('DS-015', (s, fuente, objetivo) => {
    if (objetivo !== fuente) return null
    const rival = rivalDe(s, fuente)
    if (!rival) return null
    const rivalConEter = s.players[rival].campo.campeones.some((id) => {
      if (id === null) return false
      return (s.instances[id]?.eterBloqueado?.length ?? 0) >= 1
    })
    if (!rivalConEter) return null
    return { atq: 1 }
  })

  // C3c (D7): handlers con targeting — patrón D1: el handler ARMA el pendiente
  // cuando NO viene `contextoUso: 'objetivo-elegido'`; la resolución (acción
  // elegir_objetivo) re-despacha el MISMO trigger con ese contextoUso y el
  // handler APLICA el efecto sobre objetivoId.

  /** Arma un pendiente FIFO de elegir_objetivo si hay objetivos (D1). */
  const armarPendiente = (s: GameState, jugador: PlayerId, instId: string, trigger: string, opciones: string[]): void => {
    if (opciones.length === 0) return
    s.objetivosPendientes = [...(s.objetivosPendientes ?? []), { jugador, instId, trigger, opciones }]
  }

  // FB-010 Aurora: "Al ser invocada, toma control de un Campeón que controla
  // el rival. Ese Campeón queda agotado hasta el inicio de tu próxima Alba."
  registrarEfecto('al-invocar', 'FB-010', (s, ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      // RESOLUCIÓN (D2): la instancia se MUEVE a un slot libre del campo del
      // controlador; owner NO cambia (muere → 2G del dueño, fix moverAlCementerio).
      const objetivoId = payload.objetivoId!
      const objetivo = s.instances[objetivoId]
      if (!objetivo) return
      const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
      const campo = s.players[payload.jugador].campo.campeones
      const slotLibre = campo.indexOf(null)
      const idxRival = s.players[rival].campo.campeones.indexOf(objetivoId)
      if (slotLibre === -1 || idxRival === -1) return // defensivo: opciones ya filtradas
      s.players[rival].campo.campeones[idxRival] = null
      campo[slotLibre] = objetivoId
      objetivo.agotado = true
      const zonaRival = slotAZona('campeones', idxRival)
      const zonaNueva = slotAZona('campeones', slotLibre)
      if (zonaRival) ctx.emit({ type: 'carta_salida_de_zona', cardInstanceId: objetivoId, zona: zonaRival, jugador: rival })
      if (zonaNueva) ctx.emit({ type: 'carta_entrada_a_zona', cardInstanceId: objetivoId, zona: zonaNueva, jugador: payload.jugador, bocaArriba: true })
      return
    }
    // ARMADO (D1): campeones rivales válidos (Protector D3) con slot libre en
    // el campo del controlador y sin romper Singular del controlador (D2).
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    if (!s.players[payload.jugador].campo.campeones.includes(null)) return
    const opciones = objetivosCampeonesValidos(s, rival).filter((id) => {
      const m = s.instances[id]?.cardId ?? null // undefined (instancia ausente) → null
      return m !== null && copiasEnCampo(s, payload.jugador, m) < 1
    })
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-invocar', opciones)
  })

  // DS-001 Ragnar: "Al ser invocada, destruye un Campeón que controla el rival".
  registrarEfecto('al-invocar', 'DS-001', (s, ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      // RESOLUCIÓN: causa 'efecto' (Inmortal previene → destruccion_prevenida)
      destruirCarta(s, ctx, payload.objetivoId!, 'efecto')
      return
    }
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-invocar', objetivosCampeonesValidos(s, rival))
  })

  // FB-011 Vaela: "Al atacar, agotá un Campeón que controla el rival".
  registrarEfecto('al-atacar', 'FB-011', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      const objetivo = s.instances[payload.objetivoId!]
      if (objetivo) objetivo.agotado = true
      return
    }
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-atacar', objetivosCampeonesValidos(s, rival))
  })

  // DS-011 Kael: "Al atacar, el objetivo pierde 1 de ATQ hasta el final del turno".
  registrarEfecto('al-atacar', 'DS-011', (s, _ctx, inst, payload) => {
    if (payload.contextoUso === 'objetivo-elegido') {
      aplicarMod(s, payload.objetivoId!, 'poder', -1, 'ocaso')
      return
    }
    const rival: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    armarPendiente(s, payload.jugador, inst.cardInstanceId, 'al-atacar', objetivosCampeonesValidos(s, rival))
  })

  // DS-012 Draven: "Cuando esta carta destruye a un Campeón en combate, el
  // rival pierde 1 Éter de su Éter Pagado (→ Reserva, reagrupado 1A→2A).
  // El dispatch de resolverCombate incluye al KILLER en instancias (C3c): este
  // handler se keyea por el cardId del asesino y descarta el caso donde Draven
  // es la VÍCTIMA (killerId ≠ esta instancia).
  registrarEfecto('al-matar-en-combate', 'DS-012', (s, ctx, inst, payload) => {
    if (payload.killerId !== inst.cardInstanceId) return // Draven es la víctima → no-op
    // Controlador de la víctima = rival del controlador del killer (snapshot D5:
    // el killer pudo morir en la MISMA resolución y ya no está en campo).
    const victimaController: PlayerId = payload.jugador === 'A' ? 'B' : 'A'
    const p = s.players[victimaController]
    const eterId = p.eterPagado[0] // primero, orden estable → determinista (D7)
    if (!eterId) return // sin Éteres en 1A → no-op
    p.eterPagado = p.eterPagado.slice(1)
    p.eterReserva = [...p.eterReserva, eterId]
    ctx.emit({ type: 'eter_reagrupado', jugador: victimaController, eterIds: [eterId] })
  })
}
