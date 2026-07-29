import { useCardStore } from '../store/useCardStore'
import { exportCollectionToJson, importCollectionFromJson } from '../utils/export-json'
import { useRef } from 'react'

export function CardList() {
  const cards = useCardStore((s) => s.cards)
  const deleteCard = useCardStore((s) => s.deleteCard)
  const loadCards = useCardStore((s) => s.loadCards)
  const setDraft = useCardStore((s) => s.setDraft)
  const setSelectedCardId = useCardStore((s) => s.setSelectedCardId)
  const selectedCardId = useCardStore((s) => s.selectedCardId)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleEdit = (card: (typeof cards)[number]) => {
    setDraft(card as unknown as Record<string, unknown>)
    setSelectedCardId(null)
  }

  const handleImport = () => {
    fileInputRef.current?.click()
  }

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

  if (cards.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-4xl mb-2">📜</p>
        <p className="font-display text-lg">No hay cartas todavía</p>
        <p className="text-sm mt-1">Creá tu primera carta arriba</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-display text-gray-100">
          Colección ({cards.length})
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportCollectionToJson(cards)}
            className="text-xs bg-surface-2 hover:bg-card-border text-gray-300 px-3 py-1.5 rounded 
                       transition-colors cursor-pointer"
          >
            Exportar JSON
          </button>
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {cards.map((card) => (
          <div
            key={card.id}
            onClick={() => setSelectedCardId(card.id)}
            className={`bg-surface-2 border rounded-lg p-3 cursor-pointer transition-all
              ${selectedCardId === card.id
                ? 'border-ether-400 ring-1 ring-ether-400'
                : 'border-card-border hover:border-gray-500'
              }`}
          >
            {/* Mini preview */}
            <div
              style={{
                aspectRatio: '744/1038',
                borderRadius: 6,
                background: 'linear-gradient(135deg, #16162a, #1e1e36)',
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
                    background: 'rgba(0,0,0,0.4)',
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
              <p className="text-xs text-gray-200 truncate font-medium">
                {card.name || 'Sin nombre'}
              </p>
              <p className="text-[10px] text-gray-500">{card.type}</p>
            </div>
            <div className="flex gap-1 mt-1.5">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleEdit(card)
                }}
                className="flex-1 text-[10px] bg-ether-600/30 hover:bg-ether-600/50 text-ether-300 py-0.5 
                           rounded transition-colors cursor-pointer"
              >
                Editar
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (confirm(`¿Eliminar "${card.name}"?`)) {
                    deleteCard(card.id)
                  }
                }}
                className="flex-1 text-[10px] bg-red-600/30 hover:bg-red-600/50 text-red-300 py-0.5 
                           rounded transition-colors cursor-pointer"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
