/**
 * Reversos de carta que puede elegir el jugador. El índice es lo que se guarda (`eter.profiles.dorso`, CHECK 0-4): si se añade o se
 * reordena un patrón hay que mantenerlo en sincronía con esa restricción y con las cartas ya elegidas.
 */
export const DORSOS = [
  { id: 0, nombre: 'Retícula del Eje', descripcion: 'Rombos entrelazados' },
  { id: 1, nombre: 'Escamas', descripcion: 'Arcos que se solapan' },
  { id: 2, nombre: 'Marea', descripcion: 'Olas en reposo' },
  { id: 3, nombre: 'Cielo estrellado', descripcion: 'Estrellas dispersas' },
  { id: 4, nombre: 'Panal', descripcion: 'Celdas hexagonales' },
] as const

export type DorsoId = number

export const DORSO_INICIAL: DorsoId = 0

/** Un valor desconocido (versión vieja, dato corrupto, otra fuente) cae al reverso inicial en vez de romper el dibujo. */
export function normalizarDorso(valor: unknown): DorsoId {
  return typeof valor === 'number' && Number.isInteger(valor) && valor >= 0 && valor < DORSOS.length ? valor : DORSO_INICIAL
}

/** Reverso del rival en una partida contra el bot: uno de los 5 o «auto». */
export type DorsoBotElegido = 'auto' | DorsoId

/** Cualquier valor que no sea «auto» ni un reverso válido vuelve a «auto». */
export function normalizarDorsoBot(valor: unknown): DorsoBotElegido {
  return valor === 'auto' ? 'auto' : typeof valor === 'number' && normalizarDorso(valor) === valor ? valor : 'auto'
}

/**
 * Reverso que lleva el bot. Con «auto» es SIEMPRE distinto al tuyo (para distinguir de un vistazo de quién es cada carta oculta) y
 * cambia con la semilla, así cada partida nueva puede estrenar uno. Con una elección explícita se respeta tal cual, incluso igual al tuyo.
 */
export function resolverDorsoBot(eleccion: DorsoBotElegido, propio: DorsoId, semilla: number): DorsoId {
  if (eleccion !== 'auto') return eleccion
  const otros = DORSOS.length - 1
  const salto = 1 + (((Math.trunc(semilla) % otros) + otros) % otros)
  return (propio + salto) % DORSOS.length
}
