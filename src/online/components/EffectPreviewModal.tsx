/**
 * Modal de pre-efectos: pausa el juego ANTES de ejecutar una acción que dispara
 * efectos, mostrando QUÉ efectos entrarán en juego.
 *
 * Flujo:
 *   1. Humano confirma jugar/activar una carta con efectos[]
 *   2. usePartida intercepta → abre este modal (el motor NO recibe la acción aún)
 *   3. Botón "Aceptar efectos" (o Enter) → se ejecuta la acción en el motor
 *   4. "Cancelar" (o Escape) → se cierra sin ejecutar (el selector de pago queda como estaba)
 *
 * Según el modo de vista previa (usePartida.VistaPrevia) también pausa las jugadas del
 * bot ('todas'): ahí solo hay "Aceptar y continuar". Sus efectos igual se loguean en logDetallado.
 */
import { useEffect } from 'react'
import { Boton } from '../../shared/ui/Boton'
import { Modal } from '../../shared/ui/Modal'
import { Seccion } from '../../shared/ui/Seccion'
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

  // Teclado: Enter acepta (preventDefault evita el doble disparo si el botón tiene el foco); Escape cancela solo lo propio
  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onAceptar()
      } else if (e.key === 'Escape' && !esBot) {
        onCancelar()
      }
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [esBot, onAceptar, onCancelar])

  return (
    <Modal
      titulo={esBot ? 'El rival va a ejecutar' : 'Efectos por entrar en juego'}
      subtitulo={
        esBot
          ? 'El juego está en pausa. Revisa qué va a resolver el bot y acepta para continuar.'
          : 'El juego está en pausa. Revisa qué se va a resolver y acepta para continuar.'
      }
      icono="⏸"
      tono={esBot ? 'rival' : 'ether'}
      pie={
        esBot ? (
          <Boton variante="primario" atajo="↵" onClick={onAceptar}>
            Aceptar y continuar
          </Boton>
        ) : (
          <>
            <Boton atajo="Esc" onClick={onCancelar}>
              Cancelar
            </Boton>
            <Boton variante="primario" atajo="↵" onClick={onAceptar}>
              Aceptar efectos
            </Boton>
          </>
        )
      }
    >
      {/* Carta fuente */}
      <div className="mb-4 flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {instancia && <MiniCard inst={instancia} anchoPx={84} sinTooltip sinAncla />}
        <div className="min-w-0">
          <p className="truncate font-display text-base font-bold text-gray-100">{meta?.name ?? preview.cardInstanceId}</p>
          <p className="mt-0.5 text-[11px] text-gray-400">
            {meta?.type ?? 'Carta'} · {esBot ? 'B' : 'Tú'} ejecuta: {preview.accionLabel}
          </p>
        </div>
      </div>

      {/* Lista de efectos */}
      <Seccion>Efectos que entrarán en juego</Seccion>
      <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {lineas.length === 0 ? (
          <p className="text-xs italic text-gray-400">Esta carta no tiene efectos[] — solo stats básicas.</p>
        ) : (
          <ul className="space-y-2">
            {lineas.map((l, i) => (
              <li key={i} className="flex gap-2.5 border-l-2 border-ether-500/60 pl-2.5 text-[13px] leading-snug text-gray-200">
                <span>{l}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
