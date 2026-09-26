import { useMemo, useState } from 'react'
import { useCardStore } from '../../forge/store/useCardStore'
import { useCardImage } from '../../forge/hooks/useCardImage'
import { RenderCarta } from '../../forge/components/CardPreview'
import { buildDeck, cartasDisponibles, conteosDe } from '../mazos'
import type { MazoPersonalizado } from '../useMazosStore'
import { condicionArcanaTexto } from '../../forge/components/fields/CondicionArcanaField'
import type { CondicionEfecto } from '../../shared/types/cards'
import { CARD_TYPES, FACCION_COLORS, FACCIONES, KEYWORDS, type AnyCard, type CardType, type Faccion } from '../../shared/types'

const MAX_ETER = 15
const MAX_PRINCIPAL = 45
const MAX_VINCULOS = 6
const TOTAL_MAZO = MAX_ETER + MAX_PRINCIPAL + MAX_VINCULOS // 66

interface MazoEditorProps {
  inicial?: MazoPersonalizado
  onGuardar: (mazo: { nombre: string; cardIds: string[] }) => void
  onCancelar: () => void
}

function copiasDe(card: AnyCard): number {
  return Number(card.limiteCopias ?? 1)
}

function seleccionDesdeCardIds(cardIds: string[]): Map<string, number> {
  const seleccion = new Map<string, number>()
  for (const id of cardIds) {
    seleccion.set(id, (seleccion.get(id) ?? 0) + 1)
  }
  return seleccion
}

function efectosDe(card: AnyCard): { etiqueta: string; texto: string }[] {
  if (card.type === 'Arcana') {
    const l: { etiqueta: string; texto: string }[] = []
    const rawCondicion = ('condicion' in card && card.condicion) ? card.condicion : undefined
    const condicionData = (rawCondicion && typeof rawCondicion === 'object' && 'trigger' in rawCondicion)
      ? rawCondicion as CondicionEfecto
      : undefined
    const condicionTexto = condicionData
      ? condicionArcanaTexto(condicionData)
      : typeof rawCondicion === 'string' ? rawCondicion : undefined
    const recompensa = card.efectos?.find((e) => e.tipo === 'hechizo')?.texto
    if (condicionTexto) l.push({ etiqueta: 'Condición', texto: condicionTexto })
    if (recompensa) l.push({ etiqueta: 'Recompensa', texto: recompensa })
    return l
  }

  if ('efectos' in card && card.efectos && card.efectos.length > 0) {
    return card.efectos
      .filter((e) => e.texto)
      .map((e) => ({
        etiqueta: e.tipo.charAt(0).toUpperCase() + e.tipo.slice(1),
        texto: e.texto!,
      }))
  }

  switch (card.type) {
    case 'Campeón': {
      const l: { etiqueta: string; texto: string }[] = []
      if (card.efectoPasivo) l.push({ etiqueta: 'Pasivo', texto: card.efectoPasivo })
      if (card.efectoDisparo) l.push({ etiqueta: 'Disparo', texto: card.efectoDisparo })
      if (card.efectoContinuo) l.push({ etiqueta: 'Continuo', texto: card.efectoContinuo })
      return l
    }
    case 'Mística':
      return card.efecto ? [{ etiqueta: 'Efecto', texto: card.efecto }] : []
    case 'Éter': {
      const l: { etiqueta: string; texto: string }[] = []
      if (card.efectoReserva) l.push({ etiqueta: 'Reserva', texto: card.efectoReserva })
      if (card.efectoPago) l.push({ etiqueta: 'Pago', texto: card.efectoPago })
      if (card.efectoBloqueo) l.push({ etiqueta: 'Bloqueo', texto: card.efectoBloqueo })
      return l
    }
    case 'Vínculo':
      return card.efecto ? [{ etiqueta: 'Efecto', texto: card.efecto }] : []
    default:
      return []
  }
}

