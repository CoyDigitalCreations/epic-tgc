import type { GameState, PlayerId } from './types'
import { cadenaActiva } from './chain'

/**
 * Proyección de visibilidad 6.2: devuelve una COPIA del estado donde cada
 * instancia oculta su cardId según quién la ve. Nunca muta el original.
 *
 * Visibles para todos: Campeones (2B-2F), Místicas/Tácticas (3A-3C),
 * Combates (3D-3F), Éteres (1A/2A), Cementerio (2G), Exilio (1G).
 * Opacas: mano rival, mazos (3G, propio Y rival — el orden es secreto),
 * Arcanas rivales (3D-3F boca abajo), Vínculos rivales (4A-4F boca abajo).
 * El dueño SÍ ve sus propias Arcanas y Vínculos (necesita conocerlos para
 * activarlos; el rival no).
 * Excepciones C4 (6.2): la PILA de la cadena 9.6 es visible a ambos, y los
 * Vínculos rivales destruidos por Ruptura (bocaArriba, §5.5) también.
 */
export function visibleState(state: GameState, playerId: PlayerId): GameState {
  const v = structuredClone(state)
  const rival: PlayerId = playerId === 'A' ? 'B' : 'A'
  const ocultar = new Set<string>()

  // Mazos: opacos para todos (3G boca abajo, ni el dueño ve el orden)
  for (const p of ['A', 'B'] as PlayerId[]) {
    for (const id of v.players[p].mazo) ocultar.add(id)
  }
  // Mano rival
  for (const id of v.players[rival].mano) ocultar.add(id)
  // Arcanas rivales (boca abajo) y Vínculos rivales boca abajo — los Vínculos
  // destruidos por Ruptura (bocaArriba) permanecen visibles (§5.5)
  for (const id of v.players[rival].campo.arcanasCombate) if (id) ocultar.add(id)
  for (const id of v.players[rival].vinculos) if (id && !v.instances[id]?.bocaArriba) ocultar.add(id)

  // Pila de la cadena (6.2): las cartas respondidas son visibles a ambos
  // (cadena única F5a: de combate o global)
  const pila = cadenaActiva(v)?.pila ?? []
  for (const id of pila) ocultar.delete(id)
  // F5b: el opener (fondo de la pila) también es público — p.ej. una Arcana rival recién activada
  const opener = cadenaActiva(v)?.opener
  if (opener) ocultar.delete(opener.cardInstanceId)
  // F5d-1: el opener ya declarado (aún sin ventana, esperando objetivos) tampoco se oculta
  const enEleccion = v.declaracionEnEleccion?.opener
  if (enEleccion) ocultar.delete(enEleccion.cardInstanceId)

  // Búsqueda de mazo (C3/D1): mientras un pendiente de elegir_objetivo espera
  // respuesta del jugador, sus cartas opción se muestran — necesita VER qué
  // cartas puede elegir (misma lógica que la pila de la cadena: la visibilidad
  // cubre lo necesario para decidir). El resto del mazo sigue opaco.
  const pendiente = v.objetivosPendientes?.[0]
  if (pendiente && pendiente.jugador === playerId) {
    for (const id of pendiente.opciones) ocultar.delete(id)
  }

  for (const id of ocultar) {
    const inst = v.instances[id]
    if (inst) inst.cardId = null
  }
  return v
}
