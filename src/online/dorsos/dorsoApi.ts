/**
 * dorsoApi — el reverso de cartas que elige el jugador.
 *
 * La verdad vive en `eter.profiles.dorso` (así lo ve el rival y viaja entre dispositivos); en este navegador se guarda además una
 * copia en localStorage para pintar al instante, en las partidas contra el bot y sin conexión. El rival lo lee con la función SQL
 * `eter.dorsos_de_partida`, que solo contesta a quien juega esa partida.
 */
import { usuarioConSesion } from '../backend/matchApi'
import { getSupabase } from '../backend/supabase'
import type { PlayerId } from '../game'
import type { DorsosPorAsiento } from './contexto'
import { DORSO_INICIAL, normalizarDorso, normalizarDorsoBot } from './dorsos'
import type { DorsoBotElegido, DorsoId } from './dorsos'

const CLAVE_LOCAL = 'epic.dorso'

/** Copia local (sin sesión ni red). Si el almacenamiento no está disponible, el reverso inicial. */
export function leerDorsoLocal(): DorsoId {
  try {
    const bruto = window.localStorage.getItem(CLAVE_LOCAL)
    return bruto === null ? DORSO_INICIAL : normalizarDorso(Number(bruto))
  } catch {
    return DORSO_INICIAL
  }
}

export function guardarDorsoLocal(id: DorsoId): void {
  try {
    window.localStorage.setItem(CLAVE_LOCAL, String(normalizarDorso(id)))
  } catch {
    // sin almacenamiento (modo privado): la elección vale solo para esta sesión de la página
  }
}

const CLAVE_BOT = 'epic.dorso-bot'

/** Reverso elegido para el bot (solo existe en este navegador: el bot no es un jugador de la base). */
export function leerDorsoBotLocal(): DorsoBotElegido {
  try {
    const bruto = window.localStorage.getItem(CLAVE_BOT)
    return bruto === null || bruto === 'auto' ? 'auto' : normalizarDorsoBot(Number(bruto))
  } catch {
    return 'auto'
  }
}

export function guardarDorsoBotLocal(eleccion: DorsoBotElegido): void {
  try {
    window.localStorage.setItem(CLAVE_BOT, String(normalizarDorsoBot(eleccion)))
  } catch {
    // sin almacenamiento: vale para esta sesión de la página
  }
}

/** Reverso guardado en el perfil de la cuenta; null si es invitado, no hay Supabase o no se pudo leer. */
export async function leerDorsoPerfil(): Promise<DorsoId | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const id = await usuarioConSesion()
    if (!id) return null // invitado: sin perfil, vale el reverso de este navegador
    const { data, error } = await supabase.schema('eter').from('profiles').select('dorso').eq('id', id).maybeSingle()
    if (error || !data) return null
    return normalizarDorso(data.dorso)
  } catch {
    return null
  }
}

/**
 * Elige el reverso: se guarda al instante en este navegador y, con una cuenta de Google, en el perfil (para que lo vea el rival).
 * Lanza si falla el guardado en el perfil; la copia local ya quedó hecha.
 */
export async function guardarDorso(id: DorsoId): Promise<void> {
  const valido = normalizarDorso(id)
  guardarDorsoLocal(valido)
  const supabase = getSupabase()
  if (!supabase) return
  const usuario = await usuarioConSesion()
  if (!usuario) return // invitado: el reverso queda solo en este navegador
  const { error } = await supabase.schema('eter').from('profiles').update({ dorso: valido }).eq('id', usuario)
  if (error) throw new Error(error.message)
}

/** Reversos de los dos asientos de una partida; null si no se pudo saber (sin Supabase, sin ser jugador de esa partida, error). */
export async function dorsosDePartida(gameId: string): Promise<DorsosPorAsiento | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  try {
    const { data, error } = await supabase.schema('eter').rpc('dorsos_de_partida', { p_game: gameId })
    if (error || !data || typeof data !== 'object') return null
    const v = data as Partial<Record<PlayerId, unknown>>
    return { A: normalizarDorso(v.A), B: normalizarDorso(v.B) }
  } catch {
    return null
  }
}
