/**
 * Handlers de efectos de ÉTER (ADR-25): auras derivadas por zona (2A/1A/bloqueado)
 * evaluadas en statsDe + gatillos al pagar (variantePago=Gatillo) en aplicarPago.
 *
 * C2: handlers reales — auras reserva/bloqueo, Pasivo 1A, gatillos al-pagar-eter, inicio-choque.
 */
import {
  registrarEfecto,
  registrarAuraReserva,
  registrarAuraBloqueo,
  aplicarMod,
  otorgarKeyword,
} from '../efectos'
import type { Ctx, GameState, PlayerId } from '../types'
import { robarCarta } from '../phases'
import { getCardMeta, faccionesCompartidas } from '../cards'
import { enviarAlCementerio } from '../replacements'
import type { PayloadEfecto } from '../efectos'

// ──────────────────────────────────────────────────────────────────────────────
// AURAS DE RESERVA (2A): fn(eterInst, eterMeta, championOwner, eterOwner) → { poder?, resistencia?, keywords?[] } | null
// FB-001: aplica si championOwner === eterOwner (propios)
// DS-002: aplica si championOwner !== eterOwner (rivales)
// ──────────────────────────────────────────────────────────────────────────────

// FB-001: "Mientras esté en tu Reserva, los Campeones que controles ganan +1 de ATQ"
registrarAuraReserva('FB-001', (_eterInst, _eterMeta, championOwner, eterOwner) => {
  if (championOwner !== eterOwner) return null
  return { poder: 1, resistencia: 0, keywords: [] }
})

// DS-002: "Mientras esté en tu Reserva, los Campeones que controla el rival pierden 1 de ATQ"
registrarAuraReserva('DS-002', (_eterInst, _eterMeta, championOwner, eterOwner) => {
  if (championOwner === eterOwner) return null
  return { poder: -1, resistencia: 0, keywords: [] }
})

// ──────────────────────────────────────────────────────────────────────────────
// AURAS DE BLOQUEO (1B-1F): fn(eterInst, eterMeta) → { poder?, resistencia?, keywords?[] }
// Afectan SOLO al Campeón anfitrión (el que tiene el Éter en eterBloqueado)
// ──────────────────────────────────────────────────────────────────────────────

// FB-007 / DS-008: +2/+2
const auraMas2Mas2 = () => ({ poder: 2, resistencia: 2, keywords: [] })
registrarAuraBloqueo('FB-007', auraMas2Mas2)
registrarAuraBloqueo('DS-008', auraMas2Mas2)

// FB-008: Inmortal
registrarAuraBloqueo('FB-008', () => ({ poder: 0, resistencia: 0, keywords: ['Inmortal'] }))

// DS-009: Indestructible
registrarAuraBloqueo('DS-009', () => ({ poder: 0, resistencia: 0, keywords: ['Indestructible'] }))

// FB-009: +1 RES
registrarAuraBloqueo('FB-009', () => ({ poder: 0, resistencia: 1, keywords: [] }))

// DS-010: +1 ATQ
registrarAuraBloqueo('DS-010', () => ({ poder: 1, resistencia: 0, keywords: [] }))

// ──────────────────────────────────────────────────────────────────────────────
// GATILLOS AL-PAGAR-ETER (variantePago='Gatillo')
// dispararTrigger(s, ctx, 'al-pagar-eter', jugador, [eterId], { contextoUso, objetivoId })
// ──────────────────────────────────────────────────────────────────────────────

function registrarGatillos(): void {
// FB-003: "Cuando pagues esta carta, robá 1 carta"
registrarEfecto('al-pagar-eter', 'FB-003', (s: GameState, ctx: Ctx, _inst, payload: PayloadEfecto) => {
  robarCarta(s, ctx, payload.jugador)
})

// FB-004: "Cuando pagues esta carta para invocar un Campeón, ese Campeón gana +1 de RES hasta el final del próximo turno"
registrarEfecto('al-pagar-eter', 'FB-004', (s: GameState, _ctx: Ctx, _inst, payload: PayloadEfecto) => {
  if (payload.contextoUso === 'invocar' && payload.objetivoId) {
    aplicarMod(s, payload.objetivoId, 'resistencia', 1, 'ocaso', 2)
  }
})

// DS-005: "Cuando pagues esta carta para invocar un Campeón, ese Campeón gana +1 de ATQ hasta el final del próximo turno"
registrarEfecto('al-pagar-eter', 'DS-005', (s: GameState, _ctx: Ctx, _inst, payload: PayloadEfecto) => {
  if (payload.contextoUso === 'invocar' && payload.objetivoId) {
    aplicarMod(s, payload.objetivoId, 'poder', 1, 'ocaso', 2)
  }
})

// FB-006: "Cuando pagues esta carta, devuelve un Éter de tu zona de pago (1A) a tu Reserva"
// Patrón D1: primer call arma pendiente; segundo call (objetivo-elegido) aplica.
registrarEfecto('al-pagar-eter', 'FB-006', (s: GameState, ctx: Ctx, inst, payload: PayloadEfecto) => {
  // RESOLUCIÓN: el jugador ya eligió el éter
  if (payload.contextoUso === 'objetivo-elegido') {
    const objetivoId = payload.objetivoId!
    const p = s.players[payload.jugador]
    const idx = p.eterPagado.indexOf(objetivoId)
    if (idx === -1) return
    p.eterPagado.splice(idx, 1)
    p.eterReserva.push(objetivoId)
    ctx.emit({ type: 'eter_reagrupado', jugador: payload.jugador, eterIds: [objetivoId] })
    return
  }
  // ARMADO: armar pendiente con los éteres en zona de pago (1A)
  const p = s.players[payload.jugador]
  if (p.eterPagado.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), {
    jugador: payload.jugador,
    instId: inst.cardInstanceId,
    trigger: 'al-pagar-eter',
    opciones: [...p.eterPagado],
  }]
})

