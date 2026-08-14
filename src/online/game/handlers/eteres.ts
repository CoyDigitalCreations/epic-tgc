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

// FB-004: "Cuando pagues esta carta para invocar un Campeón, ese Campeón gana +1 de RES hasta el final del turno"
registrarEfecto('al-pagar-eter', 'FB-004', (s: GameState, _ctx: Ctx, _inst, payload: PayloadEfecto) => {
  if (payload.contextoUso === 'invocar' && payload.objetivoId) {
    aplicarMod(s, payload.objetivoId, 'resistencia', 1, 'ocaso')
  }
})

// DS-005: "Cuando pagues esta carta para invocar un Campeón, ese Campeón gana +1 de ATQ hasta el final del turno"
registrarEfecto('al-pagar-eter', 'DS-005', (s: GameState, _ctx: Ctx, _inst, payload: PayloadEfecto) => {
  if (payload.contextoUso === 'invocar' && payload.objetivoId) {
    aplicarMod(s, payload.objetivoId, 'poder', 1, 'ocaso')
  }
})

// FB-006: "Cuando pagues esta carta, devuelve un Éter de tu zona de pago (1A) a tu Reserva"
registrarEfecto('al-pagar-eter', 'FB-006', (s: GameState, ctx: Ctx, _inst, payload: PayloadEfecto) => {
  const p = s.players[payload.jugador]
  if (p.eterPagado.length === 0) return
  const idx = Math.floor(ctx.next() * p.eterPagado.length)
  const [id] = p.eterPagado.splice(idx, 1)
  p.eterReserva.push(id)
  ctx.emit({ type: 'eter_reagrupado', jugador: payload.jugador, eterIds: [id] })
})

// DS-007: "Cuando pagues esta carta, el rival devuelve 1 Éter de su zona de pago (1A) a su Reserva"
registrarEfecto('al-pagar-eter', 'DS-007', (s: GameState, ctx: Ctx, _inst, payload: PayloadEfecto) => {
  const rival = payload.jugador === 'A' ? 'B' : 'A'
  const p = s.players[rival]
  if (p.eterPagado.length === 0) return
  const idx = Math.floor(ctx.next() * p.eterPagado.length)
  const [id] = p.eterPagado.splice(idx, 1)
  p.eterReserva.push(id)
  ctx.emit({ type: 'eter_reagrupado', jugador: rival, eterIds: [id] })
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
// por turno podés bloquear 1 Éter de tu Reserva sobre un Campeón sin agotarlo"
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
// Vigor / Carga (keyword temporal, expira en ocaso) a un Campeón propio
// ──────────────────────────────────────────────────────────────────────────────

function registrarInicioChoque(cardId: string, keyword: 'Vigor' | 'Carga') {
  registrarEfecto('al-inicio-choque', cardId, (s: GameState, _ctx: Ctx, _inst, payload: PayloadEfecto) => {
    const p = s.players[payload.jugador]
    const campeones = p.campo.campeones.filter(Boolean)
    if (campeones.length === 0) return
    // Determinista: primer Campeón propio (slot ordenado)
    const primerCampeon = campeones[0]!
    otorgarKeyword(s, primerCampeon, keyword, true) // temporal = expira en ocaso
  })
}

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