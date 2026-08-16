/**
 * Panel de habilidades activas: muestra todas las habilidades continuas
 * y activas que están afectando el juego, del lado izquierdo del tablero.
 */
import { getCardMeta, esCampeon } from '../game/cards'
import { aurasDe, keywordsDe } from '../game/efectos'
import type { GameState, PlayerId } from '../game'

interface ActiveAbility {
  cardId: string
  cardName: string
  owner: PlayerId
  type: 'aura' | 'keyword' | 'ether-block'
  description: string
}

function getActiveAbilities(s: GameState): ActiveAbility[] {
  const abilities: ActiveAbility[] = []

  for (const j of ['A', 'B'] as PlayerId[]) {
    const p = s.players[j]
    // Check champions in field
    for (const id of p.campo.campeones) {
      if (!id) continue
      const inst = s.instances[id]
      const cardId = inst?.cardId ?? null
      const meta = cardId ? getCardMeta(cardId) : null
      if (!meta || !esCampeon(meta)) continue

      // Check auras
      const auras = aurasDe(s, id)
      if (auras.campo.length > 0) {
        abilities.push({
          cardId: meta.id,
          cardName: meta.name,
          owner: j,
          type: 'aura',
          description: `Aura de campo activa`,
        })
      }
      if (auras.reserva.length > 0) {
        abilities.push({
          cardId: meta.id,
          cardName: meta.name,
          owner: j,
          type: 'aura',
          description: `Auras de reserva activas`,
        })
      }
      if (auras.bloqueo.length > 0) {
        abilities.push({
          cardId: meta.id,
          cardName: meta.name,
          owner: j,
          type: 'ether-block',
          description: `Éter bloqueado: ${auras.bloqueo.length} efecto(s)`,
        })
      }

      // Check keywords
      const kws = keywordsDe(s, id)
      const tempKws = inst?.keywordsTemporales ?? []
      for (const kw of kws) {
        if (['Inmortal', 'Indestructible', 'Protector', 'Transmutar'].includes(kw)) {
          abilities.push({
            cardId: meta.id,
            cardName: meta.name,
            owner: j,
            type: 'keyword',
            description: `${kw}${tempKws.includes(kw) ? ' (temporal)' : ''}`,
          })
        }
      }
    }
  }

  return abilities
}

interface ActiveAbilitiesPanelProps {
  s: GameState
}

export function ActiveAbilitiesPanel({ s }: ActiveAbilitiesPanelProps) {
  const abilities = getActiveAbilities(s)

  if (abilities.length === 0) return null

  return (
    <div className="bg-surface border border-card-border rounded-lg p-2 min-w-[140px]">
      <h3 className="text-[9px] uppercase tracking-wider text-gray-500 mb-2">
        Habilidades Activas
      </h3>
      <div className="flex flex-col gap-1">
        {abilities.map((ab, i) => (
          <div
            key={`${ab.cardId}-${ab.type}-${i}`}
            className="flex items-center gap-1.5 text-[8px] py-0.5"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                ab.type === 'aura' ? 'bg-blue-400' : ab.type === 'ether-block' ? 'bg-purple-400' : 'bg-green-400'
              }`}
            />
            <span className="text-gray-300 truncate">{ab.cardName}</span>
            <span className="text-gray-500 truncate flex-1">{ab.description}</span>
            <span className={`text-[7px] ${ab.owner === 'A' ? 'text-blue-400' : 'text-red-400'}`}>
              {ab.owner}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
