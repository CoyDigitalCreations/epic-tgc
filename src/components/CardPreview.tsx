import { useRef, useState, type ChangeEvent } from 'react'
import { useCardStore } from '../store/useCardStore'
import { exportCardToPng } from '../utils/export-png'
import { fileToDataUrl, isValidImageFile } from '../utils/file-to-data-url'
import type { AnyCard, CampeonCard, EterCard } from '../types'

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
  Táctica: {
    color: '#22d3ee',
    gradient: 'linear-gradient(180deg, #22d3ee 0%, #155e75 60%, #0d0d1a 100%)',
    border: '#0891b2',
  },
  Arcana: {
    color: '#f59e0b',
    gradient: 'linear-gradient(180deg, #f59e0b 0%, #92400e 60%, #0d0d1a 100%)',
    border: '#d97706',
  },
  Combate: {
    color: '#ec4899',
    gradient: 'linear-gradient(180deg, #ec4899 0%, #831843 60%, #0d0d1a 100%)',
    border: '#db2777',
  },
  Éter: {
    color: '#fbbf24',
    gradient: 'linear-gradient(180deg, #fbbf24 0%, #a16207 60%, #0d0d1a 100%)',
    border: '#f59e0b',
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

const ELEMENT_COLORS: Record<string, string> = {
  Fuego: '#ef4444',
  Agua: '#3b82f6',
  Tierra: '#92400e',
  Aire: '#a3e635',
  Luz: '#fef08a',
  Tinieblas: '#6b21a8',
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
      const dataUrl = await fileToDataUrl(file)
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

  if (!displayCard) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 font-display"
        style={{
          width: standalone ? 744 : '100%',
          height: standalone ? 1038 : 500,
          minHeight: 500,
        }}
      >
        <div className="text-center">
          <div className="text-6xl mb-4">✦</div>
          <p className="text-lg">Seleccioná o creá una carta</p>
          <p className="text-sm text-gray-600 mt-2">744 × 1038 px</p>
        </div>
      </div>
    )
  }

  const theme = TYPE_THEME[displayCard.type] ?? TYPE_THEME['Campeón']
  const rarityBorder = RARITY_BORDERS[displayCard.rarity] ?? '#4a4a5a'
  const showCombatStats = displayCard.type === 'Campeón'
  const stats = displayCard.stats as unknown as Record<string, unknown>
  const hasFlavorText = !!displayCard.flavorText

  /** Auto-escala el fontSize: texto corto → más grande (hasta 2x), texto largo → más chico (hasta minSize) */
  const fluidSize = (text: string | undefined | null, minSize: number): number => {
    const len = (text ?? '').length
    if (len <= 35) return +(minSize * 2).toFixed(1)
    if (len >= 220) return +minSize.toFixed(1)
    const t = (len - 35) / (220 - 35)
    return +(minSize * (2 - t)).toFixed(1)
  }

  const handleExport = async () => {
    if (previewRef.current) {
      await exportCardToPng(
        previewRef.current,
        displayCard!.name.replace(/\s+/g, '_'),
      )
    }
  }

  /* ───── card content ───── */

  const cardContent = (
    <div
      ref={previewRef}
      id="card-preview"
      style={{
        width: 744,
        height: 1038,
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 28,
        background: '#0d0f14',
        border: '6px solid #ffffff',
        boxSizing: 'border-box',
        boxShadow: `0 0 25px rgba(0,0,0,0.8), 0 0 15px ${rarityBorder}44`,
        fontFamily: '"Cinzel", serif',
      }}
      className="select-none"
    >
      {/* ── Capa de Fondo / Arte Principal Difuminado ── */}
      <div
        onMouseEnter={() => editable && setImageHover(true)}
        onMouseLeave={() => editable && setImageHover(false)}
        onClick={handleImageClick}
        style={{
          position: 'absolute',
          inset: 0,
          background: displayCard.imageUrl
            ? `url(${displayCard.imageUrl}) center top / cover no-repeat`
            : `radial-gradient(circle at 50% 35%, ${theme.color}44 0%, #0d0f14 70%)`,
          cursor: editable ? 'pointer' : 'default',
        }}
      >
        {/* Sombras y Difuminado Progresivo para integrar el Arte con el Marco */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
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
            background: `
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
              {displayCard.imageUrl ? 'Cambiar imagen de arte' : 'Cargar imagen de arte (Rec. 744x1038)'}
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

      {/* ── Marco Rúnico y Adornos Metalicos de la Carta ── */}
      <div
        style={{
          position: 'absolute',
          inset: 12,
          border: `2px solid ${rarityBorder}`,
        borderRadius: 20,
        pointerEvents: 'none',
        boxShadow: `inset 0 0 15px rgba(0,0,0,0.8), 0 0 8px ${theme.color}33`,
        zIndex: 5,
        }}
      />

        {/* ════════════ HEADER BAR & TITLE ════════════ */}
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            right: 24,
            height: 60,
            display: 'flex',
            alignItems: 'center',
            zIndex: 10,
          }}
        >
          {/* ── GEMA HEXAGONAL DE COSTE (Esquina Izquierda) ── */}
          {displayCard.type === 'Táctica' || displayCard.type === 'Combate' || displayCard.type === 'Éter' ? null : (
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: -6,
                width: 80,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 15,
              }}
            >
              {/* Hexágono Éter SVG */}
              <div
                style={{
                  width: 60,
                  height: 66,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  filter: 'drop-shadow(0px 0px 8px rgba(56, 189, 248, 0.7))',
                }}
              >
                <svg
                  viewBox="0 0 100 115"
                  width="60"
                  height="66"
                  style={{ position: 'absolute', inset: 0 }}
                >
                  <defs>
                    <linearGradient id="etherHexGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="60%" stopColor="#0284c7" />
                      <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                  </defs>
                  <polygon
                    points="50,2 98,29 98,86 50,113 2,86 2,29"
                    fill="url(#etherHexGrad)"
                    stroke="#bae6fd"
                    strokeWidth="4"
                    strokeLinejoin="round"
                  />
                </svg>
                <span
                  style={{
                    position: 'relative',
                    zIndex: 2,
                    fontFamily: '"Cinzel", serif',
                    fontSize: 32,
                    fontWeight: 900,
                    color: '#ffffff',
                    textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 0 8px rgba(255,255,255,0.8)',
                  }}
                >
                  {(stats.cost as number) ?? 0}
                </span>
              </div>

              {/* Etiqueta COSTE */}
              <div style={{ marginTop: 4, padding: '2px 8px' }}>
                <span
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 12,
                    fontWeight: 900,
                    color: '#bae6fd',
                    letterSpacing: '1px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                  }}
                >
                  COSTE
                </span>
              </div>
            </div>
          )}

          {/* ── PLACA PRINCIPAL DEL NOMBRE (Centro/Derecha) ── */}
          <div
            style={{
              marginLeft: (displayCard.type === 'Táctica' || displayCard.type === 'Combate' || displayCard.type === 'Éter') ? 0 : 90,
              flex: 1,
              height: 48,
              background: 'linear-gradient(180deg, #2a2420 0%, #171311 50%, #0d0a09 100%)',
              border: '2px solid #a38258',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              paddingLeft: (displayCard.type === 'Táctica' || displayCard.type === 'Combate' || displayCard.type === 'Éter') ? 16 : 20,
              paddingRight: 16,
              boxShadow: 'inset 0 0 10px rgba(0,0,0,0.8), 0 4px 10px rgba(0,0,0,0.7)',
              position: 'relative',
            }}
          >
            <span
              style={{
                fontFamily: '"Cinzel", serif',
                fontSize: 21,
                fontWeight: 800,
                color: '#fef08a',
                textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 6px rgba(253, 224, 71, 0.3)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {displayCard.name || 'Sin Nombre'}
            </span>
          </div>
        </div>

        {displayCard.type === 'Éter' && (
          /* ── SÍMBOLO DE ÉTER CENTRAL (debajo del nombre, 1.5x) ── */
          <div
            style={{
              position: 'absolute',
              top: 90,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 15,
            }}
          >
            {/* Diamante ÉTER grande (1.5x del original) */}
            <div
              style={{
                width: 90,
                height: 90,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                filter: 'drop-shadow(0px 0px 15px rgba(251, 191, 36, 0.8))',
              }}
            >
              <svg viewBox="0 0 100 100" width="87" height="87" style={{ position: 'absolute', inset: 0 }}>
                <defs>
                  <linearGradient id="eterBigDiamond" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="50%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                </defs>
                <polygon
                  points="50,2 98,50 50,98 2,50"
                  fill="url(#eterBigDiamond)"
                  stroke="#fef08a"
                  strokeWidth="4"
                  strokeLinejoin="round"
                />
              </svg>
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                  gap: 4,
                }}
              >
                <span
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 22,
                    fontWeight: 900,
                    color: '#fef08a',
                    textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.8)',
                  }}
                >
                  ✦
                </span>
                <span
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 44,
                    fontWeight: 900,
                    color: '#ffffff',
                    textShadow: '0 2px 6px rgba(0,0,0,0.8), 0 0 10px rgba(255,255,255,0.8)',
                  }}
                >
                  {(stats.cost as number) ?? 0}
                </span>
              </div>
            </div>
            {/* Etiqueta ÉTER grande */}
            <div style={{ marginTop: 6 }}>
              <span
                style={{
                  fontFamily: '"Cinzel", serif',
                  fontSize: 18,
                  fontWeight: 900,
                  color: '#fde68a',
                  letterSpacing: '2px',
                  textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                }}
              >
                ÉTER
              </span>
            </div>
          </div>
        )}

        {/* ── Badge circular de Elemento (esquina derecha del header) ── */}
        {displayCard.element && (
          <div
            style={{
              position: 'absolute',
              right: 28,
              top: 90,
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${ELEMENT_COLORS[displayCard.element] ?? '#888'} 0%, #000 150%)`,
              border: '3px solid #fef08a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(0,0,0,0.8), inset 0 2px 4px rgba(255,255,255,0.4)',
              zIndex: 15,
            }}
          >
            <span
              style={{
                fontFamily: '"Inter", sans-serif',
                fontSize: 22,
                textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                lineHeight: 1,
              }}
            >
              {displayCard.element === 'Fuego' ? '🔥' :
                displayCard.element === 'Agua' ? '💧' :
                  displayCard.element === 'Tierra' ? '⛰️' :
                    displayCard.element === 'Aire' ? '🌪️' :
                      displayCard.element === 'Luz' ? '☀️' :
                        displayCard.element === 'Tinieblas' ? '🌑' : '✨'}
            </span>
          </div>
        )}

        {/* ════════════ BARRA DE CLASIFICACIÓN / SUBTIPOS ════════════ */}
        <div
          style={{
            position: 'absolute',
            top: 605,
            left: 45,
            right: 45,
            height: 28,
            background: 'linear-gradient(180deg, #2b231c 0%, #1a1410 100%)',
            border: '1.5px solid #a38258',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 15,
            boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
          }}
        >
          <span
            style={{
              fontFamily: '"Cinzel", serif',
              fontSize: 13,
              fontWeight: 700,
              color: '#fef08a',
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
            }}
          >
            {displayCard.type === 'Campeón'
              ? [
                (displayCard as AnyCard & { faccion?: string }).faccion || 'SIN FACCIÓN',
                (displayCard as AnyCard & { esencia?: string }).esencia || 'SIN ESENCIA',
                (displayCard as AnyCard & { rol?: string }).rol || 'SIN ROL',
                (displayCard as AnyCard & { catHabilidad?: string }).catHabilidad || 'NORML',
              ].join(' / ')
              : displayCard.type === 'Mística'
                ? `${displayCard.type.toUpperCase()}${displayCard.element ? ` - ${displayCard.element.toUpperCase()}` : ''}`
                : displayCard.type === 'Éter'
                  ? `ÉTER${(() => {
                    const te = (displayCard as AnyCard & { tipoEfecto?: string }).tipoEfecto
                    return te ? ` / ${te.toUpperCase()}` : ''
                  })()}`
                  : `${displayCard.type.toUpperCase()}${displayCard.element ? ` / ${displayCard.element.toUpperCase()}` : ''}`
            }
          </span>
        </div>

        {/* ════════════ CAJA DE TEXTO Y HABILIDADES (PERGAMINO ENVEJECIDO) ════════════ */}
        <div
          style={{
            position: 'absolute',
            top: 640,
            left: 40,
            right: 40,
            height: 310,
            background: 'linear-gradient(180deg, #d8c49e 0%, #c4af88 50%, #b8a27a 100%)',
            border: '3px solid #6b5335',
            borderRadius: 12,
            padding: '24px 20px 60px 20px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            gap: 10,
            boxShadow: 'inset 0 0 25px rgba(80, 55, 25, 0.4), 0 8px 16px rgba(0,0,0,0.6)',
            zIndex: 10,
          }}
        >
          {/* Palabras clave (Keywords) */}
          {displayCard.keywords && displayCard.keywords.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              {displayCard.keywords.map((kw) => (
                <span
                  key={kw}
                  style={{
                    background: '#4a3722',
                    border: '1px solid #8c6d47',
                    borderRadius: 3,
                    padding: '2px 8px',
                    fontFamily: '"Cinzel", serif',
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#fef3c7',
                    letterSpacing: '0.5px',
                  }}
                >
                  {kw}
                </span>
              ))}
            </div>
          )}

          {/* Habilidades según tipo */}
          {(() => {
            const c = displayCard as AnyCard
            switch (c.type) {
              case 'Campeón': {
                const cm = c as CampeonCard
                const parts: React.ReactNode[] = []
                if (cm.tipoEfecto === 'Pasivo' || cm.tipoEfecto === 'Especial') {
                  if (cm.efectoPasivo) {
                    parts.push(
                      <p key="pasivo" style={{ fontFamily: '"Inter", sans-serif', fontSize: fluidSize(cm.efectoPasivo, 13.5), lineHeight: 1.35, fontWeight: 500, color: '#261a0e', margin: 0 }}>
                        <strong>Pasivo:</strong> {cm.efectoPasivo}
                      </p>
                    )
                  }
                }
                if (cm.tipoEfecto === 'Activo' || cm.tipoEfecto === 'Especial') {
                  if (cm.efectoActivo) {
                    parts.push(
                      <p key="activo" style={{ fontFamily: '"Inter", sans-serif', fontSize: fluidSize(cm.efectoActivo, 13.5), lineHeight: 1.35, fontWeight: 500, color: '#261a0e', margin: 0, marginTop: parts.length > 0 ? 8 : 0 }}>
                        <strong>Activo:</strong> {cm.efectoActivo}
                      </p>
                    )
                  }
                }
                return parts.length > 0 ? <>{parts}</> : null
              }

              case 'Mística':
                return c.efecto ? (
                  <p
                    style={{
                      fontFamily: '"Inter", sans-serif',
                      fontSize: fluidSize(c.efecto, 14),
                      lineHeight: 1.4,
                      color: '#1c130b',
                      margin: 0,
                    }}
                  >
                    <strong>Efecto:</strong> {c.efecto}
                  </p>
                ) : null

              case 'Táctica':
                return (
                  <>
                    {c.descripcion ? (
                      <p
                        style={{
                          fontFamily: '"Inter", sans-serif',
                          fontSize: fluidSize(c.descripcion, 14),
                          lineHeight: 1.4,
                          color: '#1c130b',
                          margin: 0,
                        }}
                      >
                        {c.descripcion}
                      </p>
                    ) : null}
                    {c.stats.duracion ? (
                      <p
                        style={{
                          fontFamily: '"Cinzel", serif',
                          fontSize: 12,
                          color: '#7c2d12',
                          fontWeight: 700,
                          margin: '4px 0 0',
                        }}
                      >
                        Duración: {c.stats.duracion} turnos
                      </p>
                    ) : null}
                  </>
                )

              case 'Arcana':
                return (
                  <>
                    {c.condicion ? (
                      <p
                        style={{
                          fontFamily: '"Inter", sans-serif',
                          fontSize: fluidSize(c.condicion, 13.5),
                          lineHeight: 1.4,
                          color: '#1c130b',
                          margin: 0,
                        }}
                      >
                        <strong>Condición:</strong> {c.condicion}
                      </p>
                    ) : null}
                    {c.recompensa ? (
                      <p
                        style={{
                          fontFamily: '"Inter", sans-serif',
                          fontSize: fluidSize(c.recompensa, 13.5),
                          lineHeight: 1.4,
                          color: '#1c130b',
                          margin: '4px 0 0',
                        }}
                      >
                        <strong>Recompensa:</strong> {c.recompensa}
                      </p>
                    ) : null}
                  </>
                )

              case 'Combate':
                return c.descripcion ? (
                  <p
                    style={{
                      fontFamily: '"Inter", sans-serif',
                      fontSize: fluidSize(c.descripcion, 14),
                      lineHeight: 1.4,
                      color: '#1c130b',
                      margin: 0,
                    }}
                  >
                    {c.descripcion}
                  </p>
                ) : null

              case 'Éter': {
                const et = c as EterCard
                const parts: React.ReactNode[] = []
                if (et.tipoEfecto === 'Pasivo' || et.tipoEfecto === 'Especial') {
                  if (et.efectoPasivo) {
                    parts.push(
                      <p key="pasivo" style={{ fontFamily: '"Inter", sans-serif', fontSize: fluidSize(et.efectoPasivo, 14), lineHeight: 1.4, color: '#1c130b', margin: 0 }}>
                        <strong>Pasivo:</strong> {et.efectoPasivo}
                      </p>
                    )
                  }
                }
                if (et.tipoEfecto === 'Activo' || et.tipoEfecto === 'Especial') {
                  if (et.efectoActivo) {
                    parts.push(
                      <p key="activo" style={{ fontFamily: '"Inter", sans-serif', fontSize: fluidSize(et.efectoActivo, 14), lineHeight: 1.4, color: '#1c130b', margin: 0, marginTop: parts.length > 0 ? 8 : 0 }}>
                        <strong>Activo:</strong> {et.efectoActivo}
                      </p>
                    )
                  }
                }
                return parts.length > 0 ? <>{parts}</> : null
              }
            }
          })()}

          {/* Texto de ambientación (Flavor Text) */}
          {hasFlavorText && (
            <div style={{ marginTop: 'auto', paddingTop: 6, borderTop: '1px solid #a3825866' }}>
              <p
                style={{
                  fontFamily: '"Inter", serif',
                  fontSize: fluidSize(displayCard.flavorText, 11.5),
                  fontStyle: 'italic',
                  lineHeight: 1.35,
                  color: '#4a3722',
                  margin: 0,
                }}
              >
                &ldquo;{displayCard.flavorText as string}&rdquo;
              </p>
            </div>
          )}
        </div>

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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'linear-gradient(180deg, #3a2218 0%, #1c0e08 100%)',
                border: '2px solid #b45309',
                borderRadius: 30,
                padding: '3px 18px 3px 6px',
                boxShadow: '0 6px 12px rgba(0,0,0,0.8), 0 0 10px rgba(180, 83, 9, 0.4)',
              }}
            >
              {/* Ícono Círculo Hacha */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #ea580c 0%, #7c2d12 100%)',
                  border: '2px solid #fef08a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14.5 17.5L3 6V3h3l11.5 11.5" />
                  <path d="M13 19l6-6" />
                  <path d="M16 16l4 4" />
                  <path d="M19 21l2-2" />
                </svg>
              </div>

              {/* Valor Numérico y Etiqueta ATK */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 28,
                    fontWeight: 900,
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                  }}
                >
                  {(stats.poder as number) ?? 500}
                </span>
                <span
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#f97316',
                    letterSpacing: '1px',
                  }}
                >
                  ATQ
                </span>
              </div>
            </div>

            {/* BADGE DE RES (Derecha - Escudo Rúnico Cian) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'linear-gradient(180deg, #0f2942 0%, #081420 100%)',
                border: '2px solid #0284c7',
                borderRadius: 30,
                padding: '3px 6px 3px 18px',
                boxShadow: '0 6px 12px rgba(0,0,0,0.8), 0 0 10px rgba(2, 132, 199, 0.4)',
              }}
            >
              {/* Valor Numérico y Etiqueta DEF */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginRight: 8 }}>
                <span
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 12,
                    fontWeight: 800,
                    color: '#38bdf8',
                    letterSpacing: '1px',
                  }}
                >
                  RES
                </span>
                <span
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 28,
                    fontWeight: 900,
                    color: '#ffffff',
                    textShadow: '0 2px 4px rgba(0,0,0,0.9)',
                  }}
                >
                  {(stats.resistencia as number) ?? 700}
                </span>
              </div>

              {/* Ícono Círculo Escudo */}
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, #0284c7 0%, #0c4a6e 100%)',
                  border: '2px solid #bae6fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
              >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="rgba(255,255,255,0.15)" />
                </svg>
              </div>
            </div>
          </div>
        )}

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
              fontSize: 10,
              fontWeight: 600,
              color: '#94a3b8',
              letterSpacing: '1px',
            }}
          >
            {(displayCard.id ?? 'CARD-001').slice(0, 8).toUpperCase()}
          </span>
        </div>
      </div>
  )

  if (standalone) {
    return (
      <div className="flex flex-col items-center gap-4">
        {cardContent}
        <button
          onClick={handleExport}
          className="bg-ether-600 hover:bg-ether-700 text-white font-medium px-6 py-2 rounded 
                     transition-colors cursor-pointer text-sm"
        >
          Exportar PNG
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        style={{
          transform: 'scale(0.45)',
          transformOrigin: 'top center',
          width: 744,
          height: 1038,
        }}
      >
        {cardContent}
      </div>
      <button
        onClick={handleExport}
        className="text-xs text-ether-400 hover:text-ether-300 transition-colors cursor-pointer bg-transparent border-none"
      >
        Exportar PNG
      </button>
    </div>
  )
}
