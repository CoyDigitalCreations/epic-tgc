import type { ReactNode } from 'react'
import { RenderCarta } from '../../forge/components/CardPreview'
import { useCardImage } from '../../forge/hooks/useCardImage'
import type { AnyCard } from '../../shared/types'
import { getCardMeta } from '../game'
import type { CardInstance } from '../game'

const ANCHO_CARTA = 744
const ALTO_CARTA = 1038

const TAMANOS = { xs: 44, sm: 64, md: 92, lg: 128 } as const
export type TamanoMini = keyof typeof TAMANOS

interface MiniCardProps {
  inst: CardInstance
  tamano?: TamanoMini
  /**
   * Override del meta a renderizar (p. ej. stats modificadas por efectos:
   * poder/resistencia actuales de la instancia). Si no se pasa, se usa
   * getCardMeta(inst.cardId).
   */
  carta?: AnyCard
  agotado?: boolean
  seleccionada?: boolean
  onClick?: () => void
  title?: string
  /** Marcador extra superpuesto (badges de estado de zona). */
  marca?: ReactNode
  children?: ReactNode
}

/**
 * Miniatura de carta en el tablero. Se renderiza desde la VISTA 6.2:
 * `cardId === null` → dorso (carta oculta al jugador). Si `bocaArriba`
 * (Vínculo roto por Ruptura) se marca como tal.
 * Reutiliza `RenderCarta` del creador (744×1038) escalado: las cartas del
 * tablero se ven IDÉNTICAS a las exportadas desde Éter Forge.
 */
export function MiniCard({
  inst,
  tamano = 'md',
  carta,
  agotado,
  seleccionada,
  onClick,
  title,
  marca,
  children,
}: MiniCardProps) {
  const cardId = inst.cardId ?? undefined
  const meta = cardId ? (carta ?? getCardMeta(cardId)) : null
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)
  const ancho = TAMANOS[tamano]
  const escala = ancho / ANCHO_CARTA
  const agotada = agotado ?? inst.agotado === true
  const eteres = inst.eterBloqueado?.length ?? 0

  if (!cardId || !meta) {
    // Dorso: boca abajo (mano rival, mazos, Arcanas/Vínculos rivales)
    return (
      <div className="flex flex-col items-center gap-1" style={{ width: ancho }}>
        <div
          style={{
            aspectRatio: '744/1038',
            width: ancho,
            borderRadius: 6,
            border: '1px solid #3b3b5c',
            background: 'linear-gradient(135deg, #14142b 0%, #1e1e3a 60%, #2a2a4e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: onClick ? 'pointer' : 'default',
          }}
          onClick={onClick}
          aria-label="Carta boca abajo"
        >
          <span
            style={{ color: '#4b4b7a', fontFamily: '"Cinzel", serif', fontSize: tamano === 'sm' ? 10 : 14, fontWeight: 700 }}
          >
            ✦
          </span>
        </div>
        {children}
      </div>
    )
  }

  // Stats en vivo de la instancia (overrides de efectos), para que el badge
  // ATK/RES del render muestre los valores ACTUALES, no los del meta.
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
    <div className="flex flex-col items-center gap-1" style={{ width: ancho }}>
      <div
        style={{
          width: ancho,
          height: ALTO_CARTA * escala,
          position: 'relative',
          cursor: onClick ? 'pointer' : 'default',
          transition: 'transform 150ms ease, box-shadow 150ms ease',
        }}
        onClick={onClick}
        title={title ?? meta.name}
      >
        <div
          style={{
            transform: `scale(${escala})`,
            transformOrigin: 'top left',
            width: ANCHO_CARTA,
            height: ALTO_CARTA,
            opacity: agotada ? 0.55 : 1,
            filter: agotada ? 'grayscale(0.6)' : 'none',
          }}
        >
          <RenderCarta card={aRenderizar} imageUrl={imageUrl} />
        </div>

        {/* Anillo de selección (éteres elegidos para pagar, carta en modo selección) */}
        {seleccionada && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 8,
              border: '2px solid #fbbf24',
              boxShadow: '0 0 10px rgba(251,191,36,0.7)',
              pointerEvents: 'none',
            }}
            aria-hidden="true"
          />
        )}

        {/* Badge de Vínculo roto (bocaArriba por Ruptura) */}
        {inst.bocaArriba && (
          <div
            style={{
              position: 'absolute',
              top: ancho * 0.08,
              left: 0,
              right: 0,
              textAlign: 'center',
              fontSize: tamano === 'sm' ? 5 : 7,
              color: '#f59e0b',
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: 'uppercase',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              pointerEvents: 'none',
            }}
          >
            Roto
          </div>
        )}

        {/* Éteres bloqueados (1B-1F) */}
        {eteres > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 2,
              left: 3,
              display: 'flex',
              gap: 1,
              pointerEvents: 'none',
            }}
          >
            {Array.from({ length: eteres }).map((_, i) => (
              <span
                key={i}
                style={{
                  width: Math.max(3, ancho * 0.05),
                  height: Math.max(3, ancho * 0.05),
                  borderRadius: 99,
                  background: '#22d3ee',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        )}

        {marca}
      </div>
      {children}
    </div>
  )
}
