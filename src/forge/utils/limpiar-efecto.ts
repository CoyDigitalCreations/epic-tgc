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
  // El formulario los muestra solo con estos efectos (`showStats` / `showKeyword` en EffectField.tsx): con cualquier otro
  // quedan escondidos y no se pueden borrar desde la UI (así quedaron el ATQ de Thane y el de Ragnar)
  ['stats', ['buff', 'debuff']],
  ['buffPerBlockedEther', ['buff', 'debuff']],
  ['keyword', ['grant_keyword']],
]

/** Claves que YA NO EXISTEN en el esquema (restos de diseños anteriores): no las lee ni el motor ni el formulario. */
const CLAVES_OBSOLETAS = ['zonaActivacion'] as const

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
  // «Una vez por turno» se decide por el COSTE (no por el efecto): solo tiene sentido con un bloqueo fijo
  if (efecto.unaVezPorTurno !== undefined && efecto.costo?.tipo !== 'bloqueo_fijo') {
    delete limpio.unaVezPorTurno
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
  const conEfectos = card as AnyCard & { efectos?: EfectoData[]; efectoComandante?: EfectoData }
  let cambio = false
  const efectos = conEfectos.efectos?.map((e) => {
    const limpio = limpiarCamposAjenos(e)
    if (limpio !== e) cambio = true
    return limpio
  })
  const comandante = conEfectos.efectoComandante ? limpiarCamposAjenos(conEfectos.efectoComandante) : undefined
  if (comandante !== conEfectos.efectoComandante) cambio = true
  if (!cambio) return card
  return { ...card, ...(efectos ? { efectos } : {}), ...(comandante ? { efectoComandante: comandante } : {}) } as AnyCard
}
