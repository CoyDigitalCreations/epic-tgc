import { SinCartas } from '../componentes/SinCartas'
import { TablaAlternativa } from '../componentes/TablaAlternativa'
import { TituloVista } from '../componentes/TituloVista'
import { resumenPorMazo } from '../metricas'
import { NOMBRE_MAZO } from './formato'
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
    </section>
  )
}
