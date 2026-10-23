/**
 * Modal de prevenión (Fase 2c — prevent_destroy, checkpoint).
 * Aparece cuando hay un pendiente de prevenión para el jugador humano:
 * una fuente con prevent_destroy (Rowena) puede salvar un Vínculo en peligro
 * exiliándose. El jugador decide: Prevenir o Permitir la destrucción.
 *
 * El overlay bloquea toda interacción con el tablero mientras el checkpoint
 * está abierto (el motor no acepta otras acciones — ADR-5 determinista).
 */
import { Boton } from '../../shared/ui/Boton'
import { Modal } from '../../shared/ui/Modal'
import { Seccion } from '../../shared/ui/Seccion'
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
    <Modal
      titulo="Prevenir destrucción"
      subtitulo="Una de tus cartas puede salvar este Vínculo exiliándose."
      icono="🛡"
      tono="alerta"
      pie={
        <>
          <Boton
            onClick={() => {
              if (permitir) onAccion(permitir)
            }}
          >
            Permitir destrucción
          </Boton>
          <Boton
            variante="primario"
            onClick={() => {
              if (prevenir) onAccion(prevenir)
            }}
          >
            Prevenir
          </Boton>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Vínculo en peligro */}
        <div className="rounded-xl border border-rose-400/25 bg-rose-500/[0.06] p-3">
          <Seccion>En peligro</Seccion>
          <div className="flex items-center gap-3">
            {victimaInst && <MiniCard inst={victimaInst} anchoPx={76} sinTooltip onZoom={() => onZoom(victimaInst)} />}
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-gray-100">{victimaMeta?.name ?? pendiente.victimId}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">Vínculo · destrucción {pendiente.causa}</p>
            </div>
          </div>
        </div>

        {/* Fuente que puede prevenir */}
        <div className="rounded-xl border border-ether-400/25 bg-ether-500/[0.06] p-3">
          <Seccion>Puede prevenir (se exiliará)</Seccion>
          <div className="flex items-center gap-3">
            {fuenteInst && <MiniCard inst={fuenteInst} anchoPx={76} sinTooltip onZoom={() => onZoom(fuenteInst)} />}
            <div className="min-w-0">
              <p className="font-display text-sm font-bold text-gray-100">{fuenteMeta?.name ?? pendiente.fuenteId}</p>
              <p className="mt-0.5 text-[11px] text-gray-400">prevent_destroy · costo: exiliarse</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
