import { useState } from 'react'
import { Modal } from '../../shared/ui/Modal'
import { TileCarta } from '../../shared/ui/TileCarta'
import { getCardMeta } from '../game'
import type { GameState, ParejaBloqueo } from '../game'
import { InspectorCarta } from './InspectorCarta'
import { MiniCard } from './MiniCard'
import { StatsCampeon } from './StatsCampeon'
import { InspeccionContext } from './tableroContext'
import type { Inspeccion } from './tableroContext'

interface ElegirBloqueoModalProps {
  vista: GameState
  /** Parejas legales Campeón + Éter (motor: parejasBloqueoOpcion). */
  parejas: ParejaBloqueo[]
  /** Nombre del Éter con el Pasivo 1A que ofrece el bloqueo. */
  fuenteNombre: string
  onElegir: (pareja: ParejaBloqueo) => void
  /** La opción es voluntaria: se puede dejar para después (el botón de Acciones la reabre). */
  onCerrar: () => void
}

/**
 * Pasivo 1A (FB-005/DS-006): "una vez por turno, bloquea 1 Éter de tu Reserva sobre un Campeón".
 * Dos pasos con las cartas REALES: primero el Campeón, después el Éter. Con un solo Campeón
 * elegible se salta directo al Éter. Un clic en el Éter confirma (igual que `elegir_objetivo`).
 */
export function ElegirBloqueoModal({ vista, parejas, fuenteNombre, onElegir, onCerrar }: ElegirBloqueoModalProps) {
  const [mirada, setMirada] = useState<Inspeccion | null>(null)
  const [elegido, setElegido] = useState<string | null>(null)

  const campeones = [...new Set(parejas.map((q) => q.campeonId))]
  const campeonId = elegido && campeones.includes(elegido) ? elegido : campeones.length === 1 ? campeones[0] : null
  const eteres = campeonId ? parejas.filter((q) => q.campeonId === campeonId).map((q) => q.eterId) : []
  const nombreCampeon = campeonId ? (getCardMeta(vista.instances[campeonId]?.cardId ?? '')?.name ?? 'Campeón') : ''

  const pie = (
    <>
      {campeonId && campeones.length > 1 && (
        <button
          type="button"
          onClick={() => setElegido(null)}
          className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/10"
        >
          ← Cambiar Campeón
        </button>
      )}
      <button
        type="button"
        onClick={onCerrar}
        className="cursor-pointer rounded-lg px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-white/10"
      >
        Ahora no
      </button>
    </>
  )

  return (
    <InspeccionContext.Provider value={setMirada}>
      <Modal
        titulo={fuenteNombre}
        subtitulo={campeonId ? `Elige el Éter de tu Reserva que se bloquea sobre ${nombreCampeon}` : 'Elige el Campeón que recibe el Éter bloqueado'}
        icono="✦"
        ancho="xl"
        onCerrar={onCerrar}
        pie={pie}
      >
        <div className="flex items-start gap-5">
          <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(112px,1fr))] content-start gap-3">
            {(campeonId ? eteres : campeones).map((id) => {
              const inst = vista.instances[id]
              if (!inst) return null
              const meta = inst.cardId ? getCardMeta(inst.cardId) : null
              const combate = !campeonId && meta?.type === 'Campeón' && 'poder' in meta.stats
              const disponibles = campeonId ? 0 : parejas.filter((q) => q.campeonId === id).length
              return (
                <TileCarta
                  key={id}
                  onClick={() => (campeonId ? onElegir({ campeonId, eterId: id }) : setElegido(id))}
                  className="w-full"
                >
                  <MiniCard inst={inst} anchoPx={104} sinTooltip />
                  <span className="mt-0.5 line-clamp-2 w-full text-center text-xs font-medium leading-tight text-gray-100">
                    {meta?.name ?? 'Carta'}
                  </span>
                  {combate && (
                    <span className="w-full text-center font-mono text-[10px] leading-tight text-gray-500">
                      <StatsCampeon s={vista} id={id} />
                    </span>
                  )}
                  {disponibles > 0 && (
                    <span className="w-full text-center text-[10px] leading-tight text-gray-500">
                      {disponibles} Éter{disponibles > 1 ? 'es' : ''} posible{disponibles > 1 ? 's' : ''}
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
