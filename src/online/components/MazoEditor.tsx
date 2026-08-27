import { useMemo, useState } from 'react'
import { useCardStore } from '../../forge/store/useCardStore'
import { useCardImage } from '../../forge/hooks/useCardImage'
import { buildDeck, cartasDisponibles, conteosDe } from '../mazos'
import type { MazoPersonalizado } from '../useMazosStore'
import { CARD_TYPES, FACCION_COLORS, FACCIONES, type AnyCard, type CardType, type Faccion } from '../../shared/types'

const MAX_ETER = 15
const MAX_PRINCIPAL = 45
const MAX_VINCULOS = 6
const TOTAL_MAZO = MAX_ETER + MAX_PRINCIPAL + MAX_VINCULOS // 66

interface MazoEditorProps {
  /** Mazo a editar (si viene, precarga nombre y selección reconstruida). */
  inicial?: MazoPersonalizado
  onGuardar: (mazo: { nombre: string; cardIds: string[] }) => void
  onCancelar: () => void
}

function copiasDe(card: AnyCard): number {
  return Number(card.limiteCopias ?? 1)
}

/** Reconstruye el mapa cardId→copias agrupando los cardIds guardados. */
function seleccionDesdeCardIds(cardIds: string[]): Map<string, number> {
  const seleccion = new Map<string, number>()
  for (const id of cardIds) {
    seleccion.set(id, (seleccion.get(id) ?? 0) + 1)
  }
  return seleccion
}

/**
 * Efectos de una carta para el listado, con su etiqueta según el tipo
 * (mismo criterio de nombres que CardPreview).
 */
function efectosDe(card: AnyCard): { etiqueta: string; texto: string }[] {
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
    case 'Arcana': {
      const l: { etiqueta: string; texto: string }[] = []
      if (card.condicion) l.push({ etiqueta: 'Condición', texto: card.condicion })
      if (card.recompensa) l.push({ etiqueta: 'Recompensa', texto: card.recompensa })
      return l
    }
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

/**
 * Fila de carta del catálogo. Componente separado porque useCardImage es un
 * hook: cada fila resuelve su arte (custom → IndexedDB; diseño → /cartas/*.png).
 */
function FilaCarta({
  card,
  copias,
  limite,
  tipoLleno,
  onAgregar,
  onQuitar,
}: {
  card: AnyCard
  copias: number
  limite: number
  tipoLleno: boolean
  onAgregar: () => void
  onQuitar: () => void
}) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  const color = (card.facciones?.[0] && FACCION_COLORS[card.facciones[0]]) || '#9ca3af'
  const coste = card.stats.cost > 0 ? card.stats.cost : null
  const combate =
    card.type === 'Campeón' && 'poder' in card.stats
      ? { atq: card.stats.poder, res: card.stats.resistencia }
      : null
  const efectos = efectosDe(card)
  return (
    <div className="flex items-start gap-2 bg-surface-2 border border-card-border rounded-lg px-3 py-2">
      {/* Miniatura con el arte real (custom → IndexedDB, diseño → public/cartas) */}
      <div
        className="shrink-0 rounded border border-card-border overflow-hidden flex items-center justify-center"
        style={{
          width: 38,
          aspectRatio: '744/1038',
          background: 'linear-gradient(135deg, #14142b 0%, #1e1e3a 60%, #2a2a4e 100%)',
        }}
        aria-hidden={imageUrl ? undefined : 'true'}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <span style={{ color: '#4b4b7a', fontFamily: '"Cinzel", serif', fontSize: 12, fontWeight: 700 }}>
            ✦
          </span>
        )}
      </div>
      <span
        className="w-2 h-2 rounded-full shrink-0 mt-1"
        style={{ backgroundColor: color }}
        title={card.facciones?.[0] ?? 'Sin facción'}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-100 truncate">{card.name}</p>
        <p className="text-[10px] text-gray-500">
          {card.type}
          {card.facciones?.[0] ? ` · ${card.facciones[0]}` : ''} · máx {limite}
          {coste !== null ? ` · Coste ${coste}` : ''}
          {combate ? ` · ATQ ${combate.atq} RES ${combate.res}` : ''}
        </p>
        {efectos.map((e) => (
          <p
            key={e.etiqueta}
            title={e.texto}
            className="text-[10px] text-gray-400 leading-snug mt-0.5 line-clamp-2"
          >
            <span className="text-gray-500">{e.etiqueta}:</span> {e.texto}
          </p>
        ))}
      </div>
      <button
        aria-label={`Quitar copia de ${card.name}`}
        onClick={onQuitar}
        disabled={copias === 0}
        className="w-7 h-7 rounded bg-surface hover:bg-card-border text-gray-300 disabled:opacity-30
                   transition-colors cursor-pointer disabled:cursor-default shrink-0"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-mono text-gray-300 shrink-0">{copias}</span>
      <button
        aria-label={`Agregar copia de ${card.name}`}
        onClick={onAgregar}
        disabled={copias >= limite || tipoLleno}
        className="w-7 h-7 rounded bg-ether-600/30 hover:bg-ether-600/50 text-ether-200 disabled:opacity-30
                   transition-colors cursor-pointer disabled:cursor-default shrink-0"
      >
        +
      </button>
    </div>
  )
}