/** Wrap keywords in bold tags within a text string */
function highlightKeywords(text: string): React.ReactNode[] {
  const keywords = KEYWORDS.map(k => k).join('|')
  const regex = new RegExp(`\\b(${keywords})\\b`, 'g')
  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (KEYWORDS.includes(part as any)) {
      return <strong key={i} className="text-amber-400">{part}</strong>
    }
    return part
  })
}

/** Miniature of a card in the deck list (left bottom). Uses RenderCarta scaled down. */
function MiniDeckCard({
  card,
  count,
  onClick,
}: {
  card: AnyCard
  count: number
  onClick: () => void
}) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-surface-2 border border-card-border
                 hover:border-ether-500/50 cursor-pointer transition-colors shrink-0"
      onClick={onClick}
      title={`${card.name} ×${count}`}
    >
      <div
        className="shrink-0 rounded overflow-hidden"
        style={{
          width: 32,
          aspectRatio: '744/1038',
          background: 'linear-gradient(135deg, #14142b 0%, #1e1e3a 60%, #2a2a4e 100%)',
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span className="flex items-center justify-center h-full text-[8px] text-[#4b4b7a] font-display font-bold">✦</span>
        )}
      </div>
      <span className="text-[10px] text-gray-300 truncate max-w-[80px]">{card.name}</span>
      <span className="text-[10px] text-ether-400 font-mono">×{count}</span>
    </div>
  )
}

/** Scaled card wrapper for the center catalog and right detail panels. */
function ScaledCard({
  card,
  imageUrl,
  scale,
  onClick,
  className = '',
}: {
  card: AnyCard
  imageUrl?: string
  scale: number
  onClick?: () => void
  className?: string
}) {
  return (
    <div
      className={`relative cursor-pointer ${className}`}
      style={{
        width: 744 * scale,
        height: 1038 * scale,
      }}
      onClick={onClick}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: 744,
          height: 1038,
        }}
      >
        <RenderCarta card={card} imageUrl={imageUrl} />
      </div>
    </div>
  )
}

/**
 * Editor interactivo de mazo personalizado: layout de 3 columnas.
 * - Izquierda: arte de la carta + miniaturas del mazo
 * - Centro: filtros + catálogo de miniaturas físicas
 * - Derecha: carta física grande + detalle completo
 */
