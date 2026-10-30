import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { TileCarta } from '../../shared/ui/TileCarta'
import { getCardMeta } from '../game'
import type { GameState } from '../game'
import { InspectorCarta } from './InspectorCarta'
import { MiniCard } from './MiniCard'
import { StatsCampeon } from './StatsCampeon'
import { InspeccionContext } from './tableroContext'
import type { Inspeccion } from './tableroContext'

interface ElegirObjetivoModalProps {
  vista: GameState
  /** Ids de instancia entre los que se elige (tutor, negar, retorno, etc.). */
  opciones: string[]
  /** Carta fuente del efecto (o un texto genérico). */
  titulo: string
  /** Zona real de las opciones: "Búsqueda de mazo — elige una carta", "Elección en campo — elige un Campeón"… */
  subtitulo: string
  onElegir: (objetivoId: string) => void
}

/**
 * Decisión `elegir_objetivo` (búsqueda de mazo, elegir un Campeón, etc.): una galería con las
 * cartas REALES para que el jugador vea qué puede elegir, y a un costado el inspector con el
 * efecto en texto de la carta bajo el mouse. Un clic elige (no hay confirmación: igual que antes).
 * Las cartas boca abajo (Arcanas) se muestran como dorso.
 */
export function ElegirObjetivoModal({ vista, opciones, titulo, subtitulo, onElegir }: ElegirObjetivoModalProps) {
  // El inspector de ESTE modal es propio: no arrastra la última carta que se miró en el tablero
  const [mirada, setMirada] = useState<Inspeccion | null>(null)

  return (
    <InspeccionContext.Provider value={setMirada}>
      <Modal titulo={titulo} subtitulo={subtitulo} icono="✦" ancho="xl">
        <div className="flex items-start gap-5">
          <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(112px,1fr))] content-start gap-3">
            {opciones.map((id) => {
              const inst = vista.instances[id]
              if (!inst) return null
              const meta = inst.cardId ? getCardMeta(inst.cardId) : null
              const bocaAbajo = inst.bocaArriba === false
              const combate = !bocaAbajo && meta?.type === 'Campeón' && 'poder' in meta.stats
              return (
                <TileCarta key={id} onClick={() => onElegir(id)} className="w-full">
                  <MiniCard inst={inst} anchoPx={104} bocaAbajo={bocaAbajo} sinTooltip />
                  <span className="mt-0.5 line-clamp-2 w-full text-center text-xs font-medium leading-tight text-gray-100">
                    {bocaAbajo ? 'Carta boca abajo' : (meta?.name ?? 'Carta')}
                  </span>
                  {meta && !bocaAbajo && (
                    <span className="w-full text-center text-[10px] leading-tight text-gray-500">
                      {meta.type} · Coste {meta.stats.cost}
                      {combate && (
                        <span className="block font-mono">
                          <StatsCampeon s={vista} id={id} />
                        </span>
                      )}
                    </span>
                  )}
                </TileCarta>
              )
            })}
          </div>
          <aside className="sticky top-0 hidden w-56 shrink-0 self-start md:block">
            <InspectorCarta seleccion={mirada} vacioAncho={196} />
          </aside>
        </div>
      </Modal>
    </InspeccionContext.Provider>
  )
}
