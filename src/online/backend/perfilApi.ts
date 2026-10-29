/**
 * perfilApi — perfil del jugador (`eter.profiles`: nombre visible). Lectura y edición de la fila propia, que permite la RLS.
 */
import { getSupabase } from './supabase'
import { asegurarSesion, olvidarSesionVerificada } from './matchApi'
import { olvidarPartida } from '../lobby/partidaGuardada'
import { useMazosStore } from '../useMazosStore'

export const NOMBRE_MAX = 24

export interface Perfil {
  id: string
  nombre: string
  /** Sesión anónima (sin email enlazado): el perfil vive solo en este navegador. */
  anonimo: boolean
  email: string | null
}

/** Nombre limpio para guardar, o el motivo por el que no vale. */
export function validarNombre(entrada: string): { ok: true; nombre: string } | { ok: false; error: string } {
  const nombre = entrada.replace(/\s+/g, ' ').trim()
  if (!nombre) return { ok: false, error: 'El nombre no puede estar vacío.' }
  if ([...nombre].length > NOMBRE_MAX) return { ok: false, error: `Máximo ${NOMBRE_MAX} caracteres.` }
  return { ok: true, nombre }
}

/** Perfil de la sesión actual (la crea anónima si no hay). Null si no hay Supabase configurado. */
export async function leerPerfil(): Promise<Perfil | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const id = await asegurarSesion()
  const { data: sesion } = await supabase.auth.getUser()
  const { data, error } = await supabase.schema('eter').from('profiles').select('display_name').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return {
    id,
    nombre: (data?.display_name as string | null) ?? 'Jugador',
    anonimo: sesion.user?.is_anonymous ?? true,
    email: sesion.user?.email ?? null,
  }
}

/** Cambia el nombre visible del perfil propio. */
export async function guardarNombre(id: string, nombre: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no configurado')
  const valido = validarNombre(nombre)
  if (!valido.ok) throw new Error(valido.error)
  const { error } = await supabase.schema('eter').from('profiles').update({ display_name: valido.nombre }).eq('id', id)
  if (error) throw new Error(error.message)
}

/** A donde vuelve el navegador tras Google: la propia pantalla de perfil. */
const volverAlPerfil = () => `${window.location.origin}/epiconline/perfil`

/**
 * Enlaza la cuenta de Google a la sesión anónima actual: conserva el mismo `user.id`, así el perfil y los mazos siguen siendo
 * suyos. Redirige al navegador a Google; si esa cuenta de Google ya pertenece a otro perfil, falla (para eso está `entrarConGoogle`).
 */
export async function enlazarGoogle(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no configurado')
  await asegurarSesion()
  const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo: volverAlPerfil() } })
  if (error) throw new Error(mensajeDeAuth(error.message))
}

/**
 * Entra con una cuenta de Google que ya tiene perfil (otro navegador u otro equipo). La sesión anónima de este navegador se
 * abandona; sus mazos locales sí pasan a la cuenta al sincronizar (hasta el tope de 5, que pone la base).
 */
export async function entrarConGoogle(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no configurado')
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volverAlPerfil() } })
  if (error) throw new Error(mensajeDeAuth(error.message))
}

/** Los errores de Auth llegan en inglés y técnicos: los dos que el jugador puede encontrar, en claro. */
export function mensajeDeAuth(mensaje: string): string {
  if (/already linked|identity_already_exists/i.test(mensaje)) return 'Esa cuenta de Google ya tiene un perfil. Usa «Ya tengo cuenta» para entrar con ella.'
  if (/provider is not enabled|unsupported provider/i.test(mensaje)) return 'El acceso con Google aún no está activado en el servidor.'
  if (/manual linking/i.test(mensaje)) return 'El enlace de cuentas no está activado en el servidor.'
  return mensaje
}

/**
 * Cierra la sesión SOLO en este navegador (las de otros dispositivos siguen). Lo guardado en la cuenta no se toca; lo que este
 * navegador recordaba de ella —sus mazos y la partida a la que reconectar— se borra, para que la siguiente persona que use el
 * equipo no los herede ni los suba a su propia cuenta.
 */
export async function cerrarSesion(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no configurado')
  const { error } = await supabase.auth.signOut({ scope: 'local' })
  if (error) throw new Error(error.message)
  olvidarSesionVerificada()
  olvidarPartida()
  useMazosStore.setState({ mazosPersonalizados: [] })
}
