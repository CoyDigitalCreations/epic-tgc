/**
 * Handlers de VÍNCULOS DESTRUIDOS (ADR-27): hook al-ser-destruido-vinculo
 * ANTES de verificar derrota (sexto Vínculo incluido) — one-shot (FB-026/027/028/030,
 * DS-026/027/028/030) y periódicos en la Alba del dueño mientras bocaArriba
 * (FB-025/029, DS-025/029). Skarn DS-018 es la excepción §5.7 (inicio-choque).
 *
 * §5.5: al destruirse, activa su efecto PERMANENTE a favor del jugador que recibió el daño.
 */
import { aplicarMod, objetivosCampeonesValidos, otorgarKeyword, registrarEfecto } from '../efectos'
import { registrarEfectoPendiente } from '../effectRegistry'
import { enviarAlCementerio, liberarEterBloqueado, moverAlCementerio } from '../replacements'
import type { GameState, PlayerId } from '../types'

/** Busca el campeón con mayor stat en el campo del jugador. */
function campeonConMayorStat(s: GameState, jugador: PlayerId, stat: 'poder' | 'resistencia'): string | null {
  const campeones = s.players[jugador].campo.campeones.filter((id): id is string => id !== null)
  if (campeones.length === 0) return null
  let mejor = campeones[0]
  let mejorValor = -1
  for (const id of campeones) {
    const inst = s.instances[id]
    if (!inst) continue
    const base = stat === 'poder' ? (inst.poder ?? 0) : (inst.resistencia ?? 0)
    const mods = (inst.modificadores ?? []).reduce((acc, m) => m.stat === stat ? acc + m.valor : acc, 0)
    const valor = base + mods
    if (valor > mejorValor) {
      mejorValor = valor
      mejor = id
    }
  }
  return mejor
}

