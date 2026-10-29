/**
 * perfilApi — perfil del jugador (`eter.profiles`: nombre visible). Lectura y edición de la fila propia, que permite la RLS.
 */
import { getSupabase } from './supabase'
import { asegurarSesion } from './matchApi'

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
