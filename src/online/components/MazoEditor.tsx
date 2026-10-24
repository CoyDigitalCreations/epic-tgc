import { memo, useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useCardStore } from '../../forge/store/useCardStore'
import { useCardImage } from '../../forge/hooks/useCardImage'
import { RenderCarta } from '../../forge/components/CardPreview'
import { Boton } from '../../shared/ui/Boton'
import { Seccion } from '../../shared/ui/Seccion'
import { ArteCompletoModal } from './ArteCompletoModal'
import { buildDeck, cartasDisponibles, conteosDe } from '../mazos'
import type { MazoPersonalizado } from '../useMazosStore'
import { condicionArcanaTexto } from '../../forge/components/fields/CondicionArcanaField'
import type { CondicionEfecto } from '../../shared/types/cards'
import { CARD_TYPES, FACCION_COLORS, FACCIONES, KEYWORDS, type AnyCard, type CardType, type Faccion } from '../../shared/types'

const MAX_ETER = 15
const MAX_PRINCIPAL = 45
const MAX_VINCULOS = 6
const TOTAL_MAZO = MAX_ETER + MAX_PRINCIPAL + MAX_VINCULOS // 66

/** Colores de las tres barras del mazo (los mismos que usa el menú de partida). */
const COLOR_ETER = '#22d3ee'
const COLOR_PRINCIPAL = '#7070ff'
const COLOR_VINCULOS = '#ec4899'

/** Orden y color con que se agrupa la lista del mazo. */
const GRUPOS_MAZO: { tipo: CardType; plural: string; color: string }[] = [
  { tipo: 'Éter', plural: 'Éter', color: '#fbbf24' },
  { tipo: 'Campeón', plural: 'Campeones', color: '#ef4444' },
  { tipo: 'Mística', plural: 'Místicas', color: '#a855f7' },
  { tipo: 'Arcana', plural: 'Arcanas', color: '#f59e0b' },
  { tipo: 'Vínculo', plural: 'Vínculos', color: '#ec4899' },
]

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

  return []
}

/** Wrap keywords in bold tags within a text string */
function highlightKeywords(text: string): ReactNode[] {
  const keywords = KEYWORDS.map(k => k).join('|')
  const regex = new RegExp(`\\b(${keywords})\\b`, 'g')
  const parts = text.split(regex)
  return parts.map((part, i) => {
    if (KEYWORDS.includes(part as (typeof KEYWORDS)[number])) {
      return <strong key={i} className="text-amber-400">{part}</strong>
    }
    return part
  })
}

/** Cuál de los tres cupos (Éter / Principal / Vínculos) consume una carta. */
function cupoDe(card: AnyCard): 'eter' | 'vinculos' | 'principal' {
  return card.type === 'Éter' ? 'eter' : card.type === 'Vínculo' ? 'vinculos' : 'principal'
}

const TOPE_CUPO = { eter: MAX_ETER, vinculos: MAX_VINCULOS, principal: MAX_PRINCIPAL } as const

