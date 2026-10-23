import { useEffect, useState } from 'react'
import { RenderCarta } from '../../forge/components/CardPreview'
import { useCardImage } from '../../forge/hooks/useCardImage'
import type { AnyCard } from '../../shared/types'
import { getCardMeta } from '../game'
import type { CardInstance } from '../game'

const ANCHO_CARTA = 744
const ALTO_CARTA = 1038

interface CartaZoomProps {
  inst: CardInstance
  onClose: () => void
}

/**
 * Carta en grande (overlay): renderiza la carta con `RenderCarta` escalada
 * para que quepa en pantalla (mismo render 744×1038 del creador, escalado
 * como en MiniCard pero a tamaño completo) y así poder revisar el efecto.
 * Se cierra con Escape, clic fuera de la carta o el botón ✕.
 */
export function CartaZoom({ inst, onClose }: CartaZoomProps) {
  const cardId = inst.cardId ?? undefined
  const meta = cardId ? getCardMeta(cardId) : null
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)

  // Escala para que quepa en el viewport (86% del alto, 90% del ancho).
  const [escala, setEscala] = useState(1)
  useEffect(() => {
    const medir = () => {
      const vh = window.innerHeight || 800
      const vw = window.innerWidth || 1200
      setEscala(Math.min((vh * 0.86) / ALTO_CARTA, (vw * 0.9) / ANCHO_CARTA))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!cardId || !meta) return null

  // Stats en vivo de la instancia (overrides de efectos), como en MiniCard.
  const conStatsVivos =
    meta.type === 'Campeón' && (inst.poder !== undefined || inst.resistencia !== undefined)
  const aRenderizar: AnyCard = conStatsVivos
    ? {
        ...meta,
        stats: {
          ...meta.stats,
          poder: inst.poder ?? meta.stats.poder,
          resistencia: inst.resistencia ?? meta.stats.resistencia,
        },
      }
    : meta

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Carta en grande: ${meta.name}`}
      className="anim-modal-fondo fixed inset-0 z-60 flex items-center justify-center bg-[#04040a]/88 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="anim-modal-panel flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex w-full items-center gap-3">
          <p className="font-display text-base font-bold tracking-wide text-gray-50">{meta.name}</p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-300">{meta.type}</span>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto grid size-7 cursor-pointer place-items-center rounded-lg text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-100"
          >
            ✕
          </button>
        </div>
        <div
          className="relative rounded-2xl shadow-[0_0_90px_rgba(112,112,255,0.28)]"
          style={{ width: ANCHO_CARTA * escala, height: ALTO_CARTA * escala }}
        >
          <div
            style={{
              transform: `scale(${escala})`,
              transformOrigin: 'top left',
              width: ANCHO_CARTA,
              height: ALTO_CARTA,
            }}
          >
            <RenderCarta card={aRenderizar} imageUrl={imageUrl} />
          </div>
        </div>
      </div>
    </div>
  )
}