/**
 * Editor interactivo de mazo personalizado: catálogo completo (diseños +
 * custom de la forja), filtros, controles +/− con topes (limiteCopias por
 * carta y 15/45/6 por tipo) y contadores en vivo. No deja guardar un mazo
 * que no cumpla la distribución exacta del juego.
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

  return (
    <div className="min-h-screen bg-[#0d0d14] text-gray-100 font-body">
      <header className="border-b border-card-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-gray-100 tracking-wider">
              {inicial ? 'Editar mazo personalizado' : 'Nuevo mazo personalizado'}
            </h1>
            <p className="text-xs text-gray-500 font-body">
              Armá tu mazo: 15 Éter + 45 Principal + 6 Vínculos = 66 cartas.
            </p>
          </div>
          <button
            onClick={onCancelar}
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded transition-colors cursor-pointer"
          >
            Volver al menú
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-6">
        {/* Nombre + filtros */}
        <div className="flex items-center gap-4 mb-4 flex-wrap max-w-4xl">
          <label className="text-sm text-gray-400">
            Nombre del mazo
            <input
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Los Mutantes"
              className="ml-2 bg-surface-2 border border-card-border rounded-lg px-3 py-2 text-sm text-gray-100 w-48
                         focus:outline-none focus:border-ether-400 transition-colors"
            />
          </label>
          <label className="text-sm text-gray-400">
            Tipo
            <select
              aria-label="Tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as '' | CardType)}
              className="ml-2 bg-surface-2 border border-card-border rounded-lg px-3 py-2 text-sm text-gray-100
                         focus:outline-none focus:border-ether-400 transition-colors"
            >
              <option value="">Todos</option>
              {CARD_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="text-sm text-gray-400">
            Facción
            <select
              aria-label="Facción"
              value={faccion}
              onChange={(e) => setFaccion(e.target.value as '' | Faccion)}
              className="ml-2 bg-surface-2 border border-card-border rounded-lg px-3 py-2 text-sm text-gray-100
                         focus:outline-none focus:border-ether-400 transition-colors"
            >
              <option value="">Todas</option>
              {FACCIONES.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </label>
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Buscar carta..."
            className="bg-surface-2 border border-card-border rounded-lg px-3 py-2 text-sm text-gray-100 w-48
                       focus:outline-none focus:border-ether-400 transition-colors"
          />
        </div>

        {/* Contadores en vivo */}
        <div
          data-testid="contadores"
          className={`mb-4 inline-block px-4 py-2 rounded-lg text-sm font-mono border
            ${valido ? 'bg-emerald-600/20 text-emerald-300 border-emerald-600/40' : 'bg-surface-2 text-gray-300 border-card-border'}`}
        >
          Éter {conteos.eter}/{MAX_ETER} · Principal {conteos.principal}/{MAX_PRINCIPAL} · Vínculos {conteos.vinculos}/{MAX_VINCULOS} · Total {total}/{TOTAL_MAZO}
        </div>

        {/* Lista de cartas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-4xl mb-6">
          {filtradas.map((c) => {
            const copias = seleccion.get(c.id) ?? 0
            const limite = copiasDe(c)
            const topeTipo = limiteTipo(c)
            const tipoLleno =
              (c.type === 'Éter' ? conteos.eter : c.type === 'Vínculo' ? conteos.vinculos : conteos.principal) >= topeTipo
            return (
              <FilaCarta
                key={c.id}
                card={c}
                copias={copias}
                limite={limite}
                tipoLleno={tipoLleno}
                onAgregar={() => agregar(c)}
                onQuitar={() => quitar(c)}
              />
            )
          })}
        </div>

        <button
          onClick={() => onGuardar({ nombre: nombre.trim(), cardIds: buildDeck(seleccion) })}
          disabled={!valido}
          className="bg-ether-600 hover:bg-ether-500 text-white px-8 py-3 rounded-lg font-display tracking-wider
                     transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Guardar mazo
        </button>
      </main>
    </div>
  )
}
