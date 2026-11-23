/**
 * BANCO DE PRUEBA DEL BALANCE DE ÉLITES (ids PR-100 en adelante de seed/CartasPrueba.json).
 *
 * Genera una cuadrícula de Campeones para probar el presupuesto de élite del Tablero de balance (src/balance/config.ts, `elite`):
 *   combinación (Normal, Soberano, Emperador, Única, Soberano+Única, Emperador+Única) × coste × nivel de uso del presupuesto.
 * Los stats salen de la MISMA fórmula que el balanceador (`bandaDe` del presupuesto), no de números escritos a mano: si se recalibra
 * `CONFIG_V1`, se vuelve a correr `npm run generar:cartas-elite` y el banco se reajusta solo.
 *
 * Módulo puro (sin I/O): devuelve las cartas y sus especificaciones. El `texto` de los efectos lo escribe `regenerarTextos`
 * (regla de oro: nunca a mano) y quien escribe el JSON es scripts/generar-cartas-elite.ts.
 */
import { CONFIG_V1 } from '../../src/balance/config'
import { cargarCartas } from '../../src/balance/cargador'
import { bandaDe, impuestoDe } from '../../src/balance/presupuesto'
import type { AnyCard } from '../../src/shared/types'
import { regenerarTextos, type CartaJson } from './regenerarTextos'

export type Combo = 'normal' | 'soberano' | 'emperador' | 'unica' | 'soberano-unica' | 'emperador-unica'
export type NivelStats = 'dentro' | 'limite' | 'exceso-suma' | 'exceso-atq' | 'exceso-res'
export type NivelEfecto = 'medio' | 'fuerte' | 'tabu'
export type AjusteImpuesto = 'ajustada' | 'sin-impuesto'

export interface EspecCarta {
  id: string
  combo: Combo
  coste: number
  /** Cuadrícula de stats puros (sin efecto) o cuadrícula con efecto. */
  grupo: 'stats' | 'efecto'
  nivelStats?: NivelStats
  nivelEfecto?: NivelEfecto
  ajuste?: AjusteImpuesto
  atq: number
  res: number
}

export interface BancoElite {
  cartas: CartaJson[]
  specs: EspecCarta[]
}

/** Primer id del banco. Todo id PR-1xx o mayor lo genera este módulo (el generador los borra y los vuelve a crear). */
export const PRIMER_ID = 100
export const ES_ID_DEL_BANCO = (id: string): boolean => /^PR-[1-9]\d{2,}$/.test(id)

const COMBOS: Record<Combo, { etiqueta: string; roles: string[]; unica: boolean; sacrificios: number }> = {
  normal: { etiqueta: 'Normal', roles: ['Normal'], unica: false, sacrificios: 0 },
  soberano: { etiqueta: 'Soberano', roles: ['Soberano'], unica: false, sacrificios: 1 },
  emperador: { etiqueta: 'Emperador', roles: ['Emperador'], unica: false, sacrificios: 2 },
  unica: { etiqueta: 'Única', roles: ['Normal'], unica: true, sacrificios: 0 },
  'soberano-unica': { etiqueta: 'Soberano Única', roles: ['Soberano'], unica: true, sacrificios: 1 },
  'emperador-unica': { etiqueta: 'Emperador Única', roles: ['Emperador'], unica: true, sacrificios: 2 },
}

const ELITES: Combo[] = ['soberano', 'emperador', 'unica', 'soberano-unica', 'emperador-unica']

/** Costes de la cuadrícula de stats puros. El 0 es el caso de Idris (coste 0 se trata como coste 1). */
const COSTES_ELITE_STATS = [0, 2, 5, 8]
const COSTES_NORMAL_STATS = [6, 7, 8, 9, 10]
const COSTES_ELITE_EFECTO = [4, 7]
const COSTES_NORMAL_EFECTO = [6, 9]

const ETIQUETA_STATS: Record<NivelStats, string> = {
  dentro: 'Dentro',
  limite: 'Límite',
  'exceso-suma': 'Exceso de suma',
  'exceso-atq': 'Exceso de ATQ',
  'exceso-res': 'Exceso de RES',
}
const ETIQUETA_EFECTO: Record<NivelEfecto, string> = { medio: 'Efecto medio', fuerte: 'Efecto fuerte', tabu: 'Efecto con tabú' }
const ETIQUETA_AJUSTE: Record<AjusteImpuesto, string> = { ajustada: 'ajustada', 'sin-impuesto': 'sin impuesto' }

/* ───────────────────────── Efectos (ladrillos tomados de cartas reales del set) ───────────────────────── */

type Efecto = Record<string, unknown>
const STATS_CERO = { ATQ: 0, RES: 0 }

