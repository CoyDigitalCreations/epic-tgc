/**
 * adminApi — acceso de administración al Card-Maker.
 *
 * La contraseña la guarda Supabase Auth (hash en auth.users); aquí solo se inicia y se cierra sesión y se pregunta si esa sesión es de
 * un administrador (`eter.es_admin()`, que lee la lista `eter.admins`). Esta pantalla es solo comodidad: lo que protege las cartas
 * custom es la RLS de `eter.custom_cards` (solo admins escriben), no el hecho de ver o no el formulario.
 */
import { getSupabase } from '../../online/backend/supabase'

export type EstadoAdmin =
  /** Sin Supabase configurado (desarrollo local): no hay a dónde subir nada, la pantalla no bloquea. */
  | 'sin-supabase'
  /** Sin sesión, o con la sesión anónima de jugar. */
  | 'no-sesion'
  /** Hay una cuenta (p. ej. de Google) pero no está en la lista de administradores. */
  | 'no-admin'
  | 'admin'

/**
 * Dominio con el que se completa un usuario escrito sin «@». Es el dominio reservado `example.com` (RFC 2606): un correo de
 * recuperación a esa dirección no llega a nadie, así que nadie puede apropiarse de la cuenta pidiéndolo.
 */
export const DOMINIO_ADMIN = 'example.com'

/** Correo con el que se inicia sesión: lo escrito tal cual si ya trae «@», o `usuario@example.com`. */
export function correoDeUsuario(usuario: string): string {
  const limpio = usuario.trim().toLowerCase()
  return limpio.includes('@') ? limpio : `${limpio}@${DOMINIO_ADMIN}`
}

/** Qué es la sesión actual respecto al Card-Maker. */
export async function estadoAdmin(): Promise<EstadoAdmin> {
  const supabase = getSupabase()
  if (!supabase) return 'sin-supabase'
  const { data } = await supabase.auth.getSession()
  const usuario = data.session?.user
  if (!usuario || usuario.is_anonymous) return 'no-sesion'
  const { data: esAdmin, error } = await supabase.schema('eter').rpc('es_admin')
  // Token caducado o usuario borrado: se trata como sin sesión para que pida entrar de nuevo
  if (error) return 'no-sesion'
  return esAdmin === true ? 'admin' : 'no-admin'
}

/** Inicia sesión con usuario y contraseña. Lanza un mensaje genérico: no revela si el usuario existe. */
export async function entrarComoAdmin(usuario: string, contrasena: string): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no está configurado.')
  if (!usuario.trim() || !contrasena) throw new Error('Escribe tu usuario y tu contraseña.')
  const { error } = await supabase.auth.signInWithPassword({ email: correoDeUsuario(usuario), password: contrasena })
  if (error) throw new Error('Usuario o contraseña incorrectos.')
}

/**
 * Inicia sesión de administración con Google y vuelve a la misma pantalla (Card-Maker o Tablero). Que la cuenta sea administradora no
 * lo decide Google: lo decide `eter.admins` (`estadoAdmin`). La dirección de vuelta debe estar en las URL de redirección de Supabase.
 */
export async function entrarAdminConGoogle(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) throw new Error('Supabase no está configurado.')
  const volver = `${window.location.origin}${window.location.pathname}`
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: volver } })
  if (error) throw new Error('No se pudo iniciar sesión con Google.')
}

/** Cierra la sesión de este navegador (las partidas vuelven a abrir una sesión anónima nueva). */
export async function salirDeAdmin(): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  await supabase.auth.signOut({ scope: 'local' })
}
