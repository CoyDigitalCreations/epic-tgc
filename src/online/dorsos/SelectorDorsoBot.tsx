import { DorsoCarta } from './DorsoCarta'
import { DORSOS } from './dorsos'
import type { DorsoBotElegido } from './dorsos'

interface Props {
  valor: DorsoBotElegido
  onCambiar: (eleccion: DorsoBotElegido) => void
}

const BASE = 'block w-full overflow-hidden rounded-md border transition'

/**
 * Reverso con el que el bot muestra sus cartas ocultas. Es solo de tu pantalla (el bot no es un jugador de la base), así que se
 * recuerda en este navegador. «Auto»: uno distinto al tuyo, que cambia con la semilla.
 */
export function SelectorDorsoBot({ valor, onCambiar }: Props) {
  const opciones: { id: DorsoBotElegido; nombre: string }[] = [{ id: 'auto', nombre: 'Auto' }, ...DORSOS.map((d) => ({ id: d.id, nombre: d.nombre }))]
  const actual = valor === 'auto' ? 'Auto: uno distinto al tuyo, según la semilla.' : DORSOS[valor]?.nombre

  return (
    <div className="mb-5">
      <div role="radiogroup" aria-label="Reverso del rival" className="grid grid-cols-6 gap-1.5">
        {opciones.map((o) => {
          const activo = o.id === valor
          return (
            <button
              key={String(o.id)}
              type="button"
              role="radio"
              aria-checked={activo}
              aria-label={o.nombre}
              title={o.nombre}
              onClick={() => onCambiar(o.id)}
              className={`cursor-pointer rounded-lg p-0.5 transition focus:outline-none focus-visible:ring-1 focus-visible:ring-ether-400 ${
                activo ? 'bg-ether-600/20 shadow-[0_0_12px_-3px_rgba(144,144,255,0.6)]' : 'hover:bg-white/5'
              }`}
            >
              <span
                className={`${BASE} ${activo ? 'border-ether-400' : 'border-[#3b3b5c]'}`}
                style={{ aspectRatio: '744/1038' }}
              >
                {o.id === 'auto' ? (
                  <span className="grid h-full w-full place-items-center bg-[#16162e] font-display text-base text-ether-200" aria-hidden="true">
                    ↻
                  </span>
                ) : (
                  <DorsoCarta id={o.id} />
                )}
              </span>
            </button>
          )
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-gray-500">{actual}</p>
    </div>
  )
}