// DS-007: "Cuando pagues esta carta, el rival devuelve 1 Éter de su zona de pago (1A) a su Reserva"
// Patrón D1: primer call arma pendiente para el RIVAL; segundo call aplica.
registrarEfecto('al-pagar-eter', 'DS-007', (s: GameState, ctx: Ctx, inst, payload: PayloadEfecto) => {
  const rival = payload.jugador === 'A' ? 'B' : 'A'
  // RESOLUCIÓN: el rival ya eligió el éter
  if (payload.contextoUso === 'objetivo-elegido') {
    const objetivoId = payload.objetivoId!
    const p = s.players[rival]
    const idx = p.eterPagado.indexOf(objetivoId)
    if (idx === -1) return
    p.eterPagado.splice(idx, 1)
    p.eterReserva.push(objetivoId)
    ctx.emit({ type: 'eter_reagrupado', jugador: rival, eterIds: [objetivoId] })
    return
  }
  // ARMADO: armar pendiente para el RIVAL con sus éteres en 1A
  const p = s.players[rival]
  if (p.eterPagado.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), {
    jugador: rival,
    instId: inst.cardInstanceId,
    trigger: 'al-pagar-eter',
    opciones: [...p.eterPagado],
  }]
})

// DS-004: "Cuando pagues esta carta, el rival pierde 1 carta de su mano al azar"
registrarEfecto('al-pagar-eter', 'DS-004', (s: GameState, ctx: Ctx, _inst, payload: PayloadEfecto) => {
  const rival = payload.jugador === 'A' ? 'B' : 'A'
  const p = s.players[rival]
  if (p.mano.length === 0) return
  const idx = Math.floor(ctx.next() * p.mano.length)
  const [id] = p.mano.splice(idx, 1)
  // C5 (change 4): 2G con trigger al-ser-enviado-al-cementerio (carta descartada)
  enviarAlCementerio(s, ctx, id)
  ctx.emit({ type: 'carta_descartada', jugador: rival, cardInstanceIds: [id] })
})
}

// ──────────────────────────────────────────────────────────────────────────────
// PASIVO 1A — FB-005 / DS-006: "Mientras esté en tu zona de Éter pagado, una vez
// por turno puedes bloquear 1 Éter de tu Reserva sobre un Campeón sin agotarlo"
// Se dispara en al-inicio-alba (ANTES de reagrupar, instancias = eterPagado)
// ──────────────────────────────────────────────────────────────────────────────

function hayParejaValida(s: GameState, jugador: PlayerId): boolean {
  const p = s.players[jugador]
  if (!p.campo.campeones.some(Boolean)) return false // sin Campeón
  // Buscar Éter en Reserva compatible con algún Campeón propio
  for (const eterId of p.eterReserva) {
    const metaE = s.instances[eterId]?.cardId ? getCardMeta(s.instances[eterId]!.cardId!) : null
    if (!metaE) continue
    for (const campeonId of p.campo.campeones) {
      if (!campeonId) continue
      const metaC = s.instances[campeonId]?.cardId ? getCardMeta(s.instances[campeonId]!.cardId!) : null
      if (metaC && faccionesCompartidas(metaE.facciones, metaC.facciones)) return true
    }
  }
  return false
}

