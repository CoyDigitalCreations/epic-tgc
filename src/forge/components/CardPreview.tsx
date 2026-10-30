import { useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { useCardStore } from '../store/useCardStore'
import { exportCardToPng, exportCardToWebp } from '../utils/export-png'
import { fileToCompressedDataUrl, isValidImageFile } from '../utils/file-to-data-url'
import { useCardImage } from '../hooks/useCardImage'
import type { AnyCard } from '../../shared/types'
import { FACCION_COLORS, FACCION_IMAGES, KEYWORDS } from '../../shared/types'
import { CardFrame, CostGem, EtherHexagon, NamePlate, RuneIcon, StatBadge, TextScroll } from './card-art'
import { tamanoQueEntra } from './card-art/ajusteTexto'
import { condicionArcanaTexto } from './fields/CondicionArcanaField'

/** Wrap keywords in bold tags within a text string */
function highlightKeywords(text: string): ReactNode[] {
  const keywords = KEYWORDS.map(k => k).join('|')
  const regex = new RegExp(`\\b(${keywords})\\b`, 'g')
  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (KEYWORDS.includes(part as any)) {
      return <strong key={i}>{part}</strong>
    }
    return part
  })
}

/* ───────── type theme ───────── */
const TYPE_THEME: Record<
  string,
  { color: string; gradient: string; border: string }
> = {
  Campeón: {
    color: '#ef4444',
    gradient: 'linear-gradient(180deg, #ef4444 0%, #7f1d1d 60%, #0d0d1a 100%)',
    border: '#dc2626',
  },
  Mística: {
    color: '#a855f7',
    gradient: 'linear-gradient(180deg, #a855f7 0%, #581c87 60%, #0d0d1a 100%)',
    border: '#9333ea',
  },
  Arcana: {
    color: '#f59e0b',
    gradient: 'linear-gradient(180deg, #f59e0b 0%, #92400e 60%, #0d0d1a 100%)',
    border: '#d97706',
  },
  Éter: {
    color: '#fbbf24',
    gradient: 'linear-gradient(180deg, #fbbf24 0%, #a16207 60%, #0d0d1a 100%)',
    border: '#f59e0b',
  },
  Vínculo: {
    color: '#34d399',
    gradient: 'linear-gradient(180deg, #34d399 0%, #065f46 60%, #0d0d1a 100%)',
    border: '#10b981',
  },
}

const RARITY_BORDERS: Record<string, string> = {
  'Común': '#4a4a5a',
  'Poco Común': '#22c55e',
  'Rara': '#3b82f6',
  'Épica': '#a855f7',
  'Legendaria': '#f59e0b',
  'Única': '#ef4444',
}

/** Un párrafo del pergamino: etiqueta en negrita ("Pasivo") + texto del efecto. */
interface Parrafo {
  clave: string
  etiqueta: string
  texto: string
}

/** Textos del efecto de la carta según su tipo, leídos de efectos[] (sistema unificado). */
function parrafosDeEfecto(c: AnyCard): Parrafo[] {
  // Varios efectos del mismo tipo se unen (p. ej. Cassandra: dos continuos con umbrales distintos).
  const getEffectText = (tipo: string): string | undefined => {
    if (!('efectos' in c) || !c.efectos) return undefined
    const texts = c.efectos.filter((e) => e.tipo === tipo && e.texto).map((e) => e.texto!)
    return texts.length > 0 ? texts.join(' ') : undefined
  }
  const out: Parrafo[] = []
  const agregar = (clave: string, etiqueta: string, texto: string | undefined) => {
    if (texto) out.push({ clave, etiqueta, texto })
  }
  switch (c.type) {
    case 'Campeón':
      agregar('pasivo', 'Pasivo', getEffectText('pasivo'))
      agregar('disparo', 'Disparo', getEffectText('disparo'))
      agregar('continuo', 'Continuo', getEffectText('continuo'))
      agregar('comandante', 'Comandante', 'efectoComandante' in c && c.efectoComandante?.texto ? c.efectoComandante.texto : undefined)
      break
    case 'Mística':
      agregar('hechizo', 'Efecto', getEffectText('hechizo'))
      break
    case 'Arcana': {
      // condicion: campo dedicado estructurado (Fase 3e: sin string legacy)
      const rawCondicion = 'condicion' in c && c.condicion && typeof c.condicion === 'object' ? c.condicion : undefined
      agregar('condicion', 'Condición', rawCondicion ? condicionArcanaTexto(rawCondicion) : getEffectText('pasivo'))
      agregar('recompensa', 'Recompensa', getEffectText('hechizo'))
      break
    }
    case 'Éter': {
      const pagoEffect = 'efectos' in c && c.efectos ? c.efectos.find((e) => e.tipo === 'pago') : undefined
      const variantLabel = pagoEffect?.trigger === 'al_pagar_eter' ? 'Gatillo' : 'Pasivo'
      agregar('reserva', 'Reserva (2A)', getEffectText('reserva'))
      agregar('pago', `Pago (1A, ${variantLabel})`, getEffectText('pago'))
      agregar('bloqueo', 'Bloqueo (1B-1F)', getEffectText('bloqueo'))
      break
    }
    case 'Vínculo':
      agregar('vinculo', 'Efecto Permanente', getEffectText('vinculo'))
      break
  }
  return out
}

