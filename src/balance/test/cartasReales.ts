import { ALL_CARDS } from '../../shared/data/paquetes'
import { cargarCartas } from '../cargador'
import type { AnyCard } from '../../shared/types'
import disonanciaLegadoJson from './disonancia-legado.json'
import type { CartaBalance } from '../tipos'

/** Las 65 cartas publicadas ya normalizadas, para los tests de las vistas. */
const carga = cargarCartas(ALL_CARDS)
export const CARTAS: CartaBalance[] = carga.cartas
export const AVISOS: string[] = carga.avisos

export function carta(nombre: string): CartaBalance {
  const c = CARTAS.find((x) => x.nombre.startsWith(nombre))
  if (!c) throw new Error(`Falta la carta ${nombre}`)
  return c
}

/**
 * Fotografías de Elena, Isolde y Mira ANTES del rediseño de Estásis (coste y stats viejos; el efecto viejo de Isolde, Mira y Éter del Despertar).
 * Los tests de intención («una carta bajo banda», «una carta que excede el tope de RES», «una carta de coste 2 que pasa el máximo»)
 * se apoyaban en ellas; tras el rediseño las cartas reales ya caben en banda, así que esos casos se conservan con estas copias.
 * Son datos de prueba: NO son el seed. El texto viejo del efecto de Isolde va en `TEXTO_ISOLDE_LEGADO`.
 */
export type NombreLegado = 'Elena' | 'Elena 3/2' | 'Isolde' | 'Mira' | 'Éter del Despertar'

export function legado(nombre: NombreLegado): CartaBalance {
  const base = carta(nombre === 'Elena 3/2' ? 'Elena' : nombre)
  switch (nombre) {
    case 'Elena':
      return { ...base, stats: { atq: 3, res: 0 } }
    case 'Elena 3/2':
      // Elena un paso antes del último ajuste (3/2, suma 5, bajo la banda de coste 3: 6-8). Hoy la real es 4/2, dentro de banda.
      return { ...base, stats: { atq: 3, res: 2 } }
    case 'Isolde':
      return {
        ...base,
        coste: 3,
        stats: { atq: 3, res: 7 },
        efectos: [
          {
            verbo: 'destroy',
            sinVerbo: false,
            verbosTramos: [],
            tipo: 'disparo',
            trigger: null,
            objetivoTipo: 'mistica_arcana',
            duracion: null,
            costoTipo: 'eter',
            costoCantidad: 2,
            activacion: null,
            keywordsConcedidas: [],
            esComandante: false,
          },
        ],
      }
    case 'Éter del Despertar':
      // Despertar viejo: efecto de Bloqueo «mientras esté bloqueado, el Campeón gana Inmortal» (índice 3.5; hoy da Carga al pagar)
      return {
        ...base,
        efectos: base.efectos.map((e) => ({ ...e, tipo: 'bloqueo', trigger: null, duracion: null, keywordsConcedidas: ['Inmortal'] })),
      }
    case 'Mira':
      // Mira vieja: coste 2, 4/4 y solo el pasivo de tutor (sin el Disparo nuevo)
      return { ...base, coste: 2, stats: { atq: 4, res: 4 }, efectos: base.efectos.slice(0, 1) }
  }
}

/**
 * El seed con Elena, Isolde y Mira como eran ANTES del rediseño de Estásis: devuelve el contexto en el que esos casos eran
 * reales (el ajuste exploratorio de Elena 3/0 -> 5/1, el techo de RES 7 por Isolde...).
 */
export const CARTAS_ANTES: CartaBalance[] = CARTAS.map((c) =>
  c.id === 'FB-012'
    ? legado('Mira')
    : c.id === 'FB-014'
      ? legado('Isolde')
      : c.id === 'FB-015'
        ? legado('Elena')
        : c.id === 'FB-008'
          ? legado('Éter del Despertar')
          : c,
)

/**
 * Como CARTAS_ANTES pero solo con la Elena 3/2 (bajo banda por 1 punto) y el resto del seed actual: para los casos
 * «una carta bajo banda que puede subir» que antes ilustraba la Elena real.
 */
export const CARTAS_ELENA_32: CartaBalance[] = CARTAS.map((c) => (c.id === 'FB-015' ? legado('Elena 3/2') : c))

/** Texto del efecto viejo de Isolde (el que citaban las razones del análisis). */
export const TEXTO_ISOLDE_LEGADO = 'Puedes pagar 2 Éter, destruye 1 Mística o Arcana que controla el rival.'

/**
 * Las 33 cartas de Disonancia COMO ERAN antes del rediseño (Lote 2: Kael 5/3, Draven 4/4, Marek 5/4 con copy, Ragnar con destroy e
 * Indestructible a todos, etc.), tomadas del seed de entonces (`disonancia-legado.json`; datos de prueba, NO son el seed).
 * Los tests de intención del balance («cuatro Campeones de coste 2 sobre el máximo», «Draven baja a la suma objetivo», la matriz de
 * letalidad con Kael 5/3…) se apoyaban en esas cartas; tras el rediseño las reales ya caben en banda, así que esos casos se conservan con este
 * pool (mismo criterio que `CARTAS_ANTES` para Estásis). El resto del seed (Estásis) es el actual.
 */
const DS_LEGADO = new Map((disonanciaLegadoJson as unknown as AnyCard[]).map((c) => [c.id, c]))
export const CARTAS_DS_ANTES: CartaBalance[] = cargarCartas(ALL_CARDS.map((c) => DS_LEGADO.get(c.id) ?? c)).cartas
/** Elena 3/2 (bajo banda) y la Disonancia de antes: la combinación sobre la que se escribieron los tests de ajustes (6 ajustes: Elena, Isolde y cuatro de Disonancia). */
export const CARTAS_ELENA_32_DS_ANTES: CartaBalance[] = CARTAS_DS_ANTES.map((c) => (c.id === 'FB-015' ? legado('Elena 3/2') : c))

export function legadoDS(prefijo: string): CartaBalance {
  const c = CARTAS_DS_ANTES.find((x) => x.nombre.startsWith(prefijo))
  if (!c) throw new Error(`Falta la carta legada ${prefijo}`)
  return c
}
