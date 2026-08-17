/**
 * Interfaz de bloqueo manual: muestra los atacantes y permite al defensor
 * elegir qué campeón bloquea a cada uno.
 */
import { useState } from 'react'
import { getCardMeta } from '../game/cards'
import { useCardImage } from '../../forge/hooks/useCardImage'
import type { GameState, PlayerId } from '../game'

interface BlockingInterfaceProps {
  s: GameState
  defensor: PlayerId
  /** IDs de atacantes sin bloquear */
  atacantes: string[]
  /** Callback cuando el defensor confirma el bloqueo */
  onBloquear: (asignaciones: Record<string, string>) => void
  /** Callback para cancelar (no bloquear) */
  onCancelar: () => void
}

/** Miniatura de carta para la interfaz de bloqueo */
function CartaBloqueo({ id, s, orden }: { id: string; s: GameState; orden: number }) {
  const inst = s.instances[id]
  const cardId = inst?.cardId ?? undefined
  const meta = cardId ? getCardMeta(cardId) : null
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold text-red-400 bg-red-900/40 rounded-full w-5 h-5 flex items-center justify-center">
        {orden}
      </span>
      <div
        className="w-16 h-22 rounded border border-red-500/50 overflow-hidden bg-surface-2"
        style={{ aspectRatio: '744/1038' }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={meta?.name ?? ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-400">
            {meta?.name ?? '?'}
          </div>
        )}
      </div>
      <span className="text-[9px] text-red-300 font-medium truncate max-w-16">
        {meta?.name ?? '???'}
      </span>
    </div>
  )
}

/** Miniatura de campeón disponible para bloquear */
function BloqueadorOption({
  id,
  s,
  selected,
  onSelect,
  orden,
}: {
  id: string
  s: GameState
  selected: boolean
  onSelect: () => void
  orden?: number
}) {
  const inst = s.instances[id]
  const cardId = inst?.cardId ?? undefined
  const meta = cardId ? getCardMeta(cardId) : null
  const imageUrl = useCardImage(cardId, meta?.hasImage, meta?.imageUrl)

  return (
    <button
      onClick={onSelect}
      className={`flex flex-col items-center gap-1 p-1 rounded border transition-all ${
        selected
          ? 'border-cyan-400 bg-cyan-900/30 ring-1 ring-cyan-400/50'
          : 'border-gray-600 hover:border-gray-400 bg-surface-2'
      }`}
    >
      {orden !== undefined && (
        <span className="text-[10px] font-bold text-cyan-400 bg-cyan-900/40 rounded-full w-5 h-5 flex items-center justify-center">
          {orden}
        </span>
      )}
      <div
        className="w-12 h-17 rounded overflow-hidden"
        style={{ aspectRatio: '744/1038' }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={meta?.name ?? ''} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[7px] text-gray-400">
            {meta?.name ?? '?'}
          </div>
        )}
      </div>
      <span className="text-[8px] text-gray-300 truncate max-w-12">
        {meta?.name ?? '???'}
      </span>
    </button>
  )
}

export function BlockingInterface({ s, defensor, atacantes, onBloquear, onCancelar }: BlockingInterfaceProps) {
  const p = s.players[defensor]
  const disponibles = p.campo.campeones.filter((id): id is string => id !== null)
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({})

  const seleccionarBloqueador = (atacanteId: string, bloqueadorId: string) => {
    setAsignaciones((prev) => {
      const next = { ...prev }
      // Si ya hay un bloqueador asignado a este atacante, liberarlo
      if (next[atacanteId]) {
        delete next[atacanteId]
      }
      // Si este bloqueador ya estaba asignado a otro atacante, liberarlo
      for (const [atk, blk] of Object.entries(next)) {
        if (blk === bloqueadorId) delete next[atk]
      }
      next[atacanteId] = bloqueadorId
      return next
    })
  }

  const confirmar = () => {
    if (Object.keys(asignaciones).length > 0) {
      onBloquear(asignaciones)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]">
      <div className="bg-surface border border-card-border rounded-lg p-4 max-w-lg w-full mx-4">
        <h3 className="text-sm font-bold text-ether-200 mb-3">
          Elige tus bloqueadores
        </h3>

        {/* Atacantes */}
        <div className="mb-4">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-2">
            Orden de los atacantes ({atacantes.length})
          </p>
          <div className="flex gap-3 flex-wrap">
            {atacantes.map((id, idx) => (
              <div key={id} className="flex flex-col items-center gap-1">
                <CartaBloqueo id={id} s={s} orden={idx + 1} />
                {asignaciones[id] ? (
                  <span className="text-[8px] text-cyan-400">
                    ← {s.instances[asignaciones[id]]?.cardId ? getCardMeta(s.instances[asignaciones[id]].cardId!)?.name : '?'}
                  </span>
                ) : (
                  <span className="text-[8px] text-yellow-500">sin bloquear</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bloqueadores disponibles */}
        <div className="mb-4">
          <p className="text-[9px] uppercase tracking-wider text-gray-500 mb-2">
            Orden de los defensores ({disponibles.length})
          </p>
          <div className="flex gap-2 flex-wrap">
            {disponibles.map((id) => {
              const asignadoA = Object.entries(asignaciones).find(([, blk]) => blk === id)?.[0]
              const ordenAsignado = asignadoA ? atacantes.indexOf(asignadoA) + 1 : undefined
              return (
                <BloqueadorOption
                  key={id}
                  id={id}
                  s={s}
                  selected={Object.values(asignaciones).includes(id)}
                  orden={ordenAsignado}
                  onSelect={() => {
                    // Asignar al primer atacante sin bloqueador
                    const sinBloquear = atacantes.find((a) => !asignaciones[a])
                    if (sinBloquear) seleccionarBloqueador(sinBloquear, id)
                  }}
                />
              )
            })}
          </div>
        </div>

        {/* Botones */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancelar}
            className="text-[10px] bg-gray-600/30 hover:bg-gray-600/50 text-gray-300 px-3 py-1.5 rounded transition-colors"
          >
            No bloquear
          </button>
          <button
            onClick={confirmar}
            disabled={Object.keys(asignaciones).length === 0}
            className="text-[10px] bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-200 px-3 py-1.5 rounded transition-colors disabled:opacity-30"
          >
            Confirmar bloqueo ({Object.keys(asignaciones).length}/{atacantes.length})
          </button>
        </div>
      </div>
    </div>
  )
}
