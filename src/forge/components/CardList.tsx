import { useState, useMemo, useRef } from 'react'
import { useCardStore } from '../store/useCardStore'
import { exportCollectionToJson, importCollectionFromJson } from '../utils/export-json'
import { exportPaqueteToJson, importPaqueteFromJson } from '../utils/export-paquete'
import { CARD_TYPES, type CardType } from '../../shared/types'
import { PAQUETES, ESTASIS_CARDS, DISONANCIA_CARDS, progresoPaquete } from '../../shared/data/paquetes'
import { RuneIcon } from './card-art'
import { ConfirmModal } from './modals/ConfirmModal'
import { ColeccionModal } from './modals/ColeccionModal'
import { PaqueteModal } from './modals/PaqueteModal'
import { useCardImage } from '../hooks/useCardImage'
import type { AnyCard } from '../../shared/types'

/** Cartas disponibles por paquete (clave = paquete.id) — el import los agrega a la colección */
const CARTAS_POR_PAQUETE: Record<string, AnyCard[]> = {
  estasis: ESTASIS_CARDS,
  disonancia: DISONANCIA_CARDS,
}

interface CardGridItemProps {
  card: AnyCard
  selected: boolean
  onSelect: () => void
  onEdit: () => void
  onDelete: () => void
}

/** Single grid tile. Hooks are required here (can't be inside a .map). */
function CardGridItem({ card, selected, onSelect, onEdit, onDelete }: CardGridItemProps) {
  const imageUrl = useCardImage(card.id, card.hasImage, card.imageUrl)
  return (
    <div
      onClick={onSelect}
      className={`bg-surface-2 border rounded-lg p-3 cursor-pointer transition-all
        ${selected
          ? 'border-ether-400 ring-1 ring-ether-400'
          : 'border-card-border hover:border-gray-500'
        }`}
    >
      {/* Mini preview */}
      <div
        style={{
          aspectRatio: '744/1038',
          borderRadius: 6,
          background: imageUrl
            ? `url(${imageUrl}) center top / cover no-repeat`
            : 'linear-gradient(135deg, #16162a, #1e1e36)',
          border: '1px solid #3b3b5c',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Mini name bar */}
        <div
          style={{
            padding: '4px 6px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: imageUrl ? 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)' : 'none',
          }}
        >
          <span
            style={{
              fontFamily: '"Cinzel", serif',
              fontSize: 8,
              fontWeight: 700,
              color: '#f0f0f0',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
          >
            {card.name || 'Sin nombre'}
          </span>
          <span
            style={{
              fontSize: 8,
              color: '#93c5fd',
              fontWeight: 700,
            }}
          >
            {card.stats?.cost ?? 0}
          </span>
        </div>
        {/* Mini stats if combat */}
        {(card.type === 'Campeón' || card.type === 'Mística' || card.type === 'Éter') && (
          <div
            style={{
              marginTop: 'auto',
              padding: '2px 6px',
              display: 'flex',
              justifyContent: 'space-between',
              background: imageUrl ? 'linear-gradient(0deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)' : 'rgba(0,0,0,0.4)',
              fontSize: 8,
            }}
          >
            <span style={{ color: '#ef4444', fontWeight: 700 }}>
              {(card.stats as { poder?: number }).poder ?? 0}
            </span>
            <span style={{ color: '#22c55e', fontWeight: 700 }}>
              {(card.stats as { resistencia?: number }).resistencia ?? 0}
            </span>
          </div>
        )}
      </div>
      {/* Card name + actions */}
      <div className="mt-1.5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-gray-200 truncate font-medium flex-1">
            {card.name || 'Sin nombre'}
          </p>
          {card.limiteCopias && (
            <span className="text-[10px] font-mono text-gray-500 bg-surface border border-card-border rounded px-1 py-0.5 leading-none shrink-0">
              ×{card.limiteCopias}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 flex items-center gap-1">
          {card.type}
          {(() => {
            const paquete = PAQUETES.find((p) => p.id === card.paqueteId)
            return paquete ? (
              <span style={{ display: 'inline-flex' }} title={paquete.nombre}>
                <RuneIcon
                  faccion={paquete.facciones[0]}
                  color={paquete.color}
                  size={10}
                />
              </span>
            ) : null
          })()}
        </p>
      </div>
      <div className="flex gap-1 mt-1.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEdit()
          }}
          className="flex-1 text-[10px] bg-ether-600/30 hover:bg-ether-600/50 text-ether-300 py-0.5 
                     rounded transition-colors cursor-pointer"
        >
          Editar
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex-1 text-[10px] bg-red-600/30 hover:bg-red-600/50 text-red-300 py-0.5 
                     rounded transition-colors cursor-pointer"
        >
          Eliminar
        </button>
      </div>
    </div>
  )
}

export function CardList() {
  const cards = useCardStore((s) => s.cards)
  const deleteCard = useCardStore((s) => s.deleteCard)
  const loadCards = useCardStore((s) => s.loadCards)
  const clearCards = useCardStore((s) => s.clearCards)
  const setSelectedCardId = useCardStore((s) => s.setSelectedCardId)
  const selectedCardId = useCardStore((s) => s.selectedCardId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Paquetes personalizados (creados desde el card maker)
  const userPacks = useCardStore((s) => s.userPacks)
  const crearPaquete = useCardStore((s) => s.crearPaquete)
  const eliminarPaquete = useCardStore((s) => s.eliminarPaquete)
  const [showPaqueteModal, setShowPaqueteModal] = useState(false)
  const paqueteFileInputRef = useRef<HTMLInputElement>(null)

  // Colecciones múltiples (A3)
  const colecciones = useCardStore((s) => s.colecciones)
  const coleccionActivaId = useCardStore((s) => s.coleccionActivaId)
  const setColeccionActiva = useCardStore((s) => s.setColeccionActiva)
  const crearColeccion = useCardStore((s) => s.crearColeccion)
  const renombrarColeccion = useCardStore((s) => s.renombrarColeccion)
  const eliminarColeccion = useCardStore((s) => s.eliminarColeccion)
  const [modalModo, setModalModo] = useState<'crear' | 'renombrar' | null>(null)
  const [showEliminarModal, setShowEliminarModal] = useState(false)
  const coleccionActiva = useMemo(
    () => colecciones.find((c) => c.id === coleccionActivaId),
    [colecciones, coleccionActivaId],
  )

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<CardType | 'Todas'>('Todas')
  const [paqueteFilter, setPaqueteFilter] = useState<string | 'Todos'>('Todos')

  // Clear confirmation
  const [showClearModal, setShowClearModal] = useState(false)

  const filteredCards = useMemo(
    () =>
      cards.filter((card) => {
        if (typeFilter !== 'Todas' && card.type !== typeFilter) return false
        if (paqueteFilter !== 'Todos' && card.paqueteId !== paqueteFilter) return false
        if (search) {
          const q = search.toLowerCase()
          const name = (card.name || '').toLowerCase()
          if (!name.includes(q)) return false
        }
        return true
      }),
    [cards, search, typeFilter, paqueteFilter],
  )

  const handleEdit = (card: (typeof cards)[number]) => {
    setSelectedCardId(card.id)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

  const handleImportPaquete = (paqueteId: string) => {
    const cartas = CARTAS_POR_PAQUETE[paqueteId] ?? []
    if (cartas.length === 0) return
    // Asegurar que todas tengan paqueteId (puede haberse perdido en migraciones)
    const cartasConPaquete = cartas.map((c) => ({ ...c, paqueteId }))
    const existentes = new Set(cards.map((c) => c.id))
    const nuevas = cartas.filter((c) => !existentes.has(c.id))
    loadCards(cartasConPaquete)
    if (nuevas.length === 0) {
      alert('El paquete ya está completo en tu colección.')
    } else {
      alert(
        `Paquete importado: ${nuevas.length} cartas nuevas agregadas ` +
        `(ya tenías ${cartas.length - nuevas.length} en la colección).`,
      )
    }
  }

  /** Paquetes visibles: oficiales + personalizados del usuario. */
  const paquetesVisibles = useMemo(
    () => [...PAQUETES, ...userPacks],
    [userPacks],
  )

  /** Copias (limiteCopias sumado) de un paquete en la colección activa. */
  const conteoCartasPaquete = (paqueteId: string) =>
    cards
      .filter((c) => c.paqueteId === paqueteId)
      .reduce((acc, c) => acc + Number(c.limiteCopias ?? 1), 0)

  const handleImportPaqueteJson = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const { paquete, cards: cartas } = await importPaqueteFromJson(file)
      const existente = [...PAQUETES, ...useCardStore.getState().userPacks].find(
        (p) => p.id === paquete.id,
      )
      if (existente) {
        alert(`El paquete "${paquete.nombre}" ya existe en tu colección.`)
      } else {
        crearPaquete({
          nombre: paquete.nombre,
          tipo: paquete.tipo,
          facciones: paquete.facciones,
          lore: paquete.lore || undefined,
          entrega: paquete.entrega,
          id: paquete.id,
        })
        loadCards(cartas)
        alert(
          `Paquete "${paquete.nombre}" importado con ${cartas.length} cartas.`,
        )
      }
    } catch (err) {
      alert('Error al importar paquete: ' + (err as Error).message)
    }
    e.target.value = ''
  }

  // Progreso de colección por paquete (copias / total)
  const progresoPorPaquete = useMemo(() => {
    const map = new Map<string, ReturnType<typeof progresoPaquete>>()
    for (const paquete of PAQUETES) {
      map.set(paquete.id, progresoPaquete(cards, paquete.id))
    }
    return map
  }, [cards])

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const imported = await importCollectionFromJson(file)
      loadCards(imported)
    } catch (err) {
      alert('Error al importar: ' + (err as Error).message)
    }
    e.target.value = ''
  }

  return (
    <div>
      {/* Selector de colección (A3) */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        <label className="text-[10px] uppercase tracking-wider text-gray-500 mr-1">
          Colección:
        </label>
        <select
          value={coleccionActivaId}
          onChange={(e) => setColeccionActiva(e.target.value)}
          title="Colección activa (la ve el juego online)"
          className="bg-surface-2 border border-card-border rounded-lg px-3 py-1.5 text-xs
                     text-gray-100 focus:outline-none focus:border-ether-400
                     transition-colors cursor-pointer"
        >
          {colecciones.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.cards.length})
            </option>
          ))}
        </select>
        <button
          onClick={() => setModalModo('crear')}
          title="Crear colección nueva"
          className="text-xs bg-ether-600/30 hover:bg-ether-600/50 text-ether-300 px-2.5 py-1.5 rounded
                     transition-colors cursor-pointer"
        >
          + Nueva
        </button>
        <button
          onClick={() => setModalModo('renombrar')}
          title="Renombrar colección activa"
          className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-2.5 py-1.5 rounded
                     transition-colors cursor-pointer"
        >
          Renombrar
        </button>
        {colecciones.length > 1 && (
          <button
            onClick={() => setShowEliminarModal(true)}
            title={`Eliminar "${coleccionActiva?.nombre ?? ''}" con todas sus cartas`}
            className="text-xs bg-red-600/30 hover:bg-red-600/50 text-red-300 px-2.5 py-1.5 rounded
                       transition-colors cursor-pointer"
          >
            Eliminar
          </button>
        )}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display text-gray-100">
          Colección
          {filteredCards.length !== cards.length
            ? ` (${filteredCards.length}/${cards.length})`
            : ` (${cards.length})`}
        </h2>
        <div className="flex gap-2">
          {cards.length > 0 && (
            <>
              <button
                onClick={() => {
                  void exportCollectionToJson(cards, coleccionActiva?.nombre).catch((err) => {
                    console.error('Error al exportar JSON:', err)
                  })
                }}
                className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded 
                           transition-colors cursor-pointer"
              >
                Exportar JSON
              </button>
              <button
                onClick={() => setShowClearModal(true)}
                className="text-xs bg-red-600/30 hover:bg-red-600/50 text-red-300 px-3 py-1.5 rounded 
                           transition-colors cursor-pointer"
              >
                Limpiar
              </button>
            </>
          )}
          <button
            onClick={handleImport}
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded 
                       transition-colors cursor-pointer"
          >
            Importar JSON
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        {/* Search bar */}
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm pointer-events-none">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre..."
            className="w-full bg-surface-2 border border-card-border rounded-lg pl-9 pr-3 py-2 
                       text-sm text-gray-100 placeholder-gray-500
                       focus:outline-none focus:border-ether-400 transition-colors"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 
                         text-sm cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Type filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        <button
          onClick={() => setTypeFilter('Todas')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer
            ${typeFilter === 'Todas'
              ? 'bg-ether-600 text-white'
              : 'bg-surface-2 text-gray-400 hover:text-gray-200 hover:bg-card-border'
            }`}
        >
          Todas
        </button>
        {CARD_TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer
              ${typeFilter === type
                ? 'bg-ether-600 text-white'
                : 'bg-surface-2 text-gray-400 hover:text-gray-200 hover:bg-card-border'
              }`}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Paquete filter pills (oficiales + personalizados) */}
      {paquetesVisibles.length > 0 && (
        <div className="flex gap-1.5 flex-wrap items-center mb-4">
          <span className="text-[10px] uppercase tracking-wider text-gray-500 mr-1">
            Paquete:
          </span>
          <button
            onClick={() => setPaqueteFilter('Todos')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer
              ${paqueteFilter === 'Todos'
                ? 'bg-ether-600 text-white'
                : 'bg-surface-2 text-gray-400 hover:text-gray-200 hover:bg-card-border'
              }`}
          >
            Todos
          </button>
          {paquetesVisibles.map((paquete) => {
            const esDinamico = !PAQUETES.some((p) => p.id === paquete.id)
            const prog = esDinamico ? null : progresoPorPaquete.get(paquete.id)
            const conteo = conteoCartasPaquete(paquete.id)
            return (
              <span key={paquete.id} className="flex items-center gap-1">
                <button
                  onClick={() => setPaqueteFilter(paquete.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer flex items-center gap-1
                    ${paqueteFilter === paquete.id
                      ? 'bg-ether-600 text-white'
                      : 'bg-surface-2 text-gray-400 hover:text-gray-200 hover:bg-card-border'
                    }`}
                  title={paquete.lore}
                >
                  <RuneIcon faccion={paquete.facciones[0]} color={paquete.color} size={12} />
                  {paquete.nombre}
                </button>
                {esDinamico ? (
                  <span
                    title={`Cartas de ${paquete.nombre} en la colección`}
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none shrink-0
                      bg-surface text-gray-400 border border-card-border"
                  >
                    {conteo} carta{conteo === 1 ? '' : 's'}
                  </span>
                ) : prog ? (
                  <span
                    title={`Coleccionado: ${prog.coleccionadas}/${prog.total} copias`}
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono leading-none shrink-0
                      ${prog.completo
                        ? 'bg-emerald-600/30 text-emerald-300'
                        : 'bg-surface text-gray-400 border border-card-border'
                      }`}
                  >
                    {prog.coleccionadas}/{prog.total}
                    {prog.completo && ' ✓'}
                  </span>
                ) : null}
                {esDinamico ? (
                  <>
                    <button
                      onClick={() => {
                        void exportPaqueteToJson(paquete, cards).catch((err) => {
                          console.error('Error al exportar paquete JSON:', err)
                        })
                      }}
                      title={`Exportar paquete ${paquete.nombre}`}
                      className="px-2 py-1 rounded-full text-xs bg-ether-600/20 hover:bg-ether-600/40 
                                 text-ether-300 transition-colors cursor-pointer"
                    >
                      Exportar
                    </button>
                    <button
                      onClick={() => {
                        if (
                          confirm(
                            `¿Eliminar el paquete "${paquete.nombre}"? ` +
                              'Las cartas quedarán sin paquete (no se borran).',
                          )
                        ) {
                          eliminarPaquete(paquete.id)
                        }
                      }}
                      title="Eliminar paquete"
                      className="px-2 py-1 rounded-full text-xs bg-red-600/20 hover:bg-red-600/40 
                                 text-red-300 transition-colors cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleImportPaquete(paquete.id)}
                    title={`Importar paquete ${paquete.nombre} (${paquete.distribucion.eter + paquete.distribucion.principal + paquete.distribucion.vinculos} cartas)`}
                    className="px-2 py-1 rounded-full text-xs bg-ether-600/20 hover:bg-ether-600/40 
                               text-ether-300 transition-colors cursor-pointer"
                  >
                    Importar
                  </button>
                )}
              </span>
            )
          })}
          <div className="ml-auto flex gap-1.5">
            <button
              onClick={() => setShowPaqueteModal(true)}
              title="Crear paquete personalizado sin escribir código"
              className="px-3 py-1 rounded-full text-xs bg-ether-600/30 hover:bg-ether-600/50 
                         text-ether-300 transition-colors cursor-pointer"
            >
              Nuevo paquete
            </button>
            <button
              onClick={() => paqueteFileInputRef.current?.click()}
              title="Importar un paquete exportado (.paquete.json)"
              className="px-3 py-1 rounded-full text-xs bg-surface-2 hover:bg-card-border 
                         text-gray-300 transition-colors cursor-pointer"
            >
              Importar paquete (JSON)
            </button>
            <button
              onClick={() => import('../utils/generar-json').then((m) => m.generarJSONActualizado())}
              title="Exportar JSON actualizado desde paquetes.ts"
              className="px-3 py-1 rounded-full text-xs bg-ether-600/30 hover:bg-ether-600/50 
                         text-ether-300 transition-colors cursor-pointer"
            >
              Exportar JSON actualizado
            </button>
          </div>
          <input
            ref={paqueteFileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportPaqueteJson}
            className="hidden"
          />
        </div>
      )}

      {/* Empty states */}
      {cards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">📜</p>
          <p className="font-display text-lg">No hay cartas todavía</p>
          <p className="text-sm mt-1">Importá un archivo JSON o creá tu primera carta arriba</p>
        </div>
      ) : filteredCards.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-2">🔍</p>
          <p className="font-display text-lg">No se encontraron cartas</p>
          <p className="text-sm mt-1">
            Probá con otro término de búsqueda o{' '}
            <button
              onClick={() => {
                setSearch('')
                setTypeFilter('Todas')
                setPaqueteFilter('Todos')
              }}
              className="text-ether-400 hover:text-ether-300 underline cursor-pointer"
            >
              limpiá los filtros
            </button>
          </p>
        </div>
      ) : (
        /* Card grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredCards.map((card) => (
            <CardGridItem
              key={card.id}
              card={card}
              selected={selectedCardId === card.id}
              onSelect={() => setSelectedCardId(card.id)}
              onEdit={() => handleEdit(card)}
              onDelete={() => {
                if (confirm(`¿Eliminar "${card.name}"?`)) {
                  deleteCard(card.id)
                }
              }}
            />
          ))}
        </div>
      )}

      {/* Clear confirmation modal */}
      <ConfirmModal
        isOpen={showClearModal}
        title="¿Limpiar toda la colección?"
        message="Esta acción va a eliminar TODAS las cartas de la colección local. 
                 No se puede deshacer. Asegurate de haber exportado los datos antes si querés conservarlos."
        confirmLabel="Sí, limpiar todo"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => {
          clearCards()
          setShowClearModal(false)
        }}
        onCancel={() => setShowClearModal(false)}
      />

      {/* Modal crear/renombrar colección */}
      <ColeccionModal
        isOpen={modalModo !== null}
        nombreInicial={modalModo === 'renombrar' ? coleccionActiva?.nombre : undefined}
        faccionInicial={modalModo === 'renombrar' ? coleccionActiva?.faccion : undefined}
        onConfirm={(nombre, faccion) => {
          if (modalModo === 'crear') {
            crearColeccion(nombre, faccion)
          } else if (coleccionActiva) {
            renombrarColeccion(coleccionActiva.id, nombre)
          }
          setModalModo(null)
        }}
        onCancel={() => setModalModo(null)}
      />

      {/* Confirmación eliminar colección */}
      <ConfirmModal
        isOpen={showEliminarModal}
        title="¿Eliminar colección?"
        message={`Se van a eliminar TODAS las cartas de "${coleccionActiva?.nombre ?? ''}"` +
          ` (${coleccionActiva?.cards.length ?? 0} cartas). No se puede deshacer.`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={() => {
          if (coleccionActiva) eliminarColeccion(coleccionActiva.id)
          setShowEliminarModal(false)
        }}
        onCancel={() => setShowEliminarModal(false)}
      />

      {/* Modal crear paquete personalizado */}
      <PaqueteModal
        isOpen={showPaqueteModal}
        onConfirm={(datos) => {
          crearPaquete(datos)
          setShowPaqueteModal(false)
        }}
        onCancel={() => setShowPaqueteModal(false)}
      />
    </div>
  )
}
