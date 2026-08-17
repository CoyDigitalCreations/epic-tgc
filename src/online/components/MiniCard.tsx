import type { ReactNode } from 'react'
import { RenderCarta } from '../../forge/components/CardPreview'
import { useCardImage } from '../../forge/hooks/useCardImage'
import type { AnyCard } from '../../shared/types'
import { getCardMeta } from '../game'
import type { CardInstance } from '../game'

const ANCHO_CARTA = 744
const ALTO_CARTA = 1038

export const TAMANOS = { xs: 44, sm: 64, md: 74, lg: 128 } as const
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
  /**
   * Muestra la carta como DORSO (boca abajo) aunque su cardId sea visible
   * para el jugador (Arcanas/Combate/Vínculos propios). El clic/zoom siguen
   * funcionando: el dueño puede inspeccionar su propia carta.
   */
  bocaAbajo?: boolean
  onClick?: () => void
  /**
   * Abre la carta en grande (CartaZoom) para revisar su efecto. Si `onClick`
   * también está definido, el clic de la carta hace lo suyo y aparece una
   * lupita para el zoom; si no, el clic directo abre el zoom.
   */
  onZoom?: () => void
  title?: string
  /** Marcador extra superpuesto (badges de estado de zona). */
  marca?: ReactNode
  /** Tablero invertido: counter-rotate la lupita de zoom. */
  invertida?: boolean
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
  bocaAbajo,
  onClick,
  onZoom,
  title,
  marca,
  invertida,
  children,
}: MiniCardProps) {
  const cardId = inst.cardId ?? undefined
  const meta = cardId ? (carta ?? getCardMeta(cardId)) : null
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)
  const ancho = TAMANOS[tamano]
  const escala = ancho / ANCHO_CARTA
  const agotada = agotado ?? inst.agotado === true
  const eteres = inst.eterBloqueado?.length ?? 0
  /**
   * Campeón cansado: la carta se gira 90° (parte de arriba hacia la IZQUIERDA)
   * con la MISMA escala que la vertical: la rotada ocupa altoCarta × ancho,
   * exactamente el tamaño de la carta vertical girada. Las casillas del tablero
   * son tan anchas como el alto de una carta (ANCHO_CELDA) para acomodarla.
   */
  const altoCarta = ALTO_CARTA * escala

  if (!cardId || !meta || bocaAbajo) {
    // Dorso: boca abajo (mano rival, mazos, Arcanas/Vínculos rivales o
    // Arcanas/Combate/Vínculos PROPIOS que el dueño prefiere ver como dorso).
    // Si hay onClick/onZoom (carta propia) el clic abre la carta en grande.
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
            cursor: onClick ?? onZoom ? 'pointer' : 'default',
          }}
          onClick={onClick ?? onZoom}
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
          width: agotada ? altoCarta : ancho,
          height: agotada ? ancho : altoCarta,
          position: 'relative',
          cursor: onClick ?? onZoom ? 'pointer' : 'default',
          transition: 'transform 150ms ease, box-shadow 150ms ease',
        }}
        onClick={onClick ?? onZoom}
        title={title ?? meta.name}
      >
        {agotada ? (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                transform: `scale(${escala}) rotate(-90deg)`,
                transformOrigin: 'center',
                width: ANCHO_CARTA,
                height: ALTO_CARTA,
              }}
            >
              <RenderCarta card={aRenderizar} imageUrl={imageUrl} />
            </div>
          </div>
        ) : (
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
        )}

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

        {/* Lupita de zoom: solo cuando el clic de la carta ya hace otra cosa
            (pagar éter, responder…). Sin onClick, el clic directo abre el zoom. */}
        {onClick && onZoom && (
          <span
            role="button"
            aria-label="Ver carta grande"
            onClick={(e) => {
              e.stopPropagation()
              onZoom()
            }}
            style={{
              position: 'absolute',
              bottom: 2,
              right: 2,
              zIndex: 5,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: Math.max(14, ancho * 0.09),
              height: Math.max(14, ancho * 0.09),
              borderRadius: 6,
              background: 'rgba(0,0,0,0.7)',
              border: '1px solid #4b4b7a',
              color: '#e5e7eb',
              ...(invertida ? { transform: 'rotate(180deg)' } : undefined),
              cursor: 'pointer',
            }}
          >
            <svg width={Math.max(7, ancho * 0.045)} height={Math.max(7, ancho * 0.045)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </span>
        )}
      </div>
      {children}
    </div>
  )
}
