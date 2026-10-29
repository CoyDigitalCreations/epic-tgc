/**
 * mazosNube — mazos personalizados guardados en la cuenta (tabla `eter.decks`, RLS por dueño).
 *
 * El store local (`useMazosStore`) sigue siendo la fuente que lee la UI, así el modo vs bot y el editor funcionan sin red.
 * Esto es el espejo en la nube: todo es "mejor esfuerzo" (un fallo de red no rompe nada, el mazo sigue guardado en el
 * navegador y se vuelve a subir en la próxima sincronización). Sin Supabase configurado, todo es no-op.
 */
import { getSupabase } from './supabase'
import { asegurarSesion } from './matchApi'
import type { MazoPersonalizado } from '../useMazosStore'

const TABLA = 'decks'

interface FilaMazo {
  id: string
  name: string
  cards: string[]
}

const aMazo = (f: FilaMazo): MazoPersonalizado => ({ id: f.id, nombre: f.name, cardIds: f.cards })

/** El cliente de `eter`: el schema no es el público, así que se pide explícitamente. */
function tabla() {
  const supabase = getSupabase()
  return supabase ? supabase.schema('eter').from(TABLA) : null
}

/** Crea o actualiza un mazo en la nube. Devuelve true si quedó guardado. */
export async function subirMazo(mazo: MazoPersonalizado): Promise<boolean> {
  try {
    if (!tabla()) return false
    const ownerId = await asegurarSesion()
    const { error } = await tabla()!.upsert({ id: mazo.id, owner_id: ownerId, name: mazo.nombre, cards: mazo.cardIds })
    if (error) console.warn('[mazos] no se pudo guardar en la nube:', error.message)
    return !error
  } catch (e) {
    console.warn('[mazos] sin conexión con la nube:', e instanceof Error ? e.message : e)
    return false
  }
}

/** Borra un mazo de la nube. */
export async function borrarMazoNube(id: string): Promise<boolean> {
  try {
    if (!tabla()) return false
    await asegurarSesion()
    const { error } = await tabla()!.delete().eq('id', id)
    if (error) console.warn('[mazos] no se pudo borrar en la nube:', error.message)
    return !error
  } catch {
    return false
  }
}

/** Mazos de la cuenta; null si no hay nube o falló la lectura (distinto de "no tiene ninguno": []). */
export async function listarMazosNube(): Promise<MazoPersonalizado[] | null> {
  try {
    if (!tabla()) return null
    await asegurarSesion()
    const { data, error } = await tabla()!.select('id,name,cards').order('created_at', { ascending: true })
    if (error) {
      console.warn('[mazos] no se pudo leer la nube:', error.message)
      return null
    }
    return (data as FilaMazo[]).map(aMazo)
  } catch {
    return null
  }
}

export interface PlanSincronizacion {
  /** Mazos que existen aquí y no en la nube: hay que subirlos. */
  subir: MazoPersonalizado[]
  /** Lista final para el store local: los de la nube mandan sobre los locales con el mismo id. */
  resultado: MazoPersonalizado[]
}

/**
 * Reconciliación pura (sin red): une los mazos locales con los de la nube. Con el mismo id gana la nube (es lo último que
 * se guardó desde cualquier dispositivo); los que solo existen en un lado se conservan y los locales sin nube se suben.
 * El tope de 5 lo respeta la nube al subir; aquí los de la nube van primero para que no los desplace un mazo local.
 */
export function planificarSincronizacion(locales: MazoPersonalizado[], nube: MazoPersonalizado[]): PlanSincronizacion {
  const idsNube = new Set(nube.map((m) => m.id))
  const soloLocales = locales.filter((m) => !idsNube.has(m.id))
  return { subir: soloLocales, resultado: [...nube, ...soloLocales] }
}
