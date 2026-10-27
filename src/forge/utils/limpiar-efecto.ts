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

/** Parche (`undefined`) que quita los campos que NO pertenecen a `efecto`, para pasarlo al `update` del formulario. */
export function camposAjenosVacios(efecto: EfectoData['efecto']): Partial<EfectoData> {
  const parche: Record<string, undefined> = {}
  for (const [campo, duenos] of CAMPO_DE_EFECTO) {
    if (!efecto || !duenos.includes(efecto)) parche[campo] = undefined
  }
  return parche as Partial<EfectoData>
}

/**
 * El efecto sin los campos de OTROS efectos. Un efecto sin `efecto` raíz (los tramos definen los suyos) no se toca.
 * Devuelve el MISMO objeto si no hay nada que limpiar.
 */
export function limpiarCamposAjenos(efecto: EfectoData): EfectoData {
  if (!efecto.efecto) return efecto
  const sobrantes = CAMPO_DE_EFECTO.filter(([campo, duenos]) => efecto[campo] !== undefined && !duenos.includes(efecto.efecto as string))
  if (sobrantes.length === 0) return efecto
  const limpio = { ...efecto }
  for (const [campo] of sobrantes) delete limpio[campo]
  return limpio
}

/** La carta con todos sus efectos (y el de Comandante) sin campos de otros efectos. Mismo objeto si no hay nada que limpiar. */
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
