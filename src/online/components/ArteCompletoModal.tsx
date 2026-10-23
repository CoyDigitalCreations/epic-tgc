import { useEffect } from 'react'
import { useCardImage } from '../../forge/hooks/useCardImage'
import type { AnyCard } from '../../shared/types'

interface ArteCompletoModalProps {
  card: AnyCard
  onClose: () => void
}

/**
 * Visor del arte completo de una carta (sin marco ni texto), para mirarlo con calma
 * antes de decidir si va al mazo. Se cierra con Escape, clic afuera o la ✕.
 * Capa z-60 (la misma que el zoom de carta del juego: por encima de los modales).
 * Si la carta no tiene arte no muestra nada (el editor ni siquiera ofrece abrirlo).
 */
export function ArteCompletoModal({ card, onClose }: ArteCompletoModalProps) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', alTeclear)
    return () => window.removeEventListener('keydown', alTeclear)
  }, [onClose])

  if (!imageUrl) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Arte completo: ${card.name}`}
      className="anim-modal-fondo fixed inset-0 z-60 flex items-center justify-center bg-[#04040a]/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <figure className="anim-modal-panel flex max-h-full max-w-full flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
        <figcaption className="flex w-full items-center gap-3">
          <p className="font-display text-base font-bold tracking-wide text-gray-50">{card.name}</p>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gray-300">
            {card.type}
            {card.facciones?.[0] ? ` · ${card.facciones[0]}` : ''}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="ml-auto grid size-7 cursor-pointer place-items-center rounded-lg text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-100"
          >
            ✕
          </button>
        </figcaption>
        <img
          src={imageUrl}
          alt={`Arte completo de ${card.name}`}
          className="max-h-[82vh] max-w-[92vw] rounded-2xl object-contain shadow-[0_0_90px_rgba(112,112,255,0.28)]"
        />
      </figure>
    </div>
  )
}
