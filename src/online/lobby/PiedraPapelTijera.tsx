import { Boton } from '../../shared/ui/Boton'
import { JUGADAS_PPT } from '../game'
import type { JugadaPpt, PlayerId, PptVista } from '../game'

const GESTO: Record<JugadaPpt, { icono: string; nombre: string }> = {
  piedra: { icono: '✊', nombre: 'Piedra' },
  papel: { icono: '✋', nombre: 'Papel' },
  tijera: { icono: '✌️', nombre: 'Tijera' },
}

interface Props {
  /** Quién soy en la sala. */
  yo: PlayerId
  /** Lo que el servidor me deja ver del minijuego (nunca la jugada pendiente del rival). */
  ppt: PptVista | null
  onJugar: (jugada: JugadaPpt) => void
  onDecidir: (empezar: boolean) => void
  /** Hay una petición en vuelo: se deshabilitan los botones. */
  ocupado?: boolean
}

const etiqueta = (j: JugadaPpt) => `${GESTO[j].icono} ${GESTO[j].nombre}`

/** Piedra, papel o tijera de la sala de espera: quien gana decide si empieza o cede el primer turno. */
export function PiedraPapelTijera({ yo, ppt, onJugar, onDecidir, ocupado = false }: Props) {
  const rival: PlayerId = yo === 'A' ? 'B' : 'A'

  // Decidido: la partida está por arrancar
  if (ppt?.primerJugador) {
    return (
      <p role="status" className="text-sm text-gray-200">
        {ppt.primerJugador === yo ? 'Empiezas tú.' : 'Empieza tu rival.'} Iniciando partida…
      </p>
    )
  }

  // Hay ganador: se revela la ronda y él decide
  if (ppt?.ganador && ppt.ultima) {
    const mia = ppt.ultima[yo]
    const suya = ppt.ultima[rival]
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-300">
          Tú: <strong>{etiqueta(mia)}</strong> · Rival: <strong>{etiqueta(suya)}</strong>
        </p>
        {ppt.ganador === yo ? (
          <>
            <p className="font-display text-lg text-ether-200">¡Ganaste! ¿Quién empieza?</p>
            <div className="flex justify-center gap-2">
              <Boton variante="primario" onClick={() => onDecidir(true)} disabled={ocupado}>
                Empiezo yo
              </Boton>
              <Boton onClick={() => onDecidir(false)} disabled={ocupado}>
                Que empiece mi rival
              </Boton>
            </div>
          </>
        ) : (
          <p role="status" className="text-sm text-gray-400">
            Tu rival ganó y está decidiendo quién empieza…
          </p>
        )}
      </div>
    )
  }

  // Ronda en curso
  const empate = ppt?.ultima && ppt.ultima.A === ppt.ultima.B ? ppt.ultima.A : null
  return (
    <div className="space-y-4">
      <p className="font-display text-lg text-gray-100">¿Quién empieza?</p>
      <p className="text-xs text-gray-500">Piedra, papel o tijera. Quien gane decide si empieza o cede el turno.</p>
      {empate && (
        <p role="status" className="text-sm text-amber-300">
          Empate: ambos eligieron {etiqueta(empate)}. ¡Otra ronda!
        </p>
      )}
      {ppt?.miJugada ? (
        <p role="status" className="text-sm text-gray-300">
          Elegiste <strong>{etiqueta(ppt.miJugada)}</strong>. Esperando a tu rival…
        </p>
      ) : (
        <>
          {ppt?.rivalListo && <p className="text-xs text-emerald-300">Tu rival ya eligió.</p>}
          <div className="flex justify-center gap-2">
            {JUGADAS_PPT.map((j) => (
              <Boton key={j} tam="lg" onClick={() => onJugar(j)} disabled={ocupado} aria-label={GESTO[j].nombre}>
                <span aria-hidden="true">{GESTO[j].icono}</span>
              </Boton>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
