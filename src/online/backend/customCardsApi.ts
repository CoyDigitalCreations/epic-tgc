/**
 * customCardsApi — Cliente HTTP para la tabla eter.custom_cards.
 *
 * Las cartas custom del Forge se suben aquí para que estén disponibles
 * en partidas JvJ. La Edge Function las carga al crear/unirse a salas.
 *
 * RLS: INSERT/UPDATE/DELETE solo administradores (eter.es_admin(), ver el login del Card-Maker); SELECT todas.
 * La tabla vive en el esquema `eter`: sin `.schema('eter')` PostgREST busca en `public` y falla (antes de este arreglo la subida
 * fallaba en silencio por eso).
 */
import { getSupabase } from './supabase'
import type { AnyCard } from '../../shared/types'

const TABLE = 'custom_cards'

/** Sube o actualiza una carta custom a Supabase. Fire-and-forget (no bloquea el UI). */
export async function subirCartaCustom(card: AnyCard): Promise<void> {
  const supabase = getSupabase()
  if (!supabase) return
  // No subir imágenes inline (base64) — son pesadas y ya viven en IndexedDB
  const { imageUrl, hasImage, ...limpio } = card as AnyCard & { imageUrl?: string; hasImage?: boolean }
  void imageUrl
  void hasImage
  try {
    const { data } = await supabase.auth.getSession()
    const usuario = data.session?.user
    // Las sesiones anónimas (jugadores) no pueden escribir: ni se intenta
    if (!usuario || usuario.is_anonymous) return
    const userId = usuario.id
    await supabase
      .schema('eter')
      .from(TABLE)
      .upsert(
        {
          id: limpio.id,
          definition: limpio,
          created_by: userId,
        },
        { onConflict: 'id' },
      )
  } catch {
    // fire-and-forget: si falla, la carta sigue local
  }
}

/** Descarga todas las cartas custom de la BD (para registrar en el motor). */
export async function bajarCartasCustom(): Promise<AnyCard[]> {
  const supabase = getSupabase()
  if (!supabase) return []
  try {
    const { data } = await supabase
      .schema('eter')
      .from(TABLE)
      .select('definition')
    if (!data) return []
    return data.map((row) => row.definition as AnyCard)
  } catch {
    return []
  }
}