export function registrarEfectosVinculos(): void {
  // ═══════════════════════════════════════════════════════════════════
  // ONE-SHOT: se resuelven UNA VEZ al destruirse el Vínculo
  // ═══════════════════════════════════════════════════════════════════

  // FB-026 Heredad de Orden: "Roba 2 cartas."
  registrarEfecto('al-ser-destruido-vinculo', 'FB-026', (s, ctx, inst) => {
    const p = s.players[inst.owner]
    for (let i = 0; i < 2; i++) {
      const tope = p.mazo.shift()
      if (tope) p.mano.push(tope)
    }
    ctx.emit({ type: 'carta_robada', jugador: inst.owner, cardInstanceId: 'vinculo-fb026-x2' })
  })

  // FB-027 Refugio de las Casas: "Regresa hasta 3 Éter pagados (1A) a tu Reserva."
  registrarEfecto('al-ser-destruido-vinculo', 'FB-027', (s, ctx, inst) => {
    const p = s.players[inst.owner]
    const aRegresar = p.eterPagado.splice(0, 3)
    if (aRegresar.length > 0) {
      p.eterReserva.push(...aRegresar)
      ctx.emit({ type: 'eter_reagrupado', jugador: inst.owner, eterIds: aRegresar })
    }
  })

  // FB-028 Cristal de la Última Casa: "Un Campeón que controles gana Inmortal de forma permanente."
  registrarEfecto('al-ser-destruido-vinculo', 'FB-028', (s, _ctx, inst) => {
    const objetivo = campeonConMayorStat(s, inst.owner, 'resistencia')
    if (objetivo) otorgarKeyword(s, objetivo, 'Inmortal', false)
  })

  // FB-030 Lamento de la Primogénita: "El Campeón que controla el rival con mayor ATQ pierde 2 de ATQ de forma permanente."
  registrarEfecto('al-ser-destruido-vinculo', 'FB-030', (s, _ctx, inst) => {
    const rival = inst.owner === 'A' ? 'B' : 'A'
    const objetivo = campeonConMayorStat(s, rival, 'poder')
    if (objetivo) aplicarMod(s, objetivo, 'poder', -2, 'permanente')
  })

  // DS-026 Heredad de Caos: "El rival pierde 1 carta de su mano al azar."
  registrarEfecto('al-ser-destruido-vinculo', 'DS-026', (s, ctx, inst) => {
    const rival = inst.owner === 'A' ? 'B' : 'A'
    const p = s.players[rival]
    if (p.mano.length > 0) {
      const idx = Math.floor(ctx.next() * p.mano.length)
      const descartada = p.mano.splice(idx, 1)[0]
      p.cementerio.push(descartada)
      ctx.emit({ type: 'carta_descartada', jugador: rival, cardInstanceId: descartada })
    }
  })

  // DS-027 Refugio del Nudo: "El rival devuelve hasta 2 Éter de su zona de pago (1A) a su Reserva."
  registrarEfecto('al-ser-destruido-vinculo', 'DS-027', (s, ctx, inst) => {
    const rival = inst.owner === 'A' ? 'B' : 'A'
    const p = s.players[rival]
    const aDevolver = p.eterPagado.splice(0, 2)
    if (aDevolver.length > 0) {
      p.eterReserva.push(...aDevolver)
      ctx.emit({ type: 'eter_reagrupado', jugador: rival, eterIds: aDevolver })
    }
  })

  // DS-028 Cristal del Nudo: "Un Campeón que controlas gana Indestructible de forma permanente."
  registrarEfecto('al-ser-destruido-vinculo', 'DS-028', (s, _ctx, inst) => {
    const objetivo = campeonConMayorStat(s, inst.owner, 'resistencia')
    if (objetivo) otorgarKeyword(s, objetivo, 'Indestructible', false)
  })

  // DS-030 Grito del Primogénito: "El Campeón que controla el rival con mayor RES pierde 2 de RES de forma permanente."
  registrarEfecto('al-ser-destruido-vinculo', 'DS-030', (s, _ctx, inst) => {
    const rival = inst.owner === 'A' ? 'B' : 'A'
    const objetivo = campeonConMayorStat(s, rival, 'resistencia')
    if (objetivo) aplicarMod(s, objetivo, 'resistencia', -2, 'permanente')
  })

  // ═══════════════════════════════════════════════════════════════════
  // PERIÓDICOS: se registran como efecto pendiente en Alba del dueño
  // mientras el Vínculo esté bocaArriba en el campo.
  // ═══════════════════════════════════════════════════════════════════

  // FB-025 Primer Juramento: "Una vez por turno, al inicio de tu Alba, puedes bloquear 1 Éter de tu Reserva sobre un Campeón sin agotarlo."
  registrarEfecto('al-ser-destruido-vinculo', 'FB-025', (s, _ctx, inst) => {
    registrarEfectoPendiente(s, {
      fuente: inst.cardInstanceId,
      owner: inst.owner,
      triggerFase: 'alba',
      triggerOwner: 'dueño',
      accion: { tipo: 'mover-terreno', objetivo: '', origen: 'reserva', destino: 'bloqueado' },
      duracion: { tipo: 'permanente' },
    })
  })

  // FB-029 Voz del Alba: "Una vez por turno, al inicio de tu Alba, puedes devolver un Campeón de tu Cementerio a tu mano."
  registrarEfecto('al-ser-destruido-vinculo', 'FB-029', (s, _ctx, inst) => {
    registrarEfectoPendiente(s, {
      fuente: inst.cardInstanceId,
      owner: inst.owner,
      triggerFase: 'alba',
      triggerOwner: 'dueño',
      accion: { tipo: 'mover-terreno', objetivo: '', origen: 'cementerio', destino: 'mano' },
      duracion: { tipo: 'permanente' },
    })
  })

  // DS-025 Primer Nudo: "Una vez por turno, al inicio de tu Alba, un Campeón que controlas gana +1 de ATQ hasta el final del turno."
  registrarEfecto('al-ser-destruido-vinculo', 'DS-025', (s, _ctx, inst) => {
    registrarEfectoPendiente(s, {
      fuente: inst.cardInstanceId,
      owner: inst.owner,
      triggerFase: 'alba',
      triggerOwner: 'dueño',
      accion: { tipo: 'modificar', objetivo: '', stat: 'poder', delta: 1 },
      duracion: { tipo: 'hasta-fase', hastaFase: 'ocaso', ownerTrigger: 'dueño' },
    })
  })

  // DS-029 Voz del Nudo: "Una vez por turno, al inicio de tu Alba, puedes exiliar un Campeón del Cementerio del rival."
  registrarEfecto('al-ser-destruido-vinculo', 'DS-029', (s, _ctx, inst) => {
    registrarEfectoPendiente(s, {
      fuente: inst.cardInstanceId,
      owner: inst.owner,
      triggerFase: 'alba',
      triggerOwner: 'dueño',
      accion: { tipo: 'mover-terreno', objetivo: '', origen: 'cementerio-rival', destino: 'exilio' },
      duracion: { tipo: 'permanente' },
    })
  })
}