function registrarPasivo(cardId: string) {
  registrarEfecto('al-inicio-alba', cardId, (s: GameState, _ctx: Ctx, inst, payload: PayloadEfecto) => {
    const j = payload.jugador
    // Reset 1/turno (el flag vive en la instancia del Éter Pasivo)
    inst.opcionUsadaEsteTurno = false
    if (!hayParejaValida(s, j)) return
    s.opcionesPendientes = [...(s.opcionesPendientes ?? []), { jugador: j, eterId: inst.cardInstanceId }]
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// INICIO-CHOQUE — FB-002 / DS-003: en 2A al inicio de tu Choque otorgan
// Vigor / Carga (keyword temporal, expira en ocaso) a un Campeón propio.
// Patrón D1: primer call arma pendiente; segundo call (objetivo-elegido) aplica.
// ──────────────────────────────────────────────────────────────────────────────

function registrarInicioChoque(cardId: string, keyword: 'Vigor' | 'Carga') {
  registrarEfecto('al-inicio-choque', cardId, (s: GameState, _ctx: Ctx, inst, payload: PayloadEfecto) => {
    // RESOLUCIÓN: el jugador ya eligió el campeón
    if (payload.contextoUso === 'objetivo-elegido') {
      const objetivoId = payload.objetivoId!
      if (!s.instances[objetivoId]) return
      otorgarKeyword(s, objetivoId, keyword, true) // temporal = expira en ocaso
      return
    }
    // ARMADO: armar pendiente con los campeones propios del jugador
    const p = s.players[payload.jugador]
    const opciones = p.campo.campeones.filter((id): id is string => id !== null)
    if (opciones.length === 0) return
    s.objetivosPendientes = [...(s.objetivosPendientes ?? []), {
      jugador: payload.jugador,
      instId: inst.cardInstanceId,
      trigger: 'al-inicio-choque',
      opciones,
    }]
  })
}

// ──────────────────────────────────────────────────────────────────────────────
// ARCANA INICIO-CHOQUE — FB-023 / DS-023: se activan al inicio del Choque
// si se cumple la condición. Patrón D1: primer call arma pendiente,
// segundo call (objetivo-elegido) aplica el efecto.
// ──────────────────────────────────────────────────────────────────────────────

/** Helper: cuenta campeones de un jugador que tienen al menos 1 éter bloqueado */
function campeonesConEterBloqueado(s: GameState, jugador: PlayerId): string[] {
  return s.players[jugador].campo.campeones.filter((id): id is string => {
    if (!id) return false
    const inst = s.instances[id]
    return (inst?.eterBloqueado?.length ?? 0) >= 1
  })
}

// FB-023 El Reino Perdido: "Al inicio de tu Choque, si controlas 2+ Campeones con
// Éter bloqueado → Roba 2 cartas y un Campeón que controles gana +3 de Poder
// hasta el final del turno."
registrarEfecto('al-inicio-choque', 'FB-023', (s, ctx, inst, payload) => {
  // RESOLUCIÓN: el jugador ya eligió el campeón para +3 Poder
  if (payload.contextoUso === 'objetivo-elegido') {
    const objetivoId = payload.objetivoId!
    if (!s.instances[objetivoId]) return
    aplicarMod(s, objetivoId, 'poder', 3, 'ocaso') // expira al final del turno
    robarCarta(s, ctx, payload.jugador)
    robarCarta(s, ctx, payload.jugador)
    return
  }
  // ARMADO: verificar condición (2+ campeones con éter bloqueado)
  const opciones = campeonesConEterBloqueado(s, payload.jugador)
  if (opciones.length < 2) return // condición no cumplida
  // armar pendiente con los campeones propios para elegir cuál gana +3
  const campeonesPropios = s.players[payload.jugador].campo.campeones.filter((id): id is string => id !== null)
  if (campeonesPropios.length === 0) return
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), {
    jugador: payload.jugador,
    instId: inst.cardInstanceId,
    trigger: 'al-inicio-choque',
    opciones: campeonesPropios,
  }]
})

// DS-023 El Nudo: "Al inicio de tu Choque, si el rival controla 2+ Campeones con
// Éter bloqueado → un Campeón que controla el rival pierde 3 de RES de forma
// permanente. Roba 1 carta."
registrarEfecto('al-inicio-choque', 'DS-023', (s, ctx, inst, payload) => {
  const rival = payload.jugador === 'A' ? 'B' : 'A'
  // RESOLUCIÓN: el jugador ya eligió el campeón rival para -3 RES
  if (payload.contextoUso === 'objetivo-elegido') {
    const objetivoId = payload.objetivoId!
    if (!s.instances[objetivoId]) return
    aplicarMod(s, objetivoId, 'resistencia', -3, 'permanente') // permanente
    robarCarta(s, ctx, payload.jugador)
    return
  }
  // ARMADO: verificar condición (rival tiene 2+ campeones con éter bloqueado)
  const opcionesRival = campeonesConEterBloqueado(s, rival)
  if (opcionesRival.length < 2) return // condición no cumplida
  // armar pendiente: el JUGADOR ELIGE qué campeón rival pierde RES
  s.objetivosPendientes = [...(s.objetivosPendientes ?? []), {
    jugador: payload.jugador,
    instId: inst.cardInstanceId,
    trigger: 'al-inicio-choque',
    opciones: opcionesRival,
  }]
})

// ──────────────────────────────────────────────────────────────────────────────
// EXPORT — registra los handlers de trigger al llamar registrarEfectos()
// (patrón ADR-20 de familias: sobreviven a limpiarRegistroEfectos en tests).
// Las auras por zona (reserva/bloqueo) se registran a nivel módulo porque
// viven en mapas propios que limpiarRegistroEfectos NO toca.
// ──────────────────────────────────────────────────────────────────────────────

export function registrarEfectosEteres(): void {
  registrarGatillos()
  registrarPasivo('FB-005')
  registrarPasivo('DS-006')
  registrarInicioChoque('FB-002', 'Vigor')
  registrarInicioChoque('DS-003', 'Carga')
}