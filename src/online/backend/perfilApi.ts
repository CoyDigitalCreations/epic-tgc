/**
 * perfilApi — perfil del jugador (`eter.profiles`: nombre visible). Lectura y edición de la fila propia, que permite la RLS.
 */
import { getSupabase } from './supabase'
import { olvidarSesionVerificada, usuarioConSesion } from './matchApi'
import { olvidarPartida } from '../lobby/partidaGuardada'
import { useMazosStore } from '../useMazosStore'

export const NOMBRE_MAX = 24

export interface Perfil {
  id: string
  nombre: string
  email: string | null
}

/** Nombre limpio para guardar, o el motivo por el que no vale. */
export function validarNombre(entrada: string): { ok: true; nombre: string } | { ok: false; error: string } {
  const nombre = entrada.replace(/\s+/g, ' ').trim()
  if (!nombre) return { ok: false, error: 'El nombre no puede estar vacío.' }
  if ([...nombre].length > NOMBRE_MAX) return { ok: false, error: `Máximo ${NOMBRE_MAX} caracteres.` }
  return { ok: true, nombre }
}

/** Perfil de la cuenta con sesión. Null si es invitado (sin cuenta, sin perfil) o no hay Supabase configurado. */
export async function leerPerfil(): Promise<Perfil | null> {
  const supabase = getSupabase()
  if (!supabase) return null
  const id = await usuarioConSesion()
  if (!id) return null
  const { data: sesion } = await supabase.auth.getUser()
  const { data, error } = await supabase.schema('eter').from('profiles').select('display_name').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return {
    id,
    nombre: (data?.display_name as string | null) ?? 'Jugador',
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

/**
 * Entra con la cuenta de Google (crea el perfil la primera vez) y vuelve a `volverA`, por defecto la pantalla de perfil. Los mazos de
 * este navegador pasan a la cuenta al sincronizar (hasta el tope de 5, que pone la base). La dirección de vuelta debe estar en las URL
 * de redirección de Supabase.
 */
export async function entrarConGoogle(volverA = '/epiconline/perfil'): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no configurado')
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${window.location.origin}${volverA}` } })
  if (error) throw new Error(mensajeDeAuth(error.message))
}

/** Los errores de Auth llegan en inglés y técnicos: el que el jugador puede encontrar, en claro. */
export function mensajeDeAuth(mensaje: string): string {
  if (/provider is not enabled|unsupported provider/i.test(mensaje)) return 'El acceso con Google aún no está activado en el servidor.'
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
