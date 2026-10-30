/**
 * Interfaz de bloqueo manual: muestra los atacantes y permite al defensor
 * elegir qué campeón bloquea a cada uno.
 */
import { useState } from 'react'
import { Boton } from '../../shared/ui/Boton'
import { Modal } from '../../shared/ui/Modal'
import { Seccion } from '../../shared/ui/Seccion'
import { TileCarta } from '../../shared/ui/TileCarta'
import { getCardMeta } from '../game/cards'
import type { GameState, PlayerId } from '../game'
import { statsComparativos } from '../game/stats'
import { MiniCard } from './MiniCard'
import { StatsCampeon } from './StatsCampeon'

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

/** ¿Es un Campeón con stats de combate? (decide si se muestra el ATQ/RES actual). */
function tieneStats(s: GameState, id: string): boolean {
  return statsComparativos(s, id) !== null
}

/** Número de orden (de atacante o de su bloqueador) como insignia redonda. */
function Insignia({ n, tono }: { n: number; tono: 'rival' | 'propio' }) {
  return (
    <span
      className={`grid size-5 place-items-center rounded-full font-mono text-[11px] font-bold ${
        tono === 'rival' ? 'bg-rose-500/25 text-rose-200 ring-1 ring-rose-400/50' : 'bg-cyan-500/25 text-cyan-100 ring-1 ring-cyan-300/50'
      }`}
    >
      {n}
    </span>
  )
}

export function BlockingInterface({ s, defensor, atacantes, onBloquear, onCancelar }: BlockingInterfaceProps) {
  const p = s.players[defensor]
  const disponibles = p.campo.campeones.filter((id): id is string => id !== null)
  const [asignaciones, setAsignaciones] = useState<Record<string, string>>({})
  // Bloqueo forzoso (§9.3): hay que cubrir k = min(disponibles, ataques) —
  // la elección es QUÉ pares, no CUÁNTOS (A5: el defensor elige con qué
  // Campeón(es) bloquear, pero debe bloquear el máximo posible).
  const kMaximo = Math.min(disponibles.length, atacantes.length)

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

  const nombreDe = (id: string) => {
    const cardId = s.instances[id]?.cardId
    return (cardId ? getCardMeta(cardId)?.name : null) ?? '?'
  }

  return (
    <Modal
      titulo="Elige tus bloqueadores"
      subtitulo={`Bloqueo forzoso (§9.3): tienes que bloquear con ${kMaximo} Campeón${kMaximo === 1 ? '' : 'es'}; eliges con cuál${kMaximo === 1 ? '' : 'es'}.`}
      icono="⚔"
      tono="rival"
      ancho="lg"
      pie={
        <>
          <Boton onClick={onCancelar}>No bloquear</Boton>
          <Boton variante="primario" onClick={confirmar} disabled={Object.keys(asignaciones).length !== kMaximo}>
            Confirmar bloqueo ({Object.keys(asignaciones).length}/{kMaximo})
          </Boton>
        </>
      }
    >
      <div className="space-y-4">
        {/* Atacantes */}
        <section className="rounded-xl border border-rose-400/20 bg-rose-500/[0.05] p-3">
          <Seccion cantidad={atacantes.length}>Orden de los atacantes</Seccion>
          <div className="flex flex-wrap gap-4">
            {atacantes.map((id, idx) => {
              const conStats = tieneStats(s, id)
              const bloqueador = asignaciones[id]
              return (
                <div key={id} className="flex w-24 flex-col items-center gap-1">
                  <Insignia n={idx + 1} tono="rival" />
                  <div className={`rounded-md ${bloqueador ? 'ring-2 ring-cyan-300/60' : 'ring-1 ring-rose-400/40'}`}>
                    <MiniCard inst={s.instances[id]!} anchoPx={84} sinTooltip sinAncla />
                  </div>
                  <span className="line-clamp-2 w-full text-center text-[10px] font-medium leading-tight text-rose-200">{nombreDe(id)}</span>
                  {conStats && (
                    <span className="font-mono text-[10px] text-gray-400">
                      <StatsCampeon s={s} id={id} />
                    </span>
                  )}
                  {bloqueador ? (
                    <span className="max-w-full truncate text-[10px] text-cyan-300">← {nombreDe(bloqueador)}</span>
                  ) : (
                    <span className="text-[10px] text-amber-400">sin bloquear</span>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* Bloqueadores disponibles */}
        <section>
          <Seccion cantidad={disponibles.length}>Orden de los defensores</Seccion>
          <div className="flex flex-wrap gap-2">
            {disponibles.map((id) => {
              const asignadoA = Object.entries(asignaciones).find(([, blk]) => blk === id)?.[0]
              const ordenAsignado = asignadoA ? atacantes.indexOf(asignadoA) + 1 : undefined
              const conStats = tieneStats(s, id)
              return (
                <TileCarta
                  key={id}
                  seleccionada={Object.values(asignaciones).includes(id)}
                  onClick={() => {
                    // Asignar al primer atacante sin bloqueador
                    const sinBloquear = atacantes.find((a) => !asignaciones[a])
                    if (sinBloquear) seleccionarBloqueador(sinBloquear, id)
                  }}
                  pie={conStats ? <StatsCampeon s={s} id={id} /> : nombreDe(id)}
                >
                  <div className="flex h-5 items-center">{ordenAsignado !== undefined && <Insignia n={ordenAsignado} tono="propio" />}</div>
                  <MiniCard inst={s.instances[id]!} anchoPx={72} sinTooltip sinAncla />
                  <span className="line-clamp-2 w-[84px] text-center text-[10px] leading-tight text-gray-300">{nombreDe(id)}</span>
                </TileCarta>
              )
            })}
          </div>
        </section>
      </div>
    </Modal>
  )
}