/** Disparo medio: paga 2 Éter y destruye un Campeón rival (como PR-027). */
const DESTRUIR_CAMPEON: Efecto = {
  tipo: 'disparo',
  efecto: 'destroy',
  objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
  stats: STATS_CERO,
  costo: { tipo: 'eter', cantidad: 2 },
  cantidad: 1,
}
/** Continuo fuerte: bloquea 2 Éter y toma el control de un Campeón rival (como PR-025). */
const ROBAR_CAMPEON: Efecto = {
  tipo: 'continuo',
  efecto: 'steal_champion',
  objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
  stats: STATS_CERO,
  costo: { tipo: 'bloqueo_fijo', cantidad: 2 },
  duracion: 'mientras_ester_bloqueado',
  reagrupar: { fase: 'alba', turno: 'propio' },
}
/** Pasivo fuerte: al invocarse, destruye un Campeón rival sin pagar nada (como Idris, PU-010). */
const DESTRUIR_AL_INVOCAR: Efecto = {
  tipo: 'pasivo',
  trigger: 'al_invocar',
  efecto: 'destroy',
  objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
  stats: STATS_CERO,
  cantidad: 1,
}
/** Disparo fuerte: paga 3 Éter y exilia un Campeón rival. */
const EXILIAR_CAMPEON: Efecto = {
  tipo: 'disparo',
  efecto: 'exile',
  objetivo: { tipo: 'campeon', controlador: 'rival', zona: 'campo' },
  stats: STATS_CERO,
  costo: { tipo: 'eter', cantidad: 3 },
  cantidad: 1,
}
/** Disparo con tabú: activa el Disparo de otro Campeón sin pagar su costo ni agotarlo (como Aurora, FB-010): 4 puntos de tabú. */
const ACTIVAR_DISPARO: Efecto = {
  tipo: 'disparo',
  efecto: 'activar_disparo',
  costo: { tipo: 'eter', cantidad: 2 },
  activacion: 'una_por_turno',
  objetivo: { tipo: 'campeon', controlador: 'propio', zona: 'campo', excluyeEsta: true },
  sinPagarCosto: true,
  sinAgotar: true,
}
/** Continuo con tabú 2: los Campeones del rival no reciben incrementos de RES. */
const RIVAL_SIN_RES: Efecto = {
  tipo: 'continuo',
  efecto: 'modificar_regla',
  costo: { tipo: 'bloqueo_fijo', cantidad: 3 },
  activacion: 'una_por_turno',
  reglaEnumerada: 'rival_sin_incrementos_res',
  duracion: 'mientras_tenga_eter_bloqueado',
  reagrupar: { fase: 'alba', turno: 'propio' },
}
/** Pasivo con tabú 2: robas 1 carta más en el Alba (como PR-030, con la regla cartasPorAlba). */
const CARTA_EXTRA_ALBA: Efecto = {
  tipo: 'pasivo',
  efecto: 'modificar_regla',
  objetivo: { tipo: 'todos_campeones_propios', controlador: 'propio', zona: 'campo' },
  stats: STATS_CERO,
  regla: { id: 'cartasPorAlba', operacion: 'sumar', valor: 1 },
}

/**
 * Tres niveles de efecto:
 *  - medio:  un Disparo de remoción con costo (el índice no pasa la franquicia: no paga impuesto).
 *  - fuerte: tres efectos de poder alto sin costo de tabú + Inmortal e Indestructible (paga impuesto grande y roba Campeón: tabú 1).
 *  - tabu:   cuatro infracciones del manual (8 puntos de tabú) con poco poder bruto: prueba el presupuesto de tabú, no el de stats.
 */
const EFECTOS: Record<NivelEfecto, { efectos: Efecto[]; keywords: string[] }> = {
  medio: { efectos: [DESTRUIR_CAMPEON], keywords: [] },
  fuerte: { efectos: [DESTRUIR_AL_INVOCAR, ROBAR_CAMPEON, EXILIAR_CAMPEON], keywords: ['Inmortal', 'Indestructible'] },
  tabu: { efectos: [CARTA_EXTRA_ALBA, RIVAL_SIN_RES, ACTIVAR_DISPARO], keywords: [] },
}

/* ───────────────────────── Presupuesto (misma fórmula del balanceador) ───────────────────────── */

interface Presupuesto {
  sumaMax: number
  sumaMin: number
  tope: number
}

/** Una carta mínima solo para preguntarle al balanceador por la banda de su combinación y coste. */
function cartaMinima(combo: Combo, coste: number, efectos: Efecto[] = [], keywords: string[] = []): AnyCard {
  const c = COMBOS[combo]
  return {
    id: 'PR-000',
    name: 'x',
    type: 'Campeón',
    rarity: c.unica ? 'Única' : 'Común',
    keywords,
    paqueteId: 'prueba',
    facciones: ['Mutación'],
    esencia: 'Humano',
    roles: c.roles,
    catHabilidad: ['Normal'],
    stats: { cost: coste, poder: 1, resistencia: 1 },
    efectos,
  } as unknown as AnyCard
}