/**
 * Editor interactivo de mazo personalizado (3 columnas):
 * - Izquierda: inspector de la carta (carta física + detalle). Cambia SOLO con un clic en una carta
 *   (no con el hover: pasar el mouse por el catálogo no debe mover lo que se está mirando).
 * - Centro: filtros y catálogo de cartas.
 * - Derecha: el mazo — barras de progreso por cupo, lista agrupada por tipo y qué falta para guardar.
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
  const [cartaActiva, setCartaActiva] = useState<AnyCard | null>(null)
  /** Carta cuyo arte completo se está mirando en el visor (null = cerrado). */
  const [arteAbierto, setArteAbierto] = useState<AnyCard | null>(null)
  const cerrarArte = useCallback(() => setArteAbierto(null), [])

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

  // Estables mientras no cambie la selección del mazo: así las ~70 cartas del catálogo, que son
  // pesadas de pintar, no se vuelven a renderizar cuando solo cambia la carta inspeccionada.
  const agregar = useCallback(
    (card: AnyCard) => {
      const actual = seleccion.get(card.id) ?? 0
      if (actual >= copiasDe(card) || conteos[cupoDe(card)] >= TOPE_CUPO[cupoDe(card)]) return
      setSeleccion(new Map(seleccion).set(card.id, actual + 1))
    },
    [seleccion, conteos],
  )

  const quitar = useCallback(
    (card: AnyCard) => {
      const actual = seleccion.get(card.id) ?? 0
      if (actual <= 0) return
      const nuevo = new Map(seleccion)
      if (actual === 1) nuevo.delete(card.id)
      else nuevo.set(card.id, actual - 1)
      setSeleccion(nuevo)
    },
    [seleccion],
  )

  const valido =
    nombre.trim() !== '' &&
    total === TOTAL_MAZO &&
    conteos.eter === MAX_ETER &&
    conteos.principal === MAX_PRINCIPAL &&
    conteos.vinculos === MAX_VINCULOS

  /** Qué falta para poder guardar (vacío si el mazo ya es válido). */
  const faltantes: string[] = []
  if (nombre.trim() === '') faltantes.push('un nombre')
  if (conteos.eter < MAX_ETER) faltantes.push(`${MAX_ETER - conteos.eter} de Éter`)
  if (conteos.principal < MAX_PRINCIPAL) faltantes.push(`${MAX_PRINCIPAL - conteos.principal} de Principal`)
  if (conteos.vinculos < MAX_VINCULOS) faltantes.push(`${MAX_VINCULOS - conteos.vinculos} Vínculos`)

  // Cartas del mazo con su cantidad (orden de inserción)
  const deckCards = useMemo(() => {
    const result: { card: AnyCard; count: number }[] = []
    for (const [cardId, count] of seleccion) {
      const card = cartas.find((c) => c.id === cardId)
      if (card) result.push({ card, count })
    }
    return result
  }, [seleccion, cartas])

  // La lista del mazo agrupada por tipo, cada grupo ordenado por coste y nombre
  const grupos = useMemo(
    () =>
      GRUPOS_MAZO.map((g) => ({
        ...g,
        filas: deckCards
          .filter(({ card }) => card.type === g.tipo)
          .sort((a, b) => a.card.stats.cost - b.card.stats.cost || a.card.name.localeCompare(b.card.name)),
      })).filter((g) => g.filas.length > 0),
    [deckCards],
  )

  // La carta que se inspecciona: la última vista; por defecto la primera del mazo o del catálogo
  const activeCard = cartaActiva ?? deckCards[0]?.card ?? filtradas[0] ?? null

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a12] font-body text-gray-100 lg:h-screen lg:overflow-clip">
      {/* ── Barra superior ─────────────────────────────────────── */}
      <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-card-border/70 bg-surface/90 px-4 py-2.5">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold tracking-wider text-gray-100">
            {inicial ? 'Editar mazo personalizado' : 'Nuevo mazo personalizado'}
          </h1>
          <p className="text-xs text-gray-500">15 Éter + 45 Principal + 6 Vínculos = 66 cartas</p>
        </div>

        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre del mazo"
          className="w-64 rounded-lg border border-white/10 bg-[#0a0a12] px-3 py-2 text-sm text-gray-100 transition-colors focus:border-ether-400 focus:outline-none"
        />

        <div className="ml-auto flex flex-wrap items-center gap-3">
          <p className={`text-xs ${valido ? 'font-semibold text-emerald-300' : 'text-gray-400'}`}>
            {valido ? '✓ Mazo listo para guardar' : `Falta: ${faltantes.join(' · ')}`}
          </p>
          <Boton onClick={onCancelar}>Volver</Boton>
          <Boton
            variante="primario"
            onClick={() => onGuardar({ nombre: nombre.trim(), cardIds: buildDeck(seleccion) })}
            disabled={!valido}
          >
            Guardar mazo
          </Boton>
        </div>
      </header>

      {/* ── 3 columnas ─────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
        {/* Izquierda: inspector */}
        <section aria-label="Inspector de carta" className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#161626] to-[#0f0f1a] p-3">
          {activeCard ? (
            <>
              <CartaFisica card={activeCard} onVerArte={setArteAbierto} />
              <CardDetail card={activeCard} />
            </>
          ) : (
            <div className="m-auto text-center text-gray-500">
              <div className="mb-2 text-4xl">✦</div>
              <p className="text-sm">Haz clic en una carta para verla</p>
            </div>
          )}
        </section>

        {/* Centro: catálogo */}
        <section aria-label="Catálogo de cartas" className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as '' | CardType)}
              className="rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-xs text-gray-100 transition-colors focus:border-ether-400 focus:outline-none"
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
              className="rounded-lg border border-white/10 bg-surface-2 px-2.5 py-2 text-xs text-gray-100 transition-colors focus:border-ether-400 focus:outline-none"
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
              className="min-w-[140px] flex-1 rounded-lg border border-white/10 bg-surface-2 px-3 py-2 text-xs text-gray-100 transition-colors focus:border-ether-400 focus:outline-none"
            />
            <span className="self-center font-mono text-[11px] text-gray-500">{filtradas.length} cartas</span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-white/10 bg-gradient-to-b from-[#161626] to-[#0f0f1a] p-3">
            {filtradas.length === 0 ? (
              <p className="py-10 text-center text-sm text-gray-500">Ninguna carta coincide con los filtros.</p>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(128px,1fr))] gap-2.5">
                {filtradas.map((c) => (
                  <CartaCatalogo
                    key={c.id}
                    card={c}
                    copias={seleccion.get(c.id) ?? 0}
                    limite={copiasDe(c)}
                    cupoLleno={conteos[cupoDe(c)] >= TOPE_CUPO[cupoDe(c)]}
                    activa={activeCard?.id === c.id}
                    onAgregar={agregar}
                    onQuitar={quitar}
                    onSelect={setCartaActiva}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Derecha: el mazo */}
        <section aria-label="Tu mazo" className="flex min-h-0 flex-col rounded-2xl border border-white/10 bg-gradient-to-b from-[#161626] to-[#0f0f1a]">
          <div className="space-y-3 border-b border-white/5 p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-lg font-bold tracking-wide text-gray-50">Tu mazo</h2>
              <p className={`font-display text-2xl font-bold ${total === TOTAL_MAZO ? 'text-emerald-300' : 'text-gray-100'}`}>
                {total}
                <span className="text-base text-gray-500">/{TOTAL_MAZO}</span>
              </p>
            </div>
            <Medidor etiqueta="Éter" actual={conteos.eter} max={MAX_ETER} color={COLOR_ETER} />
            <Medidor etiqueta="Principal" actual={conteos.principal} max={MAX_PRINCIPAL} color={COLOR_PRINCIPAL} />
            <Medidor etiqueta="Vínculos" actual={conteos.vinculos} max={MAX_VINCULOS} color={COLOR_VINCULOS} />
            {/* Resumen en una línea para lectores de pantalla: la vista usa las barras y el total grande */}
            <p data-testid="contadores" className="sr-only">
              Éter {conteos.eter}/{MAX_ETER} · Principal {conteos.principal}/{MAX_PRINCIPAL} · Vínculos {conteos.vinculos}/{MAX_VINCULOS} · Total {total}/{TOTAL_MAZO}
            </p>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {grupos.length === 0 ? (
              <p className="px-1 py-6 text-center text-xs text-gray-600">
                Todavía no hay cartas.
                <br />
                Sumalas con el <span className="font-mono text-ether-300">+</span> del catálogo.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {grupos.map((g) => (
                  <div key={g.tipo}>
                    <h3 className="mb-1.5 flex items-center gap-2 px-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: g.color }}>
                      {g.plural}
                      <span className="rounded-full bg-white/10 px-1.5 py-px font-mono text-[10px] tracking-normal text-gray-300">
                        {g.filas.reduce((n, f) => n + f.count, 0)}
                      </span>
                    </h3>
                    <div className="flex flex-col gap-1">
                      {g.filas.map(({ card, count }) => (
                        <FilaMazo
                          key={card.id}
                          card={card}
                          count={count}
                          limite={copiasDe(card)}
                          cupoLleno={conteos[cupoDe(card)] >= TOPE_CUPO[cupoDe(card)]}
                          onSelect={setCartaActiva}
                          onAgregar={agregar}
                          onQuitar={quitar}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Visor del arte completo (clic en la carta del inspector) */}
      {arteAbierto && <ArteCompletoModal card={arteAbierto} onClose={cerrarArte} />}
    </div>
  )
}

/* ════════════ SUB-COMPONENTS ════════════ */

/** Barra de progreso de un cupo del mazo (Éter / Principal / Vínculos). */
function Medidor({ etiqueta, actual, max, color }: { etiqueta: string; actual: number; max: number; color: string }) {
  const completo = actual === max
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="font-medium text-gray-300">{etiqueta}</span>
        <span className={`font-mono ${completo ? 'text-emerald-300' : 'text-gray-400'}`}>
          {completo ? '✓ ' : ''}
          {actual}/{max}
        </span>
      </div>
      <div aria-hidden="true" className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${Math.min(100, (actual / max) * 100)}%`, background: completo ? '#34d399' : color }}
        />
      </div>
    </div>
  )
}

/** Fila de una carta en la lista del mazo: miniatura, nombre, cantidad y +/− rápidos. */
function FilaMazo({
  card,
  count,
  limite,
  cupoLleno,
  onSelect,
  onAgregar,
  onQuitar,
}: {
  card: AnyCard
  count: number
  limite: number
  cupoLleno: boolean
  onSelect: (card: AnyCard) => void
  onAgregar: (card: AnyCard) => void
  onQuitar: (card: AnyCard) => void
}) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  return (
    <div
      className="group/fila flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] py-1 pl-1.5 pr-1 transition-colors hover:border-ether-500/40 hover:bg-white/[0.06]"
      onClick={() => onSelect(card)}
    >
      <div
        className="shrink-0 overflow-hidden rounded-sm"
        style={{
          width: 26,
          aspectRatio: '744/1038',
          background: 'linear-gradient(135deg, #14142b 0%, #1e1e3a 60%, #2a2a4e 100%)',
        }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <span className="flex h-full items-center justify-center font-display text-[8px] font-bold text-[#4b4b7a]">✦</span>
        )}
      </div>
      <span className="min-w-0 flex-1 truncate text-xs text-gray-200">{card.name}</span>
      <span className="font-mono text-[11px] text-ether-300">×{count}</span>
      <div className="flex gap-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label={`Sacar ${card.name} del mazo`}
          onClick={() => onQuitar(card)}
          className="grid size-6 cursor-pointer place-items-center rounded-md text-sm text-gray-400 transition-colors hover:bg-white/10 hover:text-gray-100"
        >
          −
        </button>
        <button
          type="button"
          aria-label={`Sumar ${card.name} al mazo`}
          onClick={() => onAgregar(card)}
          disabled={count >= limite || cupoLleno}
          className="grid size-6 cursor-pointer place-items-center rounded-md text-sm text-ether-200 transition-colors hover:bg-ether-500/20 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
        >
          +
        </button>
      </div>
    </div>
  )
}

/** Centro: carta del catálogo con la carta física y sus controles. Memoizada: es pesada de pintar. */
const CartaCatalogo = memo(function CartaCatalogo({
  card,
  copias,
  limite,
  cupoLleno,
  activa,
  onAgregar,
  onQuitar,
  onSelect,
}: {
  card: AnyCard
  copias: number
  limite: number
  cupoLleno: boolean
  activa: boolean
  onAgregar: (card: AnyCard) => void
  onQuitar: (card: AnyCard) => void
  onSelect: (card: AnyCard) => void
}) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  const ANCHO = 112
  const SCALE = ANCHO / 744
  return (
    <div
      className={`group relative flex cursor-pointer flex-col items-center rounded-xl border p-2 transition-all duration-150 ${
        activa
          ? 'border-ether-300/70 bg-ether-500/10'
          : copias > 0
            ? 'border-ether-500/40 bg-ether-500/[0.06] hover:border-ether-400/70'
            : 'border-white/10 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.05]'
      }`}
      onClick={() => onSelect(card)}
    >
      {copias > 0 && (
        <span className="absolute right-1.5 top-1.5 z-10 rounded-full bg-ether-500 px-1.5 py-px font-mono text-[10px] font-bold text-white shadow-[0_0_10px_rgba(112,112,255,0.6)]">
          ×{copias}
        </span>
      )}

      {/* Carta física en miniatura */}
      <div className="mb-1.5 overflow-hidden rounded-md shadow-[0_6px_16px_-6px_rgba(0,0,0,0.8)]" style={{ width: 744 * SCALE, height: 1038 * SCALE }}>
        <div style={{ transform: `scale(${SCALE})`, transformOrigin: 'top left', width: 744, height: 1038 }}>
          <RenderCarta card={card} imageUrl={imageUrl} />
        </div>
      </div>

      <p className="line-clamp-2 min-h-[2.2em] w-full px-0.5 text-center text-[10px] leading-tight text-gray-300">{card.name}</p>

      {/* Controles */}
      <div className="mt-1.5 flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          aria-label={`Quitar copia de ${card.name}`}
          onClick={() => onQuitar(card)}
          disabled={copias === 0}
          className="grid size-7 cursor-pointer place-items-center rounded-lg border border-white/10 bg-white/5 text-sm leading-none text-gray-200 transition-colors hover:bg-white/10 disabled:cursor-default disabled:opacity-30"
        >
          −
        </button>
        <span className="w-9 text-center font-mono text-[11px] text-gray-400">
          {copias}/{limite}
        </span>
        <button
          type="button"
          aria-label={`Agregar copia de ${card.name}`}
          onClick={() => onAgregar(card)}
          disabled={copias >= limite || cupoLleno}
          className="grid size-7 cursor-pointer place-items-center rounded-lg border border-ether-400/40 bg-ether-500/25 text-sm leading-none text-ether-100 transition-colors hover:bg-ether-500/45 disabled:cursor-default disabled:border-white/10 disabled:bg-white/5 disabled:text-gray-500 disabled:opacity-40"
        >
          +
        </button>
      </div>
    </div>
  )
})

/**
 * Inspector: la carta física a tamaño grande, con su resplandor. Si la carta tiene arte, es un
 * botón: el clic abre el visor del arte completo. Sin arte (custom sin imagen) no es clickeable.
 */
function CartaFisica({ card, onVerArte }: { card: AnyCard; onVerArte: (card: AnyCard) => void }) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  const ancho = 274
  const scale = ancho / 744
  const carta = (
    <div className="overflow-hidden rounded-xl shadow-[0_0_50px_rgba(112,112,255,0.2)]" style={{ width: ancho, height: 1038 * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: 744, height: 1038 }}>
        <RenderCarta card={card} imageUrl={imageUrl} />
      </div>
    </div>
  )

  if (!imageUrl) return <div className="mx-auto shrink-0">{carta}</div>

  return (
    <button
      type="button"
      aria-label={`Ver arte completo de ${card.name}`}
      onClick={() => onVerArte(card)}
      className="group/arte relative mx-auto block shrink-0 cursor-zoom-in rounded-xl outline-offset-2 focus-visible:outline-2 focus-visible:outline-ether-300"
    >
      {carta}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 top-2 grid size-7 place-items-center rounded-lg border border-white/15 bg-black/60 text-gray-200 backdrop-blur"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <circle cx="11" cy="11" r="7" />
          <line x1="16.5" y1="16.5" x2="21" y2="21" />
        </svg>
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-xl bg-gradient-to-t from-black/85 to-transparent px-3 pb-2.5 pt-8 text-center text-[11px] font-semibold tracking-wide text-gray-100 opacity-0 transition-opacity duration-150 group-hover/arte:opacity-100 group-focus-visible/arte:opacity-100"
      >
        Ver arte completo
      </span>
    </button>
  )
}

/** Inspector: detalle completo de la carta (retrato, stats, efectos, keywords). */
function CardDetail({ card }: { card: AnyCard }) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  const coste = card.stats.cost > 0 ? card.stats.cost : null
  const combate =
    card.type === 'Campeón' && 'poder' in card.stats
      ? { atq: card.stats.poder, res: card.stats.resistencia }
      : null
  const efectos = efectosDe(card)
  const color = (card.facciones?.[0] && FACCION_COLORS[card.facciones[0]]) || '#9ca3af'

  return (
    <div className="space-y-2">
      {/* Retrato + nombre */}
      <div className="flex items-center gap-2.5">
        <div
          className="shrink-0 overflow-hidden rounded-md border"
          style={{
            width: 36,
            aspectRatio: '744/1038',
            borderColor: `${color}80`,
            background: 'linear-gradient(135deg, #14142b 0%, #1e1e3a 60%, #2a2a4e 100%)',
          }}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={card.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span className="flex h-full items-center justify-center font-display text-xs font-bold text-[#4b4b7a]">✦</span>
          )}
        </div>
        <div className="min-w-0">
          <p className="font-display text-sm font-bold leading-tight text-gray-100">{card.name}</p>
          <p className="mt-0.5 text-[10px] text-gray-500">
            {card.type} · {card.rarity}
            {card.facciones?.[0] ? ` · ${card.facciones[0]}` : ''}
            {coste !== null ? ` · Coste ${coste}` : ''}
            {combate ? ` · ATQ ${combate.atq} RES ${combate.res}` : ''}
          </p>
        </div>
      </div>

      {/* Keywords */}
      {card.keywords && card.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {card.keywords.map((kw) => (
            <span
              key={kw}
              className="rounded border border-[#8c6d47] bg-[#4a3722] px-1.5 py-0.5 font-display text-[9px] font-bold text-[#fef3c7]"
            >
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Efectos */}
      {efectos.length > 0 && (
        <div className="space-y-1.5">
          {efectos.map((e) => (
            <div key={e.etiqueta} className="border-l-2 border-ether-500/50 pl-2 text-[11px] leading-snug">
              <span className="font-bold text-gray-500">{e.etiqueta}:</span>{' '}
              <span className="text-gray-300">{highlightKeywords(e.texto)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Subtipos de los Campeones */}
      {card.type === 'Campeón' && (
        <div className="space-y-0.5 text-[10px] text-gray-500">
          {'esencia' in card && card.esencia && <p>Esencia: {card.esencia}</p>}
          {'roles' in card && card.roles && <p>Rol: {card.roles.join(' / ')}</p>}
        </div>
      )}

      <Seccion>{card.id.slice(0, 8).toUpperCase()}</Seccion>
    </div>
  )
}
