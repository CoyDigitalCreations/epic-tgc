import { useRef, useState, type ChangeEvent } from 'react'
import { useCardStore } from '../store/useCardStore'
import { exportCardToPng } from '../utils/export-png'
import { fileToCompressedDataUrl, isValidImageFile } from '../utils/file-to-data-url'
import { useCardImage } from '../hooks/useCardImage'
import type { AnyCard, CampeonCard, EterCard, Faccion } from '../types'
import { FACCION_COLORS, FACCION_IMAGES } from '../types'
import { CardFrame, CostGem, EtherDiamond, NamePlate, RuneIcon, StatBadge, TextScroll } from './card-art'

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
        boxSizing: 'border-box',
        boxShadow: `0 0 30px rgba(0,0,0,0.9)`,
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
          background: resolvedImageUrl
            ? `url(${resolvedImageUrl}) center top / cover no-repeat`
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

      {/* ── Marco Rúnico y Adornos Metalicos de la Carta ── */}
      <CardFrame accent={theme.color} rarityColor={rarityBorder} variant={displayCard.type} />

      {/* ── Marco Inferior (public/marco_bajo.png) — 75% del ancho, centrado ── */}
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
          {displayCard.type === 'Táctica' || displayCard.type === 'Combate' || displayCard.type === 'Éter' || displayCard.type === 'Vínculo' ? null : (
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

              {/* Etiqueta COSTE */}
              <div style={{ marginTop: 4, padding: '2px 8px' }}>
                <span
                  style={{
                    fontFamily: '"Cinzel", serif',
                    fontSize: 14,
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
          <NamePlate
            name={displayCard.name}
            accent={theme.color}
            marginLeft={-6}
            paddingLeft={(displayCard.type === 'Táctica' || displayCard.type === 'Combate' || displayCard.type === 'Éter' || displayCard.type === 'Vínculo') ? 16 : 20}
          />
        </div>

        {displayCard.type === 'Éter' && (
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
            {/* Diamante ÉTER grande (1.5x del original) */}
            <EtherDiamond value={(stats.cost as number) ?? 0} size={90} />
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

        {(() => {
          const facs = (displayCard as AnyCard & { facciones?: Faccion[] }).facciones
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
            top: 586,
            left: 18,
            right: 18,
            height: 40,
            display: 'flex',
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
            {displayCard.type === 'Campeón'
              ? [
                (displayCard as AnyCard & { esencia?: string }).esencia || 'SIN ESENCIA',
                (displayCard as AnyCard & { roles?: string[] }).roles?.join(' / ') || 'SIN ROL',
                (displayCard as AnyCard & { catHabilidad?: string }).catHabilidad || 'NORML',
              ].join(' / ')
              : displayCard.type.toUpperCase()
            }
          </span>
        </div>

        {/* ════════════ CAJA DE TEXTO Y HABILIDADES (PERGAMINO ENVEJECIDO) ════════════ */}
        <TextScroll
          style={{
            top: 624,
            left: 48,
            right: 48,
            height: 330,
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
                if (et.efectoReserva) {
                  parts.push(
                    <p key="reserva" style={{ fontFamily: '"Inter", sans-serif', fontSize: fluidSize(et.efectoReserva, 14), lineHeight: 1.4, color: '#1c130b', margin: 0 }}>
                      <strong>Reserva (2A):</strong> {et.efectoReserva}
                    </p>
                  )
                }
                if (et.efectoPago) {
                  parts.push(
                    <p key="pago" style={{ fontFamily: '"Inter", sans-serif', fontSize: fluidSize(et.efectoPago, 14), lineHeight: 1.4, color: '#1c130b', margin: 0, marginTop: parts.length > 0 ? 8 : 0 }}>
                      <strong>Pago (1A{et.variantePago ? `, ${et.variantePago}` : ''}):</strong> {et.efectoPago}
                    </p>
                  )
                }
                if (et.efectoBloqueo) {
                  parts.push(
                    <p key="bloqueo" style={{ fontFamily: '"Inter", sans-serif', fontSize: fluidSize(et.efectoBloqueo, 14), lineHeight: 1.4, color: '#1c130b', margin: 0, marginTop: parts.length > 0 ? 8 : 0 }}>
                      <strong>Bloqueo (1B-1F):</strong> {et.efectoBloqueo}
                    </p>
                  )
                }
                return parts.length > 0 ? <>{parts}</> : null
              }

              case 'Vínculo':
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
                    <strong>Efecto Permanente:</strong> {c.efecto}
                  </p>
                ) : null
            }
          })()}

          {/* Texto de ambientación (Flavor Text) */}
          {hasFlavorText && (
            <div style={{ marginTop: 'auto', marginBottom: 40, paddingTop: 6, borderTop: '1px solid #a3825866' }}>
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
        </TextScroll>

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
