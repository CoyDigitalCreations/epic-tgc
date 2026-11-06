import { SinCartas } from '../componentes/SinCartas'
import { TablaAlternativa } from '../componentes/TablaAlternativa'
import { TituloVista } from '../componentes/TituloVista'
import { CONFIG_V1 } from '../config'
import { resumenPorMazo } from '../metricas'
import { resumenTabuPorMazo } from '../tabu'
import { ESCALA_TABU, NOMBRE_MAZO, num } from './formato'
import type { PropsVista } from './props'

/** Una fila por mazo: tamaño, identidad y cuántas cartas se salen de su presupuesto. */
export function ResumenMazo({ cartas }: PropsVista) {
  if (cartas.length === 0) return <SinCartas />
  const filas = resumenPorMazo(cartas)
    .filter((r) => r.cartas > 0)
    .map((r) => [
      NOMBRE_MAZO[r.mazo],
      String(r.cartas),
      String(r.campeones),
      String(r.identidad.porcentaje),
      String(r.fueraDeBanda),
      String(r.rotas),
    ])
  const niveles = CONFIG_V1.tabu.niveles
  const filasTabu = resumenTabuPorMazo(cartas)
    .filter((r) => r.cartas > 0)
    .map((r) => [
      NOMBRE_MAZO[r.mazo],
      String(r.total),
      num(r.medio),
      ...niveles.map((n) => String(r.porNivel[n] ?? 0)),
      String(r.excede),
    ])
  return (
    <section>
      <TituloVista
        titulo="Resumen por mazo"
        descripcion="Compara cuántas cartas tiene cada mazo, qué tanto se parece a su identidad y cuántas se salen de su presupuesto."
      />
      <TablaAlternativa
        caption="Resumen por mazo. La identidad es el porcentaje de efectos que son propios del mazo."
        columnas={['Mazo', 'Cartas', 'Campeones', 'Identidad (%)', 'Fuera de banda', 'Cartas rotas']}
        filas={filas}
      />
      <p className="mt-3 text-xs text-gray-500">
        Una carta se considera «rota» cuando un Campeón pasa su suma objetivo o su tope individual, o cuando una carta que no
        es Campeón trae más poder del esperado para su coste.
      </p>

      <h3 className="mt-6 font-display text-sm font-bold uppercase tracking-wider text-ether-200">Tabú por mazo</h3>
      <TablaAlternativa
        caption="Tabú por mazo. El nivel de una carta es el de la regla más grave que rompe; el total suma los puntos de todas sus cartas."
        columnas={['Mazo', 'Tabú total', 'Tabú medio', ...niveles.map((n) => `Cartas de nivel ${n}`), 'Exceden su presupuesto de tabú']}
        filas={filasTabu}
      />
      <p className="mt-3 text-xs text-gray-500">
        El tabú mide cuántas reglas del manual rompen los efectos de una carta. Niveles: {ESCALA_TABU} A mayor tabú, más debería costar:
        cada coste permite un máximo de puntos y una carta lo excede al pasarse. Las Únicas y los Soberanos quedan exentos; los Éteres no.
      </p>
    </section>
  )
}
