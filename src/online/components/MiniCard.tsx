import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { RenderCarta } from '../../forge/components/CardPreview'
import { useCardImage } from '../../forge/hooks/useCardImage'
import type { AnyCard } from '../../shared/types'
import { getCardMeta } from '../game'
import type { CardInstance } from '../game'
import { useAnimacionActiva, useEnVuelo } from '../animacion/contexto'
import { useInspeccionar } from './tableroContext'

const ANCHO_CARTA = 744
const ALTO_CARTA = 1038
/** Duración de la revelación de una carta (debe coincidir con `.anim-revelar-*` en index.css). */
const DURACION_REVELAR_MS = 900

export const TAMANOS = { xs: 44, sm: 64, md: 74, lg: 128 } as const
export type TamanoMini = keyof typeof TAMANOS

interface MiniCardProps {
  inst: CardInstance
  tamano?: TamanoMini
  /** Ancho en px que pisa a `tamano` (el fantasma de la animación de movimiento usa el de su destino). */
  anchoPx?: number
  /**
   * Copia "decorativa" (inspector, fantasma de animación): sin ancla `data-inst`
   * (no debe confundir la medición del FLIP) y sin alimentar al inspector por hover.
   */
  sinAncla?: boolean
  /** Sin tooltip ni `title` con el nombre: para galerías que ya muestran el nombre como etiqueta (evita duplicarlo). */
  sinTooltip?: boolean
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
  /**
   * Nombre del campeón al que está equipado este artefacto (Mística/Arcana).
   * Se muestra en el tooltip hover: "→ equipado a [nombre]".
   */
  equipadoANombre?: string
  /**
   * Éteres bloqueados como MiniCards encima de la carta (Místicas/Arcanas).
   * Los puntos azules en la carta se mantienen como indicador adicional.
   * Si se pasa, se renderizan horizontalmente SOBRE la carta.
   */
  eteresBloqueados?: CardInstance[]
  /** Click en la fila de Éteres bloqueados (abre el panel de bloqueados). */
  onÉterClick?: () => void
  /** Marcador extra superpuesto (badges de estado de zona). */
  marca?: ReactNode
  /** Tablero invertido: counter-rotate la lupita de zoom. */
  invertida?: boolean
  /**
   * Rota la carta 90° si está agotada (solo casillas del campo 2B-2F).
   * Default false: en modales, cadena, mano y paneles SIEMPRE vertical.
   */
  rotarSiAgotado?: boolean
  /**
   * Los `children` (botones de acción) se superponen sobre la parte baja de la
   * carta en vez de ir debajo: no agrandan la casilla ni mueven el tablero
   * cuando aparecen (p. ej. Atacar/Bloquear/Activar de un Campeón).
   */
  hijosSobreCarta?: boolean
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
  anchoPx,
  sinAncla,
  sinTooltip,
  carta,
  agotado,
  seleccionada,
  bocaAbajo,
  onClick,
  onZoom,
  title,
  equipadoANombre,
  eteresBloqueados,
  onÉterClick,
  marca,
  invertida,
  rotarSiAgotado = false,
  hijosSobreCarta = false,
  children,
}: MiniCardProps) {
  const cardId = inst.cardId ?? undefined
  const meta = cardId ? (carta ?? getCardMeta(cardId)) : null
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)
  const ancho = anchoPx ?? TAMANOS[tamano]
  const escala = ancho / ANCHO_CARTA
  // Su fantasma está en vuelo: la carta real espera invisible (conserva el hueco)
  const visibility = useEnVuelo(inst.cardInstanceId) ? 'hidden' : undefined
  const inspeccionar = useInspeccionar()
  const ancla = sinAncla ? undefined : inst.cardInstanceId
  // Rotación SOLO en campo (rotarSiAgotado): modales/mano/cadena siempre vertical
  const agotada = rotarSiAgotado && (agotado ?? inst.agotado === true)
  const eteres = inst.eterBloqueado?.length ?? 0
  // Éteres bloqueados como cartas encima (solo Místicas/Arcanas)
  const esArtefacto = meta?.type === 'Mística' || meta?.type === 'Arcana'
  const eteresVisibles = esArtefacto && eteresBloqueados && eteresBloqueados.length > 0
  // Tooltip hover: nombre + vínculo de equipamiento
  const tooltipTexto = equipadoANombre
    ? `${meta?.name ?? ''} → equipado a ${equipadoANombre}`
    : (title ?? meta?.name ?? '')
  // Último Éter bloqueado para el overlay rotado (hooks arriba del return)
  const ultimoEter = eteresVisibles ? eteresBloqueados![eteresBloqueados!.length - 1] : null
  const metaEter = ultimoEter?.cardId ? getCardMeta(ultimoEter.cardId) : null
  const imgEter = useCardImage(ultimoEter?.cardId ?? undefined, metaEter?.hasImage, metaEter?.imageUrl)
  // Éter cards don't have combat stats (poder/resistencia) — metaEter is enough
  const eterRender: AnyCard | null = metaEter
  /**
   * Campeón cansado: la carta se gira 90° (parte de arriba hacia la IZQUIERDA)
   * con la MISMA escala que la vertical: la rotada ocupa altoCarta × ancho,
   * exactamente el tamaño de la carta vertical girada. Las casillas del tablero
   * son tan anchas como el alto de una carta (ANCHO_CELDA) para acomodarla.
   */
  const altoCarta = ALTO_CARTA * escala

  // Revelación en el lugar (Ruptura de un Vínculo, Arcana que se activa): el dorso gira y aparece la cara.
  const esDorso = !cardId || !meta || !!bocaAbajo
  const animar = useAnimacionActiva()
  const eraDorso = useRef(esDorso)
  const [revelando, setRevelando] = useState(false)
  useEffect(() => {
    const antes = eraDorso.current
    eraDorso.current = esDorso
    if (!antes || esDorso || !animar) return
    setRevelando(true)
    const id = window.setTimeout(() => setRevelando(false), DURACION_REVELAR_MS)
    return () => window.clearTimeout(id)
  }, [esDorso, animar])

  if (esDorso) {
    // Dorso: boca abajo (mano rival, mazos, Arcanas/Vínculos rivales o
    // Arcanas/Combate/Vínculos PROPIOS que el dueño prefiere ver como dorso).
    // Si hay onClick/onZoom (carta propia) el clic abre la carta en grande.
    return (
      <div className="flex flex-col items-center gap-1" style={{ width: ancho, visibility }}>
        <div
          data-inst={ancla}
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
    <div className="group relative flex flex-col items-center gap-1" style={{ width: ancho, visibility }}>
      {/* Tooltip hover: nombre de la carta + vínculo equipado */}
      {meta && !sinTooltip && (
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap px-2 py-1 rounded bg-black/85 border border-gray-600 text-[10px] text-gray-200"
          style={{ bottom: '100%', marginBottom: 4 }}
        >
          {tooltipTexto}
        </div>
      )}
      <div
        data-inst={ancla}
        onMouseEnter={sinAncla ? undefined : () => inspeccionar({ inst, carta: aRenderizar })}
        style={{
          width: agotada ? altoCarta : ancho,
          height: agotada ? ancho : altoCarta,
          position: 'relative',
          cursor: onClick ?? onZoom ? 'pointer' : 'default',
          transition: 'transform 150ms ease, box-shadow 150ms ease',
        }}
        onClick={onClick ?? onZoom}
        title={sinTooltip ? undefined : tooltipTexto}
      >
        <div className={revelando ? 'anim-revelar-frente' : undefined} style={{ position: 'absolute', inset: 0 }}>
          {rotarSiAgotado ? (
            // Campo: el giro de agotar/enderezar se anima girando la carta sobre su centro
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: agotada ? 'none' : undefined,
              }}
            >
              <div
                className={animar ? 'anim-giro' : undefined}
                style={{
                  transform: `scale(${escala}) rotate(${agotada ? -90 : 0}deg)`,
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
        </div>
        {revelando && (
          <div
            aria-hidden="true"
            className="anim-revelar-dorso"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 6,
              border: '1px solid #3b3b5c',
              background: 'linear-gradient(135deg, #14142b 0%, #1e1e3a 60%, #2a2a4e 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b4b7a',
              fontFamily: '"Cinzel", serif',
              fontSize: tamano === 'sm' ? 10 : 14,
              fontWeight: 700,
              pointerEvents: 'none',
              zIndex: 5,
            }}
          >
            ✦
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
        {inst.bocaArriba && meta?.type === 'Vínculo' && (
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

        {/* Último Éter bloqueado como overlay SOBRE la imagen (Místicas/Arcanas).
            Solo la última carta, en posición rotada (como agotado). Los puntos
            azules abajo indican el total. Clic abre el panel con todas.
            El overlay es MÁS GRANDE que la carta y sobresale de ella. */}
        {eteresVisibles && eterRender && (
          <div
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onÉterClick?.()
            }}
            title="Ver Éteres bloqueados"
            style={{
              position: 'absolute',
              bottom: 6,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 4,
              pointerEvents: 'auto',
            }}
          >
            <div
              style={{
                width: ancho * 1.3,
                height: ancho * 0.85,
                position: 'relative',
              }}
            >
              {/* Carta rotada 90° (posición agotado) — claramente más ancha que la carta madre */}
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
                    transform: `scale(${(ancho * 0.85) / ANCHO_CARTA}) rotate(-90deg)`,
                    transformOrigin: 'center',
                    width: ANCHO_CARTA,
                    height: ALTO_CARTA,
                  }}
                >
                  <RenderCarta card={eterRender} imageUrl={imgEter} />
                </div>
              </div>
            </div>
            {/* Badge ×N si hay más de una */}
            {eteresBloqueados!.length > 1 && (
              <span
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -4,
                  background: 'rgba(0,0,0,0.8)',
                  color: '#22d3ee',
                  fontSize: 8,
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: 4,
                  border: '1px solid rgba(34,211,238,0.4)',
                  pointerEvents: 'none',
                  ...(invertida ? { transform: 'rotate(180deg)' } : undefined),
                }}
              >
                ×{eteresBloqueados!.length}
              </span>
            )}
          </div>
        )}

        {/* Éteres bloqueados — indicador (puntos azules, 1B-1F) */}
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

        {/* Botones de acción superpuestos sobre la parte baja de la carta (no agrandan la casilla) */}
        {hijosSobreCarta && children && (
          <div
            className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-0.5 pb-0.5 pt-3"
            style={{ background: 'linear-gradient(to top, rgba(8,8,16,0.92) 40%, transparent)' }}
          >
            {children}
          </div>
        )}

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
      {!hijosSobreCarta && children}
    </div>
  )
}