export function MazoEditor({ inicial, onGuardar, onCancelar }: MazoEditorProps) {
  const coleccion = useCardStore((s) => s.cards)
  const [nombre, setNombre] = useState(inicial?.nombre ?? '')
  const [seleccion, setSeleccion] = useState<Map<string, number>>(
    () => (inicial ? seleccionDesdeCardIds(inicial.cardIds) : new Map()),
  )
  const [tipo, setTipo] = useState<'' | CardType>('')
  const [faccion, setFaccion] = useState<'' | Faccion>('')
  const [texto, setTexto] = useState('')
  const [hoveredCard, setHoveredCard] = useState<AnyCard | null>(null)

  const cartas = useMemo(() => cartasDisponibles(coleccion), [coleccion])
  const deck = useMemo(() => buildDeck(seleccion), [seleccion])
  const conteos = useMemo(() => conteosDe(deck), [deck])
  const total = deck.length

  const filtradas = useMemo(() => {
    return cartas.filter((c) => {
      if (tipo && c.type !== tipo) return false
      if (faccion && !c.facciones?.includes(faccion)) return false
      if (texto && !c.name.toLowerCase().includes(texto.toLowerCase())) return false
      return true
    })
  }, [cartas, tipo, faccion, texto])

  const limiteTipo = (card: AnyCard): number =>
    card.type === 'Éter' ? MAX_ETER : card.type === 'Vínculo' ? MAX_VINCULOS : MAX_PRINCIPAL

  const agregar = (card: AnyCard) => {
    const actual = seleccion.get(card.id) ?? 0
    const tipoActual = card.type === 'Éter' ? conteos.eter : card.type === 'Vínculo' ? conteos.vinculos : conteos.principal
    if (actual >= copiasDe(card) || tipoActual >= limiteTipo(card)) return
    setSeleccion(new Map(seleccion).set(card.id, actual + 1))
  }

  const quitar = (card: AnyCard) => {
    const actual = seleccion.get(card.id) ?? 0
    if (actual <= 0) return
    const nuevo = new Map(seleccion)
    if (actual === 1) nuevo.delete(card.id)
    else nuevo.set(card.id, actual - 1)
    setSeleccion(nuevo)
  }

  const valido =
    nombre.trim() !== '' &&
    total === TOTAL_MAZO &&
    conteos.eter === MAX_ETER &&
    conteos.principal === MAX_PRINCIPAL &&
    conteos.vinculos === MAX_VINCULOS

  // Cards already in the deck, grouped by cardId with counts
  const deckCards = useMemo(() => {
    const result: { card: AnyCard; count: number }[] = []
    for (const [cardId, count] of seleccion) {
      const card = cartas.find((c) => c.id === cardId)
      if (card) result.push({ card, count })
    }
    return result
  }, [seleccion, cartas])

  // The currently hovered/selected card for left and right panels
  const activeCard = hoveredCard ?? deckCards[0]?.card ?? filtradas[0] ?? null

  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body">
      {/* Header */}
      <header className="border-b border-card-border bg-surface">
        <div className="max-w-[1920px] mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-display font-bold text-gray-100 tracking-wider">
              {inicial ? 'Editar mazo personalizado' : 'Nuevo mazo personalizado'}
            </h1>
            <p className="text-xs text-gray-500 font-body">
              15 Éter + 45 Principal + 6 Vínculos = 66 cartas
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onCancelar}
              className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
            >
              Volver
            </button>
            <button
              onClick={() => onGuardar({ nombre: nombre.trim(), cardIds: buildDeck(seleccion) })}
              disabled={!valido}
              className="bg-ether-600 hover:bg-ether-500 text-white px-6 py-1.5 rounded-lg font-display text-sm tracking-wider
                         transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Guardar mazo
            </button>
          </div>
        </div>
      </header>

      {/* 3-Column Layout */}
      <div className="max-w-[1920px] mx-auto px-4 py-4 flex gap-4 h-[calc(100vh-72px)]">

        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className="w-1/3 flex flex-col gap-3 min-w-0">
          {/* Top: Large card art */}
          <div className="flex-1 rounded-xl bg-surface border border-card-border overflow-hidden flex items-center justify-center min-h-0">
            {activeCard ? (
              <LargeCardArt card={activeCard} />
            ) : (
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">✦</div>
                <p className="text-sm">Seleccioná una carta</p>
              </div>
            )}
          </div>

          {/* Bottom: Deck miniatures */}
          <div className="h-[220px] rounded-xl bg-surface border border-card-border p-2 overflow-y-auto">
            <h3 className="text-[10px] font-display text-gray-500 uppercase tracking-widest mb-2 px-1">
              Mazo ({total}/{TOTAL_MAZO})
            </h3>
            {deckCards.length === 0 ? (
              <p className="text-[10px] text-gray-600 px-1">Sin cartas aún</p>
            ) : (
              <div className="flex flex-col gap-1">
                {deckCards.map(({ card, count }) => (
                  <MiniDeckCard
                    key={card.id}
                    card={card}
                    count={count}
                    onClick={() => setHoveredCard(card)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ════════════ CENTER COLUMN ════════════ */}
        <div className="w-1/3 flex flex-col min-w-0">
          {/* Name input */}
          <div className="mb-2">
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del mazo"
              className="w-full bg-surface-2 border border-card-border rounded-lg px-3 py-2 text-sm text-gray-100
                         focus:outline-none focus:border-ether-400 transition-colors"
            />
          </div>

          {/* Counters */}
          <div
            data-testid="contadores"
            className={`mb-2 px-3 py-1.5 rounded-lg text-xs font-mono border inline-block
              ${valido ? 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40' : 'bg-surface-2 text-gray-300 border-card-border'}`}
          >
            Éter {conteos.eter}/{MAX_ETER} · Principal {conteos.principal}/{MAX_PRINCIPAL} · Vínculos {conteos.vinculos}/{MAX_VINCULOS} · Total {total}/{TOTAL_MAZO}
          </div>

          {/* Filters */}
          <div className="flex gap-2 mb-2 flex-wrap">
            <select
              aria-label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as '' | CardType)}
              className="bg-surface-2 border border-card-border rounded-lg px-2 py-1.5 text-xs text-gray-100
                         focus:outline-none focus:border-ether-400 transition-colors"
            >
              <option value="">Todos</option>
              {CARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              aria-label="Facción"
              value={faccion}
              onChange={(e) => setFaccion(e.target.value as '' | Faccion)}
              className="bg-surface-2 border border-card-border rounded-lg px-2 py-1.5 text-xs text-gray-100
                         focus:outline-none focus:border-ether-400 transition-colors"
            >
              <option value="">Todas</option>
              {FACCIONES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Buscar..."
              className="flex-1 min-w-[120px] bg-surface-2 border border-card-border rounded-lg px-2 py-1.5 text-xs text-gray-100
                         focus:outline-none focus:border-ether-400 transition-colors"
            />
          </div>

          {/* Card catalog grid */}
          <div className="flex-1 overflow-y-auto rounded-xl bg-surface border border-card-border p-2 min-h-0">
            <div className="grid grid-cols-3 gap-2">
              {filtradas.map((c) => {
                const copias = seleccion.get(c.id) ?? 0
                const limite = copiasDe(c)
                const topeTipo = limiteTipo(c)
                const tipoLleno =
                  (c.type === 'Éter' ? conteos.eter : c.type === 'Vínculo' ? conteos.vinculos : conteos.principal) >= topeTipo
                return (
                  <CatalogCard
                    key={c.id}
                    card={c}
                    copias={copias}
                    limite={limite}
                    tipoLleno={tipoLleno}
                    onAgregar={() => agregar(c)}
                    onQuitar={() => quitar(c)}
                    onSelect={() => setHoveredCard(c)}
                  />
                )
              })}
            </div>
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN ════════════ */}
        <div className="w-1/3 flex flex-col gap-3 min-w-0">
          {/* Top: Large physical card (fixed height, card fills it) */}
          <div className="h-[52%] rounded-xl bg-surface border border-card-border overflow-hidden flex items-center justify-center min-h-0">
            {activeCard ? (
              <LargeCardPhysical card={activeCard} />
            ) : (
              <div className="text-center text-gray-500">
                <div className="text-4xl mb-2">✦</div>
                <p className="text-sm">Seleccioná una carta</p>
              </div>
            )}
          </div>

          {/* Bottom: Card detail */}
          <div className="flex-1 rounded-xl bg-surface border border-card-border p-3 overflow-y-auto min-h-0">
            {activeCard ? (
              <CardDetail card={activeCard} />
            ) : (
              <p className="text-xs text-gray-500 text-center mt-4">Sin selección</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ════════════ SUB-COMPONENTS ════════════ */

/** Left column top: Large card art only (background image) */
function LargeCardArt({ card }: { card: AnyCard }) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  return (
    <div className="w-full h-full relative overflow-hidden">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={card.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#14142b] via-[#1e1e3a] to-[#2a2a4e]">
          <span className="text-5xl text-[#4b4b7a] font-display font-bold">✦</span>
        </div>
      )}
      {/* Card name overlay */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <p className="text-sm font-display font-bold text-gray-100 truncate">{card.name}</p>
        <p className="text-[10px] text-gray-400">
          {card.type}
          {card.facciones?.[0] ? ` · ${card.facciones[0]}` : ''}
        </p>
      </div>
    </div>
  )
}

/** Center column: Catalog card with miniature physical card + controls */
function CatalogCard({
  card,
  copias,
  limite,
  tipoLleno,
  onAgregar,
  onQuitar,
  onSelect,
}: {
  card: AnyCard
  copias: number
  limite: number
  tipoLleno: boolean
  onAgregar: () => void
  onQuitar: () => void
  onSelect: () => void
}) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  const SCALE = 0.12 // ~89px wide miniature
  return (
    <div
      className="flex flex-col items-center rounded-lg bg-surface-2 border border-card-border p-1.5
                 hover:border-ether-500/50 transition-colors group cursor-pointer"
      onClick={onSelect}
    >
      {/* Mini physical card */}
      <div
        className="rounded overflow-hidden mb-1"
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
          <RenderCarta card={card} imageUrl={imageUrl} />
        </div>
      </div>

      {/* Name */}
      <p className="text-[9px] text-gray-300 text-center leading-tight truncate w-full px-0.5">{card.name}</p>

      {/* Controls */}
      <div className="flex items-center gap-1 mt-1">
        <button
          aria-label={`Quitar copia de ${card.name}`}
          onClick={onQuitar}
          disabled={copias === 0}
          className="w-5 h-5 rounded bg-surface hover:bg-card-border text-gray-300 disabled:opacity-30
                     transition-colors cursor-pointer disabled:cursor-default text-[10px] leading-none"
        >
          −
        </button>
        <span className="w-4 text-center text-[10px] font-mono text-gray-300">{copias}</span>
        <button
          aria-label={`Agregar copia de ${card.name}`}
          onClick={onAgregar}
          disabled={copias >= limite || tipoLleno}
          className="w-5 h-5 rounded bg-ether-600/30 hover:bg-ether-600/50 text-ether-200 disabled:opacity-30
                     transition-colors cursor-pointer disabled:cursor-default text-[10px] leading-none"
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Right column top: Large physical card (RenderCarta scaled to fit) */
function LargeCardPhysical({ card }: { card: AnyCard }) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  const scale = 0.42 // ~312px wide — fills the fixed-height container
  return (
    <div
      style={{
        width: 744 * scale,
        height: 1038 * scale,
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          width: 744,
          height: 1038,
        }}
      >
        <RenderCarta card={card} imageUrl={imageUrl} />
      </div>
    </div>
  )
}

/** Right column bottom: Full card detail (stats, effects, keywords) */
function CardDetail({ card }: { card: AnyCard }) {
  const coste = card.stats.cost > 0 ? card.stats.cost : null
  const combate =
    card.type === 'Campeón' && 'poder' in card.stats
      ? { atq: card.stats.poder, res: card.stats.resistencia }
      : null
  const efectos = efectosDe(card)
  const color = (card.facciones?.[0] && FACCION_COLORS[card.facciones[0]]) || '#9ca3af'

  return (
    <div className="space-y-2">
      {/* Name & type */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <p className="text-sm font-display font-bold text-gray-100 truncate">{card.name}</p>
      </div>
      <p className="text-[10px] text-gray-500">
        {card.type} · {card.rarity}
        {card.facciones?.[0] ? ` · ${card.facciones[0]}` : ''}
        {coste !== null ? ` · Coste ${coste}` : ''}
        {combate ? ` · ATQ ${combate.atq} RES ${combate.res}` : ''}
      </p>

      {/* Keywords */}
      {card.keywords && card.keywords.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {card.keywords.map((kw) => (
            <span
              key={kw}
              className="text-[9px] px-1.5 py-0.5 rounded bg-[#4a3722] border border-[#8c6d47] text-[#fef3c7] font-display font-bold"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Effects */}
      {efectos.length > 0 && (
        <div className="space-y-1">
          {efectos.map((e) => (
            <div key={e.etiqueta} className="text-[10px] leading-snug">
              <span className="text-gray-500 font-bold">{e.etiqueta}:</span>{' '}
              <span className="text-gray-300">
                {highlightKeywords(e.texto)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Subtypes for champions */}
      {card.type === 'Campeón' && (
        <div className="text-[10px] text-gray-500 space-y-0.5">
          {'esencia' in card && card.esencia && <p>Esencia: {card.esencia}</p>}
          {'roles' in card && card.roles && <p>Rol: {card.roles.join(' / ')}</p>}
        </div>
      )}

      {/* Card ID */}
      <p className="text-[9px] text-gray-600 font-mono">{card.id.slice(0, 8).toUpperCase()}</p>
    </div>
  )
}