function balanceDe(card: AnyCard) {
  const carga = cargarCartas([card], CONFIG_V1)
  return carga.cartas[0]
}

function presupuestoDe(combo: Combo, coste: number): Presupuesto {
  const banda = bandaDe(balanceDe(cartaMinima(combo, coste)), CONFIG_V1)
  if (banda === null) throw new Error(`Sin banda para ${combo} coste ${coste}`)
  return { sumaMax: banda.sumaMax, sumaMin: banda.sumaMin, tope: banda.topeAtq }
}

/** Reparte una suma en ATQ y RES lo más parejo posible (el ATQ se lleva el sobrante), sin pasar el tope. */
function repartir(suma: number, tope: number): { atq: number; res: number } {
  let atq = Math.min(tope, Math.ceil(suma / 2))
  let res = suma - atq
  if (res > tope) {
    res = tope
    atq = suma - res
  }
  return { atq: Math.max(0, atq), res: Math.max(0, res) }
}

function statsDe(nivel: NivelStats, p: Presupuesto, normal: boolean): { atq: number; res: number } {
  switch (nivel) {
    case 'dentro': {
      // Normal: dentro de la banda sin tocar el piso. Élite: sin piso, un poco por debajo del presupuesto.
      const suma = normal ? Math.max(p.sumaMin, p.sumaMax - 2) : Math.max(2, p.sumaMax - 3)
      return repartir(suma, p.tope)
    }
    case 'limite':
      return repartir(p.sumaMax, p.tope)
    case 'exceso-suma':
      // +3 sobre el presupuesto, repartido parejo: en costes bajos también pasa el tope (el modal lo marca igual).
      return repartir(p.sumaMax + 3, p.sumaMax + 3)
    case 'exceso-atq': {
      const atq = p.tope + 2
      return { atq, res: Math.max(1, p.sumaMax - atq) }
    }
    case 'exceso-res': {
      const res = p.tope + 2
      return { atq: Math.max(1, p.sumaMax - res), res }
    }
  }
}

/* ───────────────────────── Armado de cartas ───────────────────────── */

interface Parametros {
  id: string
  combo: Combo
  coste: number
  nombre: string
  nota: string
  atq: number
  res: number
  efectos: Efecto[]
  keywords: string[]
}

function armarCarta(p: Parametros): CartaJson {
  const c = COMBOS[p.combo]
  const rareza = c.unica ? 'Única' : c.sacrificios > 0 ? 'Épica' : 'Rara'
  const copias = c.unica ? '1' : c.sacrificios > 0 ? '2' : '3'
  return {
    id: p.id,
    name: p.nombre,
    type: 'Campeón',
    rarity: rareza,
    keywords: p.keywords,
    flavorText: p.nota,
    paqueteId: 'prueba',
    limiteCopias: copias,
    createdAt: '2026-11-23T00:00:00.000Z',
    updatedAt: '2026-11-23T00:00:00.000Z',
    facciones: ['Mutación'],
    esencia: 'Humano',
    roles: c.roles,
    catHabilidad: c.unica ? ['Singular'] : ['Normal'],
    stats: { cost: p.coste, poder: p.atq, resistencia: p.res },
    efectos: p.efectos.map((e) => structuredClone(e)),
  }
}

function descripcionCombo(combo: Combo): string {
  const c = COMBOS[combo]
  const partes = [combo === 'normal' ? 'Campeón normal' : c.etiqueta]
  if (c.sacrificios > 0) partes.push(`${c.sacrificios} sacrificio${c.sacrificios > 1 ? 's' : ''}`)
  return partes.join(' · ')
}

