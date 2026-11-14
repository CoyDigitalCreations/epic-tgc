import { Modal } from '../../shared/ui/Modal'
import { getCardMeta } from '../game'
import type { GameState } from '../game'

interface ElegirEsenciaModalProps {
  vista: GameState
  /** Esencias entre las que elegir (las acciones `elegir_esencia` que ofrece el motor). */
  esencias: string[]
  /** Campeones que tomarán la Esencia elegida (los objetivos de la pendiente). */
  objetivos: string[]
  onElegir: (esencia: string) => void
}

/**
 * Decisión `elegir_esencia` («se convierte en la esencia que elijas»): el jugador escoge UNA Esencia y se aplica a los
 * Campeones objetivo. Es obligatorio (la partida espera): no hay ✕, se cierra eligiendo.
 */
export function ElegirEsenciaModal({ vista, esencias, objetivos, onElegir }: ElegirEsenciaModalProps) {
  const nombres = objetivos
    .map((id) => (vista.instances[id]?.cardId ? getCardMeta(vista.instances[id]!.cardId!)?.name : null) ?? 'Campeón')
    .join(', ')
  return (
    <Modal
      titulo="Elige una Esencia"
      subtitulo={`${objetivos.length === 1 ? 'El Campeón' : 'Los Campeones'} ${nombres} ${objetivos.length === 1 ? 'se convierte' : 'se convierten'} en la Esencia que elijas.`}
      icono="🧬"
      ancho="md"
    >
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {esencias.map((e) => (
          <button
            key={e}
            type="button"
            onClick={() => onElegir(e)}
            className="rounded-md border border-lime-500/40 bg-gray-800/80 px-3 py-2 text-sm font-medium text-gray-100 hover:border-lime-400 hover:bg-gray-700"
          >
            {e}
          </button>
        ))}
      </div>
    </Modal>
  )
}
