/**
 * Invariantes del motor (extraídas de __tests__/simulacion.test.ts, C4):
 * verificaciones de zona/Éter válidas para TODO estado de partida con mazo
 * estándar (66 cartas = 15 Éter + 45 Principal + 6 Vínculos). Usadas por
 * bot-combat.test.ts y simulacion.test.ts; el bot nunca debe violarlas.
 *
 * ÉTER (Fase 2 / B5 — decisión usuario 2026-10-22): la TRANSFERENCIA entre
 * jugadores es LEGAL (Capa 2: controladorDestino 'propio' — p.ej. DS-017
 * "mueve 1 Éter del rival... a TU Reserva"). Por eso la conservación del
 * Éter se verifica GLOBALMENTE (30 Éter en total, ni duplicados ni perdidos)
 * y NO "15 por jugador" — eso solo valía mientras el engine nunca transfería
 * (justamente el bug B5: controladorDestino ignorado).
 * Las cartas NO-Éter sí mantienen dueño fijo: 51 por jugador (66 − 15).
 */
import { esEter, getCardMeta } from './cards'
import type { GameState, PlayerId } from './types'

/**
 * F5h — zona única: cada instancia reside en EXACTAMENTE una zona de los jugadores
 * (mano, mazo, Cementerio, Exilio, Reserva 2A, Éter pagado 1A, slots del campo, Vínculos
 * o Éter bloqueado sobre una carta). La pila de la cadena NO es una zona: apunta a cartas
 * que siguen en el campo (o ya salieron de la mano) y no cuenta. Devuelve una violación por
 * instancia repetida, con las zonas en las que aparece (vacío = ninguna repetida).
 */
export function verificarZonaUnica(estado: GameState): string[] {
  const zonasDe = new Map<string, string[]>()
  const anotar = (id: string | null | undefined, zona: string): void => {
    if (!id) return
    const lista = zonasDe.get(id)
    if (lista) lista.push(zona)
    else zonasDe.set(id, [zona])
  }
  for (const p of ['A', 'B'] as PlayerId[]) {
    const st = estado.players[p]
    for (const id of st.mano) anotar(id, `${p}.mano`)
    for (const id of st.mazo) anotar(id, `${p}.mazo`)
    for (const id of st.cementerio) anotar(id, `${p}.cementerio`)
    for (const id of st.exilio) anotar(id, `${p}.exilio`)
    for (const id of st.eterReserva) anotar(id, `${p}.eterReserva`)
    for (const id of st.eterPagado) anotar(id, `${p}.eterPagado`)
    for (const grupo of ['campeones', 'misticasTacticas', 'arcanasCombate'] as const) {
      st.campo[grupo].forEach((id, i) => anotar(id, `${p}.campo.${grupo}[${i}]`))
    }
    st.vinculos.forEach((id, i) => anotar(id, `${p}.vinculos[${i}]`))
    for (const grupo of ['campeones', 'misticasTacticas', 'arcanasCombate'] as const) {
      for (const portador of st.campo[grupo]) {
        for (const eterId of (portador ? estado.instances[portador]?.eterBloqueado : undefined) ?? []) {
          anotar(eterId, `${p}.eterBloqueado(${portador})`)
        }
      }
    }
  }
  const violaciones: string[] = []
  for (const [id, zonas] of zonasDe) {
    if (zonas.length > 1) violaciones.push(`${id}: en ${zonas.length} zonas a la vez (${zonas.join(', ')})`)
  }
  return violaciones
}

/** Devuelve las violaciones encontradas (vacío = estado válido). */
export function verificarInvariantes(estado: GameState): string[] {
  const violaciones: string[] = verificarZonaUnica(estado)

  const esEterId = (id: string): boolean => {
    const inst = estado.instances[id]
    const meta = inst?.cardId ? getCardMeta(inst.cardId) : null
    return meta !== null && esEter(meta)
  }

  /** Éteres RESIDENTES en las zonas de `p` (2A + 1A + mano/2G/1G/mazo) + bloqueados en SU campo. */
  const eterDe = (p: PlayerId): number => {
    const st = estado.players[p]
    let n =
      st.eterReserva.filter(esEterId).length +
      st.eterPagado.filter(esEterId).length +
      st.mano.filter(esEterId).length +
      st.cementerio.filter(esEterId).length +
      st.exilio.filter(esEterId).length +
      st.mazo.filter(esEterId).length
    for (const grupo of ['campeones', 'misticasTacticas', 'arcanasCombate'] as const) {
      for (const id of st.campo[grupo]) {
        if (!id) continue
        n += estado.instances[id]?.eterBloqueado?.length ?? 0
      }
    }
    return n
  }

  /** Todas las cartas que hay en las zonas de `p` (y el Éter bloqueado sobre las de su campo), sin importar de quién son. */
  const idsEnZonasDe = (p: PlayerId): string[] => {
    const st = estado.players[p]
    const enCampo = [...st.campo.campeones, ...st.campo.misticasTacticas, ...st.campo.arcanasCombate].filter((x): x is string => x !== null)
    const bloqueados = enCampo.flatMap((id) => estado.instances[id]?.eterBloqueado ?? [])
    return [
      ...st.mano, ...st.mazo, ...st.cementerio, ...st.exilio, ...st.eterReserva, ...st.eterPagado,
      ...enCampo, ...st.vinculos.filter((x): x is string => x !== null), ...bloqueados,
    ]
  }

  /**
   * Cartas NO-Éter de `p` como DUEÑO, estén donde estén: un Campeón robado (steal_champion, legal) sigue siendo de su dueño
   * aunque esté en el campo del ladrón. Contarlas por la zona en que están daba un falso positivo (+1 al ladrón, −1 a la víctima).
   */
  const noEterDeDueno = (p: PlayerId): number =>
    [...idsEnZonasDe('A'), ...idsEnZonasDe('B')].filter((id) => !esEterId(id) && estado.instances[id]?.owner === p).length

  const eterGlobal = eterDe('A') + eterDe('B')
  if (eterGlobal !== 30) violaciones.push(`global: ${eterGlobal} Éter ≠ 30 (transferido/fuente perdida o duplicada)`)

  for (const p of ['A', 'B'] as PlayerId[]) {
    const st = estado.players[p]
    // Mano: cota de SANIDAD (nunca más que las 45 cartas del Mazo Principal).
    if (st.mano.length > 45) violaciones.push(`${p}: mano ${st.mano.length} > 45 (imposible: mazo principal = 45)`)

    // Cartas NO-Éter del jugador: 51 fijas (66 − 15) — el Éter por jugador
    // puede variar con transferencias Capa 2 (ver cabecera), el resto no.
    const noEter = noEterDeDueno(p)
    if (noEter !== 51) violaciones.push(`${p}: cartas no-Éter ${noEter} ≠ 51`)

    const campeones = st.campo.campeones.filter((x): x is string => x !== null).length
    if (campeones > 5) violaciones.push(`${p}: ${campeones} Campeones > 5`)
    const misticas = st.campo.misticasTacticas.filter((x): x is string => x !== null).length
    if (misticas > 3) violaciones.push(`${p}: ${misticas} Místicas/Tácticas > 3`)
    const arcanas = st.campo.arcanasCombate.filter((x): x is string => x !== null).length
    if (arcanas > 3) violaciones.push(`${p}: ${arcanas} Arcanas/Combates > 3`)
  }
  return violaciones
}
