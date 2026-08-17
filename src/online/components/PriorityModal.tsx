/**
 * Modal de prioridad: aparece cuando hay una cadena abierta (combat o global)
 * y el jugador humano tiene la prioridad para responder.
 *
 * Muestra:
 * 1. Qué efecto se activó (efectoActual)
 * 2. El stack actual (pila de cartas respondidas, en orden de apilado)
 * 3. Las cartas respondibles del jugador (MiniCard + botón "Responder")
 * 4. Botón "Pasar prioridad" para ceder
 *
 * El overlay bloquea toda interacción con el tablero mientras la cadena está abierta.
 */
import { MiniCard, type TamanoMini } from './MiniCard'
import type { Action } from '../game/actions'
import type { GameState, PlayerId, CardInstance } from '../game/types'
import { getCardMeta } from '../game/cards'
import { respondiblesDe } from '../game/chain'

interface PriorityModalProps {
  state: GameState
  playerId: PlayerId
  acciones: Action[]
  onAccion: (a: Action) => void
  onZoom: (inst: CardInstance) => void
}

export function PriorityModal({ state, playerId, acciones, onAccion, onZoom }: PriorityModalProps) {
  const cadena = state.combate?.cadena ?? state.cadena
  if (!cadena) return null
  if (cadena.prioridad !== playerId) return null

  const efectoActual = cadena.efectoActual
  const efectoInst = efectoActual ? state.instances[efectoActual.cardInstanceId] : null
  const efectoMeta = efectoInst?.cardId ? getCardMeta(efectoInst.cardId) : null

  const respondibles = respondiblesDe(state, playerId)
  const esCombate = !!state.combate?.cadena

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-surface border border-card-border rounded-xl p-6 max-w-lg mx-4 w-full max-h-[85vh] overflow-y-auto">
        {/* ── Header ────────────────────────────────────────────── */}
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold text-gray-100 mb-1">
            {esCombate ? 'Cadena de Combate (9.6)' : 'Cadena Global'}
          </h2>
          <p className="text-xs text-gray-400">
            {cadena.prioridad === playerId
              ? 'Es tu turno para responder'
              : `Es turno de ${cadena.prioridad === 'A' ? 'Vos' : 'el rival'}`}
          </p>
        </div>

        {/* ── Efecto que activó la cadena ────────────────────────── */}
        {efectoActual && (
          <div className="bg-surface-2 rounded-lg p-3 mb-4">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
              Efecto activado
            </p>
            <div className="flex items-center gap-3">
              {efectoInst && (
                <MiniCard
                  inst={efectoInst}
                  tamano="sm"
                  onZoom={() => onZoom(efectoInst)}
                />
              )}
              <div>
                <p className="text-sm font-medium text-gray-200">
                  {efectoMeta?.name ?? efectoActual.cardInstanceId}
                </p>
                <p className="text-[10px] text-gray-400">
                  por {efectoActual.jugador === playerId ? 'Vos' : 'el rival'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Stack actual ──────────────────────────────────────── */}
        {cadena.pila.length > 0 && (
          <div className="mb-4">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
              Stack ({cadena.pila.length})
            </p>
            <div className="flex gap-2 flex-wrap">
              {cadena.pila.map((id, idx) => {
                const inst = state.instances[id]
                return (
                  <MiniCard
                    key={`${id}-${idx}`}
                    inst={inst}
                    tamano="sm"
                    onZoom={() => onZoom(inst)}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* ── Cartas respondibles ───────────────────────────────── */}
        {respondibles.length > 0 && (
          <div className="mb-4">
            <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-1.5">
              Tus cartas respondibles ({respondibles.length})
            </p>
            <div className="flex gap-2 flex-wrap items-start">
              {respondibles.map((id) => {
                const inst = state.instances[id]
                const accion = acciones.find(
                  (a) => a.type === 'responder_cadena' && a.cardInstanceId === id,
                )
                return (
                  <div key={id} className="flex flex-col items-center gap-1">
                    <MiniCard
                      inst={inst}
                      tamano="sm"
                      onZoom={() => onZoom(inst)}
                    />
                    {accion && (
                      <button
                        onClick={() => onAccion(accion)}
                        className="text-[10px] bg-ether-600 hover:bg-ether-500 text-white px-2 py-0.5 rounded transition-colors cursor-pointer"
                      >
                        Responder
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Botón Pasar ───────────────────────────────────────── */}
        <div className="flex justify-end gap-3 mt-4 pt-3 border-t border-card-border">
          <button
            onClick={() => {
              const pasar = acciones.find((a) => a.type === 'pasar_prioridad')
              if (pasar) onAccion(pasar)
            }}
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-4 py-2 rounded-lg transition-colors cursor-pointer"
          >
            Pasar prioridad
          </button>
        </div>
      </div>
    </div>
  )
}
