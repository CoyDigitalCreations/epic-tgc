/**
 * customCardsApi — Cliente HTTP para la tabla eter.custom_cards.
 *
 * Las cartas custom del Forge se suben aquí para que estén disponibles
 * en partidas JvJ. La Edge Function las carga al crear/unirse a salas.
 *
 * RLS: INSERT solo las propias (created_by = auth.uid()), SELECT todas.
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
    const userId = data.session?.user?.id
    if (!userId) return
    await supabase
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
      .from(TABLE)
      .select('definition')
    if (!data) return []
    return data.map((row) => row.definition as AnyCard)
  } catch {
    return []
  }
}