/** Genera TODO el banco: cartas (sin `texto` aún) y sus especificaciones, con ids consecutivos desde PR-100. */
export function generarBanco(): BancoElite {
  const cartas: CartaJson[] = []
  const specs: EspecCarta[] = []
  let n = PRIMER_ID
  const siguienteId = (): string => `PR-${n++}`

  // 1) Stats puros: Normal (coste >= 6) y las cinco élites, sin efecto.
  const statsPorCombo: Array<{ combo: Combo; costes: number[]; niveles: NivelStats[] }> = [
    { combo: 'normal', costes: COSTES_NORMAL_STATS, niveles: ['dentro', 'limite', 'exceso-suma'] },
    ...ELITES.map((e) => ({ combo: e, costes: COSTES_ELITE_STATS, niveles: ['dentro', 'limite', 'exceso-suma'] as NivelStats[] })),
  ]
  for (const grupo of statsPorCombo) {
    for (const coste of grupo.costes) {
      const p = presupuestoDe(grupo.combo, coste)
      for (const nivel of grupo.niveles) {
        const { atq, res } = statsDe(nivel, p, grupo.combo === 'normal')
        const id = siguienteId()
        specs.push({ id, combo: grupo.combo, coste, grupo: 'stats', nivelStats: nivel, atq, res })
        cartas.push(
          armarCarta({
            id,
            combo: grupo.combo,
            coste,
            nombre: `${COMBOS[grupo.combo].etiqueta} c${coste} ${ETIQUETA_STATS[nivel]}`,
            nota: `${descripcionCombo(grupo.combo)} · coste ${coste} · ${atq}/${res} (suma ${atq + res} de ${p.sumaMax}, tope ${p.tope}). Sin efecto.`,
            atq,
            res,
            efectos: [],
            keywords: [],
          }),
        )
      }
    }
  }

  // 2) Topes de ATQ y de RES aislados (suma dentro del presupuesto, un stat pasa el tope): un coste medio por combinación.
  const topes: Array<{ combo: Combo; coste: number }> = [
    { combo: 'normal', coste: 6 },
    { combo: 'normal', coste: 10 },
    ...ELITES.map((e) => ({ combo: e, coste: 5 })),
  ]
  for (const t of topes) {
    const p = presupuestoDe(t.combo, t.coste)
    for (const nivel of ['exceso-atq', 'exceso-res'] as NivelStats[]) {
      const { atq, res } = statsDe(nivel, p, t.combo === 'normal')
      const id = siguienteId()
      specs.push({ id, combo: t.combo, coste: t.coste, grupo: 'stats', nivelStats: nivel, atq, res })
      cartas.push(
        armarCarta({
          id,
          combo: t.combo,
          coste: t.coste,
          nombre: `${COMBOS[t.combo].etiqueta} c${t.coste} ${ETIQUETA_STATS[nivel]}`,
          nota: `${descripcionCombo(t.combo)} · coste ${t.coste} · ${atq}/${res} (tope ${p.tope}, suma ${atq + res} de ${p.sumaMax}). Un solo stat pasa el tope. Sin efecto.`,
          atq,
          res,
          efectos: [],
          keywords: [],
        }),
      )
    }
  }

  // 3) Con efecto: el impuesto sale del balanceador. «Ajustada» baja los stats lo que cuesta el efecto; «sin impuesto» deja el presupuesto
  //    bruto (la carta se pasa por el costo de su efecto).
  const efectoPorCombo: Array<{ combo: Combo; costes: number[] }> = [
    { combo: 'normal', costes: COSTES_NORMAL_EFECTO },
    ...ELITES.map((e) => ({ combo: e, costes: COSTES_ELITE_EFECTO })),
  ]
  for (const grupo of efectoPorCombo) {
    for (const coste of grupo.costes) {
      const p = presupuestoDe(grupo.combo, coste)
      for (const nivel of ['medio', 'fuerte', 'tabu'] as NivelEfecto[]) {
        const { efectos, keywords } = EFECTOS[nivel]
        const impuesto = impuestoDe(balanceDe(cartaMinima(grupo.combo, coste, efectos, keywords)), CONFIG_V1)
        const sumaAjustada = Math.max(2, Math.floor(p.sumaMax - impuesto))
        // Si el efecto no paga impuesto, «sin impuesto» sería una carta idéntica a la ajustada: no se emite.
        const ajustes: AjusteImpuesto[] = sumaAjustada === p.sumaMax ? ['ajustada'] : ['ajustada', 'sin-impuesto']
        for (const ajuste of ajustes) {
          const suma = ajuste === 'ajustada' ? sumaAjustada : p.sumaMax
          const { atq, res } = repartir(suma, p.tope)
          const id = siguienteId()
          specs.push({ id, combo: grupo.combo, coste, grupo: 'efecto', nivelEfecto: nivel, ajuste, atq, res })
          cartas.push(
            armarCarta({
              id,
              combo: grupo.combo,
              coste,
              nombre: `${COMBOS[grupo.combo].etiqueta} c${coste} ${ETIQUETA_EFECTO[nivel]} ${ETIQUETA_AJUSTE[ajuste]}`,
              nota: `${descripcionCombo(grupo.combo)} · coste ${coste} · ${atq}/${res} (suma ${atq + res} de ${p.sumaMax}, impuesto de efecto ${impuesto}). ${ETIQUETA_EFECTO[nivel]}, stats ${ETIQUETA_AJUSTE[ajuste]}.`,
              atq,
              res,
              efectos,
              keywords,
            }),
          )
        }
      }
    }
  }

  // El texto de los efectos sale siempre del generador del Card-Maker.
  regenerarTextos(cartas)
  return { cartas, specs }
}
