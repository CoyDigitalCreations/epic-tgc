/**
 * Modal de pre-efectos: pausa el juego ANTES de ejecutar una acción del humano
 * que dispara efectos, mostrando QUÉ efectos entrarán en juego.
 *
 * Flujo:
 *   1. Humano confirma jugar/activar una carta con efectos[]
 *   2. usePartida intercepta → abre este modal (el motor NO recibe la acción aún)
 *   3. Botón "Aceptar efectos" → se ejecuta la acción en el motor
 *   4. "Cancelar" → se cierra sin ejecutar (el selector de pago queda como estaba)
 *
 * El bot NO pasa por este modal: sus efectos se loguean en logDetallado.
 */
import { MiniCard } from './MiniCard'
import type { CardInstance } from '../game/types'
import { getCardMeta } from '../game/cards'
import { describirEfectosDeCarta } from '../describirEfecto'

export interface PreviewEfectos {
  /** Instance id de la carta que dispara (para MiniCard). */
  cardInstanceId: string
  /** Acción que se va a ejecutar al aceptar. */
  accionLabel: string
  /** Líneas ya descriptas. */
  lineas: string[]
  /** Quién ejecuta: humano (A) o bot (B). */
  actor: 'A' | 'B'
}

interface EffectPreviewModalProps {
  preview: PreviewEfectos
  instancia: CardInstance | undefined
  onAceptar: () => void
  onCancelar: () => void
}

export function EffectPreviewModal({ preview, instancia, onAceptar, onCancelar }: EffectPreviewModalProps) {
  const meta = instancia?.cardId ? getCardMeta(instancia.cardId) : null
  const lineas = preview.lineas.length > 0
    ? preview.lineas
    : describirEfectosDeCarta(meta)
  const esBot = preview.actor === 'B'

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-surface border border-card-border rounded-xl p-6 max-w-lg mx-4 w-full">
        {/* Header */}
        <div className="mb-4">
          <h2 className="font-display text-lg font-bold text-gray-100 mb-1">
            {esBot ? '⏸ El rival va a ejecutar' : '⏸ Efectos por entrar en juego'}
          </h2>
          <p className="text-xs text-gray-400">
            {esBot
              ? 'El juego está en pausa. Revisá qué va a resolver el bot y aceptá para continuar.'
              : 'El juego está en pausa. Revisá qué se va a resolver y aceptá para continuar.'}
          </p>
        </div>

        {/* Carta fuente */}
        <div className="bg-surface-2 rounded-lg p-3 mb-3 flex items-center gap-3">
          {instancia && <MiniCard inst={instancia} tamano="sm" />}
          <div>
            <p className="text-sm font-medium text-gray-200">
              {meta?.name ?? preview.cardInstanceId}
            </p>
            <p className="text-[10px] text-gray-400">
              {meta?.type ?? 'Carta'} · {esBot ? 'B' : 'Tú'} ejecuta: {preview.accionLabel}
            </p>
          </div>
        </div>

        {/* Lista de efectos */}
        <div className="bg-surface-2 rounded-lg p-3 mb-4 max-h-64 overflow-y-auto">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-2">
            Efectos que entrarán en juego
          </p>
          {lineas.length === 0 ? (
            <p className="text-xs text-gray-400 italic">
              Esta carta no tiene efectos[] — solo stats básicas.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {lineas.map((l, i) => (
                <li key={i} className="text-xs text-gray-200 flex gap-2">
                  <span className="text-ether-400 shrink-0">•</span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Acciones */}
        <div className="flex justify-end gap-3 pt-3 border-t border-card-border">
          {esBot ? (
            <button
              onClick={onAceptar}
              className="text-xs bg-ether-600 hover:bg-ether-500 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
            >
              Aceptar y continuar
            </button>
          ) : (
            <>
              <button
                onClick={onCancelar}
                className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={onAceptar}
                className="text-xs bg-ether-600 hover:bg-ether-500 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer"
              >
                Aceptar efectos
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
