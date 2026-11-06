import type { AnyCard, EfectoData } from '../../shared/types'

/**
 * Campos de un efecto que solo tienen sentido para UN tipo de efecto (el formulario del Card-Maker los muestra únicamente
 * con ese efecto). Si se cambia el efecto sin limpiarlos, el campo queda ESCONDIDO en los datos —no se ve en el formulario
 * pero se exporta—: así quedó `copyAttributes: ["atq"]` en Thane (que ya no es un `copy`). Es inerte para el motor, pero
 * ensucia los datos y confunde.
 */
const CAMPO_DE_EFECTO: ReadonlyArray<readonly [keyof EfectoData, readonly string[]]> = [
  ['copyAttributes', ['copy']],
  ['tipoNegacion', ['negar']],
  ['cambioTipo', ['change_type']],
  ['regla', ['modificar_regla']],
  ['reglaEnumerada', ['modificar_regla']],
  ['reglaValor', ['modificar_regla']],
  ['sinPagarCosto', ['activar_disparo']],
  ['sinAgotar', ['activar_disparo']],
  ['opcionFondo', ['scry']],
  ['alAzar', ['rival_discard']],
  // El formulario los muestra solo con estos efectos (`showStats` / `showKeyword` en EffectField.tsx): con cualquier otro
  // quedan escondidos y no se pueden borrar desde la UI (así quedaron el ATQ de Thane y el de Ragnar)
  ['stats', ['buff', 'debuff']],
  ['buffPerBlockedEther', ['buff', 'debuff']],
  ['keyword', ['grant_keyword']],
]

/** Claves que YA NO EXISTEN en el esquema (restos de diseños anteriores): no las lee ni el motor ni el formulario. */
const CLAVES_OBSOLETAS = ['zonaActivacion'] as const

/** ¿La «Activación» del efecto tiene dónde aplicarse? */
export function activacionConSentido(efecto: EfectoData): boolean {
  const coste = efecto.costo?.tipo
  if (coste === 'bloqueo_fijo') return true
  if (efecto.activacion === 'una_por_turno' && coste && coste !== 'ninguno') return true
  return efecto.activacion === 'una_por_turno' && efecto.efecto === 'modificar_regla' && efecto.reglaEnumerada === 'disparo_sin_agotar'
}

/** Parche (`undefined`) que quita los campos que NO pertenecen a `efecto`, para pasarlo al `update` del formulario. */
export function camposAjenosVacios(efecto: EfectoData['efecto']): Partial<EfectoData> {
  const parche: Record<string, undefined> = {}
  for (const [campo, duenos] of CAMPO_DE_EFECTO) {
    if (!efecto || !duenos.includes(efecto)) parche[campo] = undefined
  }
  return parche as Partial<EfectoData>
}

/**
 * El efecto sin sus restos: campos de OTROS efectos, claves que ya no existen, un `costo` sin `tipo` (a medias o vacío:
 * el motor lo ignora, pero estorba) y un debuff con magnitudes negativas (la convención es positiva: «pierde 1 de ATQ» →
 * ATQ: 1; el motor trata ambos signos igual). Un efecto sin `efecto` raíz (los tramos definen los suyos) conserva sus
 * campos de efecto. Devuelve el MISMO objeto si no hay nada que limpiar.
 */
export function limpiarCamposAjenos(efecto: EfectoData): EfectoData {
  const limpio = { ...efecto } as EfectoData & Record<string, unknown>
  let cambio = false

  if (efecto.efecto) {
    for (const [campo, duenos] of CAMPO_DE_EFECTO) {
      if (efecto[campo] !== undefined && !duenos.includes(efecto.efecto)) {
        delete limpio[campo]
        cambio = true
      }
    }
  }
  for (const clave of CLAVES_OBSOLETAS) {
    if (clave in efecto) {
      delete limpio[clave]
      cambio = true
    }
  }
  if (efecto.costo && !efecto.costo.tipo) {
    delete limpio.costo
    cambio = true
  }
  // «Una vez por turno» se decide por el COSTE (no por el efecto): con un bloqueo fijo (las dos activaciones) o con cualquier otro
  // coste (solo «una por turno»). Sin coste solo lo conserva la regla enumerada `disparo_sin_agotar` («por Campeón»).
  if (efecto.activacion !== undefined && !activacionConSentido(efecto)) {
    delete limpio.activacion
    cambio = true
  }
  if (efecto.efecto === 'debuff' && limpio.stats) {
    const valores = [limpio.stats.ATQ, limpio.stats.RES].filter((v): v is number => !!v)
    if (valores.length > 0 && valores.every((v) => v < 0)) {
      limpio.stats = {
        ...(limpio.stats.ATQ ? { ATQ: Math.abs(limpio.stats.ATQ) } : {}),
        ...(limpio.stats.RES ? { RES: Math.abs(limpio.stats.RES) } : {}),
      }
      cambio = true
    }
  }
  return cambio ? limpio : efecto
}

/** La carta con todos sus efectos (y el de Comandante) sin restos. Mismo objeto si no hay nada que limpiar. */
export function limpiarEfectosDeCarta(card: AnyCard): AnyCard {
  const conEfectos = card as AnyCard & { efectos?: EfectoData[]; efectoComandante?: EfectoData | EfectoData[] }
  let cambio = false
  const efectos = conEfectos.efectos?.map((e) => {
    const limpio = limpiarCamposAjenos(e)
    if (limpio !== e) cambio = true
    return limpio
  })
  // Un objeto sigue siendo objeto y un arreglo sigue siendo arreglo (la forma no cambia al limpiar)
  const original = conEfectos.efectoComandante
  let comandante: EfectoData | EfectoData[] | undefined
  if (Array.isArray(original)) {
    const limpios = original.map(limpiarCamposAjenos)
    const cambioComandante = limpios.some((l, i) => l !== original[i])
    if (cambioComandante) cambio = true
    comandante = cambioComandante ? limpios : original
  } else if (original) {
    comandante = limpiarCamposAjenos(original)
    if (comandante !== original) cambio = true
  }
  if (!cambio) return card
  return { ...card, ...(efectos ? { efectos } : {}), ...(comandante ? { efectoComandante: comandante } : {}) } as AnyCard
}
