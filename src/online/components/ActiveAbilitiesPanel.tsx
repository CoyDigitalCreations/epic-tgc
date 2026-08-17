/**
 * Panel de habilidades activas: muestra las habilidades que están
 * AFECTANDO ACTIVAMENTE el juego, del lado izquierdo del tablero.
 *
 * Solo muestra efectos que están RESUELTIOS (aura aplicándose, keyword
 * activa, éter bloqueado con efecto). No muestra efectos pendientes
 * de activación.
 */
import { getCardMeta, esCampeon, esEter } from '../game/cards'
import { aurasDe, keywordsDe, hasAuraCampoRegistrada } from '../game/efectos'
import type { EterCard, CampeonCard } from '../../shared/types'
import type { GameState, PlayerId } from '../game'

interface ActiveEffect {
  cardId: string
  cardName: string
  owner: PlayerId
  type: 'aura-campo' | 'aura-reserva' | 'aura-bloqueo' | 'keyword'
  /** Texto REAL del efecto (de paquetes.ts) */
  effectText: string
}

/** Extrae el texto del efecto activo de un Campeón */
function getChampionEffectText(meta: CampeonCard, type: 'aura-campo' | 'keyword'): string {
  if (type === 'aura-campo') {
    // Aura de campo = efecto pasivo que aplica a otros
    return meta.efectoPasivo ?? meta.efectoActivo ?? 'Efecto de campo'
  }
  // Keywords se muestran como están
  return meta.efectoPasivo ?? ''
}

/** Extrae el texto del efecto activo de un Éter */
function getEterEffectText(meta: EterCard, type: 'aura-reserva' | 'aura-bloqueo'): string {
  if (type === 'aura-reserva') {
    return meta.efectoReserva ?? 'Efecto de reserva'
  }
  return meta.efectoBloqueo ?? 'Efecto de bloqueo'
}

function getActiveEffects(s: GameState): ActiveEffect[] {
  const effects: ActiveEffect[] = []

  // ── 1. Auras de CAMPO en Campeones ──────────────────────────────
  for (const j of ['A', 'B'] as PlayerId[]) {
    const p = s.players[j]
    for (const id of p.campo.campeones) {
      if (!id) continue
      const inst = s.instances[id]
      const cardId = inst?.cardId ?? null
      const meta = cardId ? getCardMeta(cardId) : null
      if (!meta || !esCampeon(meta)) continue

      // Aura de campo: el campeón tiene un aura registrada Y está en campo
      if (hasAuraCampoRegistrada(meta.id)) {
        const auras = aurasDe(s, id)
        // Solo mostrar si hay AL MENOS otro campeón que recibe el aura
        if (auras.campo.length > 0) {
          effects.push({
            cardId: meta.id,
            cardName: meta.name,
            owner: j,
            type: 'aura-campo',
            effectText: getChampionEffectText(meta as CampeonCard, 'aura-campo'),
          })
        }
      }

      // Auras de RESERVA: éteres en 2A que afectan este campeón
      const auras = aurasDe(s, id)
      if (auras.reserva.length > 0) {
        // Buscar los éteres específicos que están aplicando aura
        for (const eterOwner of ['A', 'B'] as PlayerId[]) {
          for (const eterId of s.players[eterOwner].eterReserva) {
            const eterInst = s.instances[eterId]
            const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
            if (!eterMeta || !esEter(eterMeta)) continue
            // Solo éteres con efecto de reserva
            if (eterMeta.efectoReserva) {
              // Evitar duplicados del mismo éter
              const yaExiste = effects.some(
                (e) => e.cardId === eterMeta.id && e.type === 'aura-reserva' && e.owner === eterOwner,
              )
              if (!yaExiste) {
                effects.push({
                  cardId: eterMeta.id,
                  cardName: eterMeta.name,
                  owner: eterOwner,
                  type: 'aura-reserva',
                  effectText: getEterEffectText(eterMeta, 'aura-reserva'),
                })
              }
            }
          }
        }
      }

      // Auras de BLOQUEO: éteres bloqueados en este campeón
      if (auras.bloqueo.length > 0) {
        for (const eterId of inst.eterBloqueado ?? []) {
          const eterInst = s.instances[eterId]
          const eterMeta = eterInst?.cardId ? getCardMeta(eterInst.cardId) : null
          if (!eterMeta || !esEter(eterMeta)) continue
          if (eterMeta.efectoBloqueo) {
            effects.push({
              cardId: eterMeta.id,
              cardName: eterMeta.name,
              owner: j,
              type: 'aura-bloqueo',
              effectText: getEterEffectText(eterMeta, 'aura-bloqueo'),
            })
          }
        }
      }

      // Keywords activas (permanentes o temporales)
      const kws = keywordsDe(s, id)
      const tempKws = inst?.keywordsTemporales ?? []
      for (const kw of kws) {
        if (['Inmortal', 'Indestructible', 'Protector', 'Transmutar'].includes(kw)) {
          const esTemporal = tempKws.includes(kw)
          effects.push({
            cardId: meta.id,
            cardName: meta.name,
            owner: j,
            type: 'keyword',
            effectText: `${kw}${esTemporal ? ' (temporal)' : ''}`,
          })
        }
      }
    }
  }

  return effects
}

interface ActiveAbilitiesPanelProps {
  s: GameState
}

/** Colores por tipo de efecto */
const TIPO_COLORS: Record<ActiveEffect['type'], string> = {
  'aura-campo': 'bg-blue-400',
  'aura-reserva': 'bg-cyan-400',
  'aura-bloqueo': 'bg-purple-400',
  keyword: 'bg-green-400',
}

export function ActiveAbilitiesPanel({ s }: ActiveAbilitiesPanelProps) {
  const effects = getActiveEffects(s)

  if (effects.length === 0) return null

  return (
    <div className="bg-surface border border-card-border rounded-lg p-2 min-w-[160px]">
      <h3 className="text-[9px] uppercase tracking-wider text-gray-500 mb-2">
        Efectos Activos
      </h3>
      <div className="flex flex-col gap-1.5">
        {effects.map((ef, i) => (
          <div
            key={`${ef.cardId}-${ef.type}-${i}`}
            className="flex flex-col gap-0.5 text-[8px] py-0.5 border-b border-card-border/30 last:border-0"
          >
            {/* Línea 1: nombre + indicador de owner */}
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TIPO_COLORS[ef.type]}`} />
              <span className="text-gray-300 font-medium">{ef.cardName}</span>
              <span className={`text-[7px] ml-auto ${ef.owner === 'A' ? 'text-blue-400' : 'text-red-400'}`}>
                {ef.owner}
              </span>
            </div>
            {/* Línea 2: texto del efecto (sin truncar) */}
            <span className="text-gray-500 pl-3 leading-tight">
              {ef.effectText}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
