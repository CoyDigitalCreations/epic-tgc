import { describirEfectosDeCarta } from '../describirEfecto'
import { MiniCard } from './MiniCard'
import type { Inspeccion } from './tableroContext'

const ANCHO_INSPECTOR = 196

/**
 * Panel lateral con la carta que el jugador tiene bajo el mouse (como el
 * detalle de Master Duel): la carta grande con sus stats VIVAS y sus efectos
 * en texto legible, porque en el tablero las cartas son miniaturas.
 * Conserva la última carta vista al sacar el mouse, para poder leerla con calma.
 */
export function InspectorCarta({ seleccion, vacioAncho = ANCHO_INSPECTOR * 0.5 }: { seleccion: Inspeccion | null; vacioAncho?: number }) {
  if (!seleccion) {
    return (
      <div className="flex justify-center">
        <div
          className="flex shrink-0 items-center justify-center rounded-lg border border-dashed border-card-border/70 px-2 text-center text-[10px] text-gray-600"
          style={{ width: vacioAncho, aspectRatio: '744/1038' }}
        >
          Pasa el mouse sobre una carta
        </div>
      </div>
    )
  }

  const { inst, carta } = seleccion
  const lineas = describirEfectosDeCarta(carta)
  const keywords = carta.keywords ?? []

  return (
    <div className="flex flex-col items-center gap-2">
      <MiniCard inst={inst} carta={carta} anchoPx={ANCHO_INSPECTOR} sinAncla />
      {(keywords.length > 0 || lineas.length > 0) && (
        <div className="w-full space-y-1.5">
          {keywords.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center">
              {keywords.map((k) => (
                <span key={k} className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-ether-600/25 text-ether-200">
                  {k}
                </span>
              ))}
            </div>
          )}
          {lineas.length > 0 && (
            <ul className="space-y-1">
              {lineas.map((l, i) => (
                <li key={i} className="text-[11px] leading-snug text-gray-300 pl-2 border-l-2 border-ether-600/50">
                  {l}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
