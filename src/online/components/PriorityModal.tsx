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
import { Boton } from '../../shared/ui/Boton'
import { Modal } from '../../shared/ui/Modal'
import { Seccion } from '../../shared/ui/Seccion'
import { MiniCard } from './MiniCard'
import type { Action } from '../game/actions'
import type { GameState, PlayerId, CardInstance } from '../game/types'
import { getCardMeta } from '../game/cards'
import { cadenaActiva, respondiblesDe, respuestasDeMano } from '../game/chain'

interface PriorityModalProps {
  state: GameState
  playerId: PlayerId
  acciones: Action[]
  onAccion: (a: Action) => void
  onZoom: (inst: CardInstance) => void
}

export function PriorityModal({ state, playerId, acciones, onAccion, onZoom }: PriorityModalProps) {
  const cadena = cadenaActiva(state)
  if (!cadena) return null
  if (cadena.prioridad !== playerId) return null
  // Checkpoint prevent_destroy (Fase 2c): mientras hay prevenión pendiente la
  // ÚNICA acción legal es responder_prevenicion — el modal no debe tapar ese
  // checkpoint (se rinde en PreventionModal, que se monta antes).
  if (state.preventivosPendientes?.[0]) return null

  // Modal SIEMPRE visible con tu prioridad (decisión 2026-10-14): un solo lugar
  // para responder/pasar — aunque no tengas respondibles, muestra el estado y
  // el botón "Pasar prioridad" (antes el modal se ocultaba y el botón vivía
  // suelto en Acciones generales).
  const respondibles = respondiblesDe(state, playerId)
  // Respuesta desde la MANO (obs 1874): Místicas Presteza jugables con
  // jugar_respuesta (pagan su coste y entran a la pila — p.ej. Marcha niega
  // la activación pendiente).
  const enMano = respuestasDeMano(state, playerId)
    .map((id) => ({ id, accion: acciones.find((a) => a.type === 'jugar_respuesta' && a.cardInstanceId === id) }))
    .filter((x): x is { id: string; accion: Action } => !!x.accion)
  const totalRespondibles = respondibles.length + enMano.length
  const pasar = acciones.find((a) => a.type === 'pasar_prioridad')

  const efectoActual = cadena.efectoActual
  const efectoInst = efectoActual ? state.instances[efectoActual.cardInstanceId] : null
  const efectoMeta = efectoInst?.cardId ? getCardMeta(efectoInst.cardId) : null

  const esCombate = cadena.origen === 'combate'

  return (
    <Modal
      titulo={esCombate ? 'Cadena de Combate (9.6)' : 'Cadena Global'}
      subtitulo={
        totalRespondibles > 0
          ? `Tienes ${totalRespondibles} carta(s) que puede(n) responder — elige o pasa prioridad.`
          : 'No tienes cartas que puedan responder este efecto — pasa la prioridad para continuar.'
      }
      icono="⛓"
      tono="alerta"
      ancho="lg"
      pie={pasar && <Boton onClick={() => onAccion(pasar)}>Pasar prioridad</Boton>}
    >
      <div className="space-y-4">
        {/* ── Efecto que activó la cadena ────────────────────────── */}
        {efectoActual && (
          <section className="rounded-xl border border-amber-400/20 bg-amber-500/[0.05] p-3">
            <Seccion>Efecto activado</Seccion>
            <div className="flex items-center gap-4">
              {efectoInst && <MiniCard inst={efectoInst} anchoPx={76} sinTooltip onZoom={() => onZoom(efectoInst)} />}
              <div className="min-w-0">
                <p className="font-display text-base font-bold text-gray-100">
                  {efectoMeta?.name ?? efectoActual.cardInstanceId}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">por {efectoActual.jugador === playerId ? 'Tú' : 'el rival'}</p>
                {cadena.opener && <p className="mt-0.5 text-[10px] text-amber-200/80">Fondo de la pila: resuelve al final, después de las respuestas.</p>}
              </div>
            </div>
          </section>
        )}

        {/* ── Stack actual ──────────────────────────────────────── */}
        {cadena.pila.length > 0 && (
          <section>
            <Seccion cantidad={cadena.pila.length}>Stack</Seccion>
            <div className="flex flex-wrap items-end gap-2">
              {cadena.pila.map((id, idx) => {
                const inst = state.instances[id]
                const esUltima = idx === cadena.pila.length - 1
                return (
                  <div key={`${id}-${idx}`} className="flex flex-col items-center gap-1">
                    <MiniCard inst={inst} anchoPx={64} sinTooltip onZoom={() => onZoom(inst)} />
                    <span
                      className={`rounded-full px-1.5 py-px font-mono text-[9px] ${
                        esUltima ? 'bg-amber-500/25 text-amber-200' : 'bg-white/10 text-gray-400'
                      }`}
                    >
                      {esUltima ? 'resuelve 1°' : `#${idx + 1}`}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-2 text-[10px] text-gray-500">La cadena se resuelve en orden inverso: la última carta apilada va primero.</p>
          </section>
        )}

        {/* ── Cartas respondibles ───────────────────────────────── */}
        {respondibles.length > 0 && (
          <section>
            <Seccion cantidad={respondibles.length}>Tus cartas respondibles</Seccion>
            <div className="flex flex-wrap items-start gap-3">
              {respondibles.map((id) => {
                const inst = state.instances[id]
                const accion = acciones.find((a) => a.type === 'responder_cadena' && a.cardInstanceId === id)
                return (
                  <div key={id} className="flex flex-col items-center gap-1.5">
                    <MiniCard inst={inst} anchoPx={76} sinTooltip onZoom={() => onZoom(inst)} />
                    {accion && (
                      <Boton variante="primario" tam="sm" onClick={() => onAccion(accion)}>
                        Responder
                      </Boton>
                    )}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Presteza en mano (respuesta jugando — obs 1874) ────── */}
        {enMano.length > 0 && (
          <section>
            <Seccion tono="alerta" cantidad={enMano.length}>
              Presteza en tu mano — jugable como respuesta
            </Seccion>
            <div className="flex flex-wrap items-start gap-3">
              {enMano.map(({ id, accion }) => {
                const inst = state.instances[id]
                return (
                  <div key={id} className="flex flex-col items-center gap-1.5">
                    <MiniCard inst={inst} anchoPx={76} sinTooltip onZoom={() => onZoom(inst)} />
                    <Boton variante="alerta" tam="sm" onClick={() => onAccion(accion)}>
                      Jugar
                    </Boton>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </div>
    </Modal>
  )
}
