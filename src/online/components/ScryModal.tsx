import { useState } from 'react'
import { Boton } from '../../shared/ui/Boton'
import { Modal } from '../../shared/ui/Modal'
import { getCardMeta } from '../game'
import type { GameState } from '../game'
import { MiniCard } from './MiniCard'

interface ScryModalProps {
  vista: GameState
  /** Cartas miradas (tope primero) que siguen en el mazo: `cartasVigentesScry`. */
  cartas: string[]
  /** `arriba` queda al tope en ese orden (la primera se roba primero); `fondo` se manda al fondo. */
  onConfirmar: (arriba: string[], fondo: string[]) => void
}

/**
 * Decisión `ordenar_mazo` (scry): el jugador ve las cartas del tope de su mazo, las reordena con ◀ ▶ y puede mandar
 * las que quiera al fondo. Es obligatorio (la partida espera): no hay ✕, se cierra confirmando. Confirmar sin tocar
 * nada deja el mazo igual.
 */
export function ScryModal({ vista, cartas, onConfirmar }: ScryModalProps) {
  const [orden, setOrden] = useState<string[]>(cartas)
  const [alFondo, setAlFondo] = useState<ReadonlySet<string>>(new Set())

  const mover = (idx: number, delta: -1 | 1) => {
    const destino = idx + delta
    if (destino < 0 || destino >= orden.length) return
    const copia = [...orden]
    ;[copia[idx], copia[destino]] = [copia[destino], copia[idx]]
    setOrden(copia)
  }
  const alternarFondo = (id: string) => {
    const nuevo = new Set(alFondo)
    if (nuevo.has(id)) nuevo.delete(id)
    else nuevo.add(id)
    setAlFondo(nuevo)
  }
  const arriba = orden.filter((id) => !alFondo.has(id))
  const fondo = orden.filter((id) => alFondo.has(id))

  const boton = 'rounded-md border border-gray-600/60 bg-gray-800/80 px-2 py-0.5 text-xs text-gray-200 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-30'

  return (
    <Modal
      titulo="Mira el tope de tu mazo"
      subtitulo={`Ordena las ${cartas.length} carta(s): la primera de la izquierda se roba primero. Puedes mandar las que quieras al fondo.`}
      icono="🔮"
      ancho="xl"
      pie={
        <Boton variante="primario" onClick={() => onConfirmar(arriba, fondo)}>
          Confirmar ({arriba.length} arriba · {fondo.length} al fondo)
        </Boton>
      }
    >
      <div className="flex flex-wrap items-start gap-4">
        {orden.map((id, idx) => {
          const inst = vista.instances[id]
          if (!inst) return null
          const nombre = (inst.cardId ? getCardMeta(inst.cardId)?.name : null) ?? 'Carta'
          const abajo = alFondo.has(id)
          return (
            <div key={id} className={`flex w-28 flex-col items-center gap-1 ${abajo ? 'opacity-60' : ''}`}>
              <span className="text-[10px] uppercase tracking-wide text-gray-500">
                {abajo ? 'Al fondo' : `Posición ${arriba.indexOf(id) + 1}`}
              </span>
              <MiniCard inst={inst} anchoPx={104} sinTooltip />
              <span className="line-clamp-2 w-full text-center text-xs font-medium leading-tight text-gray-100">{nombre}</span>
              <div className="flex gap-1">
                <button type="button" className={boton} aria-label={`Mover ${nombre} a la izquierda`} disabled={idx === 0} onClick={() => mover(idx, -1)}>◀</button>
                <button type="button" className={boton} aria-label={`Mover ${nombre} a la derecha`} disabled={idx === orden.length - 1} onClick={() => mover(idx, 1)}>▶</button>
              </div>
              <button type="button" className={boton} onClick={() => alternarFondo(id)}>
                {abajo ? 'Dejar arriba' : 'Mandar al fondo'}
              </button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
