/**
 * Modal de prevenión (Fase 2c — prevent_destroy, checkpoint).
 * Aparece cuando hay un pendiente de prevenión para el jugador humano:
 * una fuente con prevent_destroy (Rowena) puede salvar un Vínculo en peligro
 * exiliándose. El jugador decide: Prevenir o Permitir la destrucción.
 *
 * El overlay bloquea toda interacción con el tablero mientras el checkpoint
 * está abierto (el motor no acepta otras acciones — ADR-5 determinista).
 */
import { MiniCard } from './MiniCard'
import type { Action } from '../game/actions'
import type { GameState, PlayerId, CardInstance } from '../game/types'
import { getCardMeta } from '../game/cards'

interface PreventionModalProps {
  state: GameState
  playerId: PlayerId
  acciones: Action[]
  onAccion: (a: Action) => void
  onZoom: (inst: CardInstance) => void
}

export function PreventionModal({ state, playerId, acciones, onAccion, onZoom }: PreventionModalProps) {
  const pendiente = state.preventivosPendientes?.[0]
  if (!pendiente || pendiente.jugador !== playerId) return null

  const victimaInst = state.instances[pendiente.victimId]
  const victimaMeta = victimaInst?.cardId ? getCardMeta(victimaInst.cardId) : null
  const fuenteInst = state.instances[pendiente.fuenteId]
  const fuenteMeta = fuenteInst?.cardId ? getCardMeta(fuenteInst.cardId) : null

  const prevenir = acciones.find((a) => a.type === 'responder_prevenicion' && a.prevenir)
  const permitir = acciones.find((a) => a.type === 'responder_prevenicion' && !a.prevenir)

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-surface border border-card-border rounded-xl p-6 max-w-md mx-4 w-full">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold text-gray-100 mb-1">
            🛡 Prevenir destrucción
          </h2>
          <p className="text-xs text-gray-400">
            Una de tus cartas puede salvar este Vínculo exiliándose.
          </p>
        </div>

        {/* ── Vínculo en peligro ───────────────────────────────── */}
        <div className="bg-surface-2 rounded-lg p-3 mb-3">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
            En peligro
          </p>
          <div className="flex items-center gap-3">
            {victimaInst && (
              <MiniCard inst={victimaInst} tamano="sm" onZoom={() => onZoom(victimaInst)} />
            )}
            <div>
              <p className="text-sm font-medium text-gray-200">
                {victimaMeta?.name ?? pendiente.victimId}
              </p>
              <p className="text-[10px] text-gray-400">Vínculo · destrucción {pendiente.causa}</p>
            </div>
          </div>
        </div>

        {/* ── Fuente que puede prevenir ────────────────────────── */}
        <div className="bg-surface-2 rounded-lg p-3 mb-4">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
            Puede prevenir (se exiliará)
          </p>
          <div className="flex items-center gap-3">
            {fuenteInst && (
              <MiniCard inst={fuenteInst} tamano="sm" onZoom={() => onZoom(fuenteInst)} />
            )}
            <div>
              <p className="text-sm font-medium text-gray-200">
                {fuenteMeta?.name ?? pendiente.fuenteId}
              </p>
              <p className="text-[10px] text-gray-400">prevent_destroy · costo: exiliarse</p>
            </div>
          </div>
        </div>

        {/* ── Decisiones ───────────────────────────────────────── */}
        <div className="flex justify-end gap-3 pt-3 border-t border-card-border">
          <button
            onClick={() => {
              if (permitir) onAccion(permitir)
            }}
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Permitir destrucción
          </button>
          <button
            onClick={() => {
              if (prevenir) onAccion(prevenir)
            }}
            className="text-xs bg-ether-600 hover:bg-ether-500 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Prevenir
          </button>
        </div>
      </div>
    </div>
  )
}