/* ───────── RenderCarta: render puro 744×1038 ─────────
   Componente reutilizable sin estado: dibuja la carta exactamente como la
   exporta el creador. CardPreview lo envuelve con overlays de edición y el
   tablero de Éter Online lo reutiliza para que las cartas se vean idénticas
   a las del creador. */

export interface RenderCartaProps {
  card: AnyCard
  imageUrl?: string
  /** Click sobre el área de arte (para el modo editable de CardPreview) */
  onArtClick?: () => void
  artCursor?: 'pointer' | 'default'
}

export function RenderCarta({
  card,
  imageUrl,
  onArtClick,
  artCursor = 'default',
}: RenderCartaProps) {
  const theme = TYPE_THEME[card.type] ?? TYPE_THEME['Campeón']
  const rarityBorder = RARITY_BORDERS[card.rarity] ?? '#4a4a5a'
  const showCombatStats = card.type === 'Campeón'
  const fullArt = card.variante === 'full-art'
  const stats = card.stats as Record<string, any>
  const sinGem =
    card.type === 'Éter' ||
    card.type === 'Vínculo'

  return (
    <div
      style={{
        width: 744,
        height: 1038,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 28,
        background: '#0d0f14',
        boxSizing: 'border-box',
        boxShadow: `0 0 30px rgba(0,0,0,0.9)`,
        fontFamily: '"Cinzel", serif',
      }}
      className="select-none"
    >
      {/* ── Capa de Fondo / Arte Principal ── */}
      <div
        onClick={onArtClick}
        style={{
          position: 'absolute',
          inset: 0,
          cursor: artCursor,
        }}
      >
        {/* Arte: limitado en altura (normal) o a sangre completa (full-art) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: fullArt ? 1038 : 586,
            background: imageUrl
              ? `url(${imageUrl}) center top / cover no-repeat`
              : `radial-gradient(circle at 50% 35%, ${theme.color}44 0%, #0d0f14 70%)`,
          }}
        />
        {/* Sombras y Difuminado Progresivo para integrar el Arte con el Marco */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: fullArt
              ? // Full art: oscurecer arriba (nombre) y abajo (texto), arte libre al centro
                `
                linear-gradient(180deg, 
                  rgba(0,0,0,0.92) 0%, 
                  rgba(0,0,0,0.35) 12%, 
                  transparent 28%, 
                  transparent 55%, 
                  rgba(0,0,0,0.7) 72%, 
                  rgba(0,0,0,0.96) 100%
                )
              `
              : `
                linear-gradient(180deg, 
                  ${theme.color}E6 0%, 
                  ${theme.color}99 7%, 
                  transparent 10%, 
                  transparent 58%, 
                  ${theme.color}88 62%, 
                  ${theme.color}E6 100%
                )
              `,
            pointerEvents: 'none',
          }}
        />
        {/* Sombra oscura extra para legibilidad */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: fullArt
              ? 'none'
              : `
                linear-gradient(180deg, 
                  rgba(0,0,0,0.85) 0%, 
                  rgba(0,0,0,0.3) 7%, 
                  transparent 10%, 
                  transparent 58%, 
                  rgba(0,0,0,0.7) 64%, 
                  rgba(0,0,0,0.95) 100%
                )
              `,
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* ── Marco Rúnico y Adornos Metálicos de la Carta (se omite en full-art) ── */}
      {!fullArt && <CardFrame accent={theme.color} rarityColor={rarityBorder} variant={card.type} />}

      {/* ── Marco Inferior (public/marco_bajo.png) — se omite en full-art ── */}
      {!fullArt && (
        <img
          src="/marco_bajo.png"
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            left: 48,
            right: 48,
            bottom: 40,
            height: 100,
            objectFit: 'fill',
            zIndex: 6,
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      )}

      {/* ════════════ HEADER BAR & TITLE ════════════ */}
      <div
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          right: 18,
          height: 80,
          display: 'flex',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        {/* ── GEMA HEXAGONAL DE COSTE (Esquina Izquierda) ── */}
        {sinGem ? null : (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -6,
              width: 150,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 15,
            }}
          >
            {/* Hexágono Éter — imagen public/hexagono_eter.png (doble de tamaño) */}
            <CostGem cost={(stats.cost as number) ?? 0} size={128} />
          </div>
        )}

        {/* ── PLACA PRINCIPAL DEL NOMBRE (Centro/Derecha) ── */}
        <NamePlate
          name={card.name}
          accent={theme.color}
          marginLeft={-6}
          paddingLeft={sinGem ? 16 : 20}
          hasHexagon={!sinGem}
        />
      </div>

      {card.type === 'Éter' && (
        /* ── SÍMBOLO DE ÉTER CENTRAL (debajo del nombre) ── */
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            zIndex: 15,
          }}
        >
          {/* Hexágono ÉTER — asset public/eter_solo.png (solo cartas de Éter) */}
          <EtherHexagon value={(stats.cost as number) ?? 0} size={90} />
          {/* Etiqueta ÉTER (azul cielo) */}
          <div style={{ marginTop: 6 }}>
            <span
              style={{
                fontFamily: '"Cinzel", serif',
                fontSize: 27,
                fontWeight: 900,
                color: '#7dd3fc',
                letterSpacing: '2px',
                textShadow: '0 2px 4px rgba(0,0,0,0.9)',
              }}
            >
              ÉTER
            </span>
          </div>
        </div>
      )}

      {(() => {
        const facs = card.facciones
        if (!facs?.length) return null
        return (
          <div
            style={{
              position: 'absolute',
              right: 28,
              top: 120,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              zIndex: 15,
            }}
          >
            {facs.slice(0, 3).map((fac) => (
              <div
                key={fac}
                title={fac}
                style={{
                  position: 'relative',
                  width: 110,
                  height: 110,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={FACCION_IMAGES[fac]}
                  alt={fac}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    borderRadius: '50%',
                    filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.6))',
                  }}
                />
                {/* Runa de la cosmología (FACCION_RUNES) superpuesta al medallón */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.9))',
                  }}
                >
                  <RuneIcon
                    faccion={fac}
                    color={FACCION_COLORS[fac]}
                    size={62}
                    strokeWidth={2.5}
                  />
                </div>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ════════════ BARRA DE CLASIFICACIÓN / SUBTIPOS ════════════ */}
      <div
        style={{
          position: 'absolute',
          top: 560,
          left: 18,
          right: 18,
          height: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 15,
          boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}
      >
        {/* Fondo — imagen public/esencia_text.png */}
        <img
          src="/esencia_text.png"
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'fill',
            userSelect: 'none',
          }}
        />
        <span
          style={{
            position: 'relative',
            zIndex: 2,
            fontFamily: '"Cinzel", serif',
            fontSize: 14,
            fontWeight: 800,
            color: '#fef08a',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
            textShadow: '0 2px 4px rgba(0,0,0,0.9)',
          }}
        >
          {card.type === 'Campeón'
            ? [
              card.esencia || 'SIN ESENCIA',
              card.roles?.join(' / ') || 'SIN ROL',
              (Array.isArray(card.catHabilidad) ? card.catHabilidad : [card.catHabilidad]).filter(Boolean).join(' / ') || 'NORML',
            ].join(' / ')
            : card.type.toUpperCase()
          }
        </span>
      </div>

      {/* ════════════ CAJA DE TEXTO Y HABILIDADES (PERGAMINO ENVEJECIDO) ════════════ */}
      {(() => {
        const parrafos = parrafosDeEfecto(card)
        const tieneKeywords = !!card.keywords && card.keywords.length > 0
        // Caja útil del efecto: ancho del pergamino − márgenes; alto − márgenes − pie − fila de keywords
        const altoEfecto = 369 - 28 - 92 - (tieneKeywords ? 36 : 0)
        const fuente = tamanoQueEntra(
          parrafos.map((p) => `${p.etiqueta}: ${p.texto}`),
          604,
          altoEfecto,
          { min: 11, max: 28 },
        )
        // Sabor: máx. 3 líneas; en los Campeones queda entre los badges de ATQ/RES
        const anchoSabor = showCombatStats ? 330 : 540
        const sabor = card.flavorText ? `${card.flavorText as string}` : ''
        const fuenteSabor = sabor ? tamanoQueEntra([sabor], anchoSabor, 62, { min: 12, max: 20, interlineado: 1.3, anchoChar: 0.5 }) : 0
        return (
          <TextScroll
            style={{ top: 600, left: 44, right: 44, height: 369 }}
            header={
              tieneKeywords ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {card.keywords!.map((kw) => (
                    <span
                      key={kw}
                      style={{
                        background: '#4a3722',
                        border: '1px solid #8c6d47',
                        borderRadius: 3,
                        padding: '3px 12px',
                        fontFamily: '"Cinzel", serif',
                        fontSize: 15,
                        fontWeight: 700,
                        color: '#fef3c7',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              ) : null
            }
            footer={
              sabor ? (
                <p
                  style={{
                    fontFamily: '"Inter", serif',
                    fontSize: fuenteSabor,
                    fontStyle: 'italic',
                    fontWeight: 600,
                    lineHeight: 1.3,
                    color: '#46321d',
                    textAlign: 'center',
                    margin: 0,
                    maxWidth: anchoSabor,
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  &ldquo;{sabor}&rdquo;
                </p>
              ) : null
            }
          >
            {parrafos.map((p) => (
              <p
                key={p.clave}
                style={{ fontFamily: '"Inter", sans-serif', fontSize: fuente, lineHeight: 1.32, fontWeight: 500, color: '#231709', margin: 0 }}
              >
                <strong>{p.etiqueta}:</strong> {highlightKeywords(p.texto)}
              </p>
            ))}
          </TextScroll>
        )
      })()}

      {/* ════════════ BADGES INFERIORES DE ATK Y DEF ════════════ */}
      {showCombatStats && (
        <div
          style={{
            position: 'absolute',
            bottom: 50,
            left: 30,
            right: 30,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            zIndex: 20,
            pointerEvents: 'none',
          }}
        >
          {/* BADGE DE ATK (Izquierda - Medallón con Hacha) */}
          <StatBadge kind="atk" value={(stats.poder as number) ?? 500} />

          {/* BADGE DE RES (Derecha - Escudo Rúnico Cian) */}
          <StatBadge kind="res" value={(stats.resistencia as number) ?? 700} />
        </div>
      )}

      {/* ════════════ RAREZA (rombo del color de la rareza) ════════════ */}
      <div style={{ position: 'absolute', bottom: 24, left: 44, zIndex: 15, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          aria-hidden="true"
          style={{ width: 11, height: 11, margin: '0 2px', transform: 'rotate(45deg)', background: rarityBorder, border: '1.5px solid #e5e7eb', boxSizing: 'content-box' }}
        />
        <span
          style={{
            fontFamily: '"Cinzel", serif',
            fontSize: 15,
            fontWeight: 700,
            color: '#cbd5e1',
            letterSpacing: '1.5px',
            textTransform: 'uppercase',
          }}
        >
          {card.rarity}
        </span>
      </div>

      {/* ════════════ PIE DE CARTA / CÓDIGO DE SET ════════════ */}
      <div
        style={{
          position: 'absolute',
          bottom: 22,
          right: 40,
          zIndex: 15,
        }}
      >
        <span
          style={{
            fontFamily: '"Inter", monospace',
            fontSize: 20,
            fontWeight: 600,
            color: '#94a3b8',
            letterSpacing: '1px',
          }}
        >
          {(card.id ?? 'CARD-001').slice(0, 8).toUpperCase()}
        </span>
      </div>
    </div>
  )
}

/* ───────── component ───────── */

interface CardPreviewProps {
  card?: AnyCard
  standalone?: boolean
  /** If true, clicking the art area lets you change the image */
  editable?: boolean
  /** Called when image changes (only if editable) */
  onImageChange?: (dataUrl: string | undefined) => void
}

export function CardPreview({
  card,
  standalone = false,
  editable = false,
  onImageChange,
}: CardPreviewProps) {
  const draft = useCardStore((s) => s.draft)
  const cards = useCardStore((s) => s.cards)
  const selectedId = useCardStore((s) => s.selectedCardId)
  const previewRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [imageHover, setImageHover] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)

  const handleImageClick = () => {
    if (editable) imageInputRef.current?.click()
  }

  const handleImageFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!isValidImageFile(file)) {
      setImageError('Formato no soportado')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setImageError('Imagen muy grande (máx 5 MB)')
      return
    }
    try {
      const dataUrl = await fileToCompressedDataUrl(file)
      onImageChange?.(dataUrl)
      setImageError(null)
    } catch {
      setImageError('Error al leer archivo')
    }
    e.target.value = ''
  }

  // Resolve card to display
  let displayCard: AnyCard | null = null
  if (card) {
    displayCard = card
  } else if (selectedId && draft.id === selectedId && draft.type) {
    displayCard = draft as unknown as AnyCard
  } else if (selectedId) {
    const found = cards.find((c) => c.id === selectedId)
    if (found) displayCard = found
  } else if (draft.type) {
    displayCard = draft as unknown as AnyCard
  }

  // Resolve art: inline (draft/in-memory) wins, else load from IndexedDB
  const resolvedImageUrl = useCardImage(
    displayCard?.id,
    displayCard?.hasImage,
    displayCard?.imageUrl,
  )

  if (!displayCard) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 font-display"
        style={{
          width: standalone ? 744 : 744 * 0.38,
          height: standalone ? 1038 : 1038 * 0.38,
          minHeight: standalone ? 1038 : 200,
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">✦</div>
          <p className="text-lg">Selecciona o crea una carta</p>
          <p className="text-sm text-gray-600 mt-2">744 × 1038 px</p>
        </div>
      </div>
    )
  }

  // PNG para imprimir (nombre legible); WebP para el arte del juego (nombre = id, como espera public/cartas)
  const handleExport = async () => {
    if (previewRef.current) {
      await exportCardToPng(
        previewRef.current,
        displayCard.name.replace(/\s+/g, '_'),
      )
    }
  }

  const handleExportWebp = async () => {
    if (!previewRef.current) return
    try {
      await exportCardToWebp(previewRef.current, displayCard.id)
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e))
    }
  }

  /* ───── card content ───── */

  const cardContent = (
    <div
      ref={previewRef}
      id="card-preview"
      onMouseEnter={() => editable && setImageHover(true)}
      onMouseLeave={() => editable && setImageHover(false)}
      style={{
        width: 744,
        height: 1038,
        position: 'relative',
      }}
      className="select-none"
    >
      <RenderCarta
        card={displayCard}
        imageUrl={resolvedImageUrl}
        onArtClick={handleImageClick}
        artCursor={editable ? 'pointer' : 'default'}
      />

      {/* Hover overlay para imagen editable */}
      {editable && imageHover && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 30,
          }}
        >
          <span
            style={{
              color: '#38bdf8',
              fontFamily: '"Inter", sans-serif',
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: '1px',
              textTransform: 'uppercase',
              background: 'rgba(0,0,0,0.75)',
              padding: '10px 20px',
              borderRadius: 8,
              border: '1px solid #38bdf866',
            }}
          >
            {resolvedImageUrl ? 'Cambiar imagen de arte' : 'Cargar imagen de arte (Rec. 744x1038)'}
          </span>
        </div>
      )}

      {/* hidden file input */}
      {editable && (
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          onChange={handleImageFile}
          style={{ display: 'none' }}
        />
      )}

      {imageError && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            left: 20,
            right: 20,
            background: 'rgba(239,68,68,0.95)',
            color: '#fff',
            fontSize: 12,
            padding: '6px 12px',
            borderRadius: 6,
            textAlign: 'center',
            zIndex: 30,
          }}
        >
          {imageError}
        </div>
      )}
    </div>
  )

  if (standalone) {
    return (
      <div className="flex flex-col items-center gap-4">
        {cardContent}
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="bg-ether-600 hover:bg-ether-700 text-white font-medium px-6 py-2 rounded 
                       transition-colors cursor-pointer text-sm"
          >
            Exportar PNG
          </button>
          <button
            onClick={handleExportWebp}
            className="bg-ether-600 hover:bg-ether-700 text-white font-medium px-6 py-2 rounded 
                       transition-colors cursor-pointer text-sm"
          >
            Exportar WebP
          </button>
        </div>
      </div>
    )
  }

  const SCALE = 0.38
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          width: 744 * SCALE,
          height: 1038 * SCALE,
        }}
      >
        <div
          style={{
            transform: `scale(${SCALE})`,
            transformOrigin: 'top left',
            width: 744,
            height: 1038,
          }}
        >
          {cardContent}
        </div>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleExport}
          className="text-xs text-ether-400 hover:text-ether-300 transition-colors cursor-pointer bg-transparent border-none"
        >
          Exportar PNG
        </button>
        <button
          onClick={handleExportWebp}
          className="text-xs text-ether-400 hover:text-ether-300 transition-colors cursor-pointer bg-transparent border-none"
        >
          Exportar WebP
        </button>
      </div>
    </div>
  )
}
