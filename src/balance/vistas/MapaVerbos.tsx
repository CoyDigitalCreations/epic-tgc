import { SinCartas } from '../componentes/SinCartas'
import { COLOR_MAZO } from '../componentes/colores'
import { TituloVista } from '../componentes/TituloVista'
import type { ClaseIdentidad } from '../identidad'
import { mapaVerbos } from '../metricas'
import { INTENSIDAD_MAXIMA } from './constantesUi'
import type { PropsVista } from './props'

const ROL: Record<ClaseIdentidad, string> = {
  identidad: 'Identidad',
  neutral: 'Neutral',
  fuera: 'Fuera de identidad',
}

const CLASE_ROL: Record<ClaseIdentidad, string> = {
  identidad: 'text-green-300',
  neutral: 'text-gray-400',
  fuera: 'text-red-300',
}

const TH = 'border-b border-card-border px-2 py-1 font-display text-xs text-ether-200'
const TD = 'border-b border-card-border/40 px-2 py-1'

function Calor({ cantidad, maximo, color }: { cantidad: number; maximo: number; color: string }) {
  const intensidad = maximo === 0 ? 0 : Math.round((cantidad / maximo) * INTENSIDAD_MAXIMA)
  return (
    <td
      className={`${TD} text-center font-mono`}
      style={{ backgroundColor: `color-mix(in srgb, ${color} ${intensidad}%, transparent)` }}
    >
      {cantidad}
    </td>
  )
}

/** Tabla-heatmap mazo × verbo; el rol marca si el verbo es identidad, neutral o ajeno a cada mazo. */
export function MapaVerbos({ cartas }: PropsVista) {
  const filas = mapaVerbos(cartas)
  if (cartas.length === 0 || filas.length === 0) return <SinCartas />
  const maximo = Math.max(...filas.map((f) => Math.max(f.estasis, f.disonancia)))
  return (
    <section>
      <TituloVista
        titulo="Mapa de verbos"
        descripcion="Cuántas veces usa cada mazo cada verbo de efecto. Cuanto más intenso el color, más veces; el rol dice si el verbo es propio del mazo, neutral o del mazo rival."
      />
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm text-gray-300">
          <caption className="mb-1 text-left text-xs text-gray-500">
            Verbos por mazo, con el rol de cada verbo para cada mazo
          </caption>
          <thead>
            <tr>
              <th scope="col" className={TH}>Verbo</th>
              <th scope="col" className={TH}>Estásis</th>
              <th scope="col" className={TH}>Disonancia</th>
              <th scope="col" className={TH}>Estásis: rol del verbo</th>
              <th scope="col" className={TH}>Disonancia: rol del verbo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.verbo}>
                <td className={`${TD} font-mono`}>{f.verbo}</td>
                <Calor cantidad={f.estasis} maximo={maximo} color={COLOR_MAZO.estasis} />
                <Calor cantidad={f.disonancia} maximo={maximo} color={COLOR_MAZO.disonancia} />
                <td className={`${TD} ${CLASE_ROL[f.claseEstasis]}`}>{ROL[f.claseEstasis]}</td>
                <td className={`${TD} ${CLASE_ROL[f.claseDisonancia]}`}>{ROL[f.claseDisonancia]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
