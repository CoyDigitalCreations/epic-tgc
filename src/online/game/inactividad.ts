/**
 * Inactividad en partidas PvP: quien debe actuar y no lo hace dentro del límite de la sala pierde por abandono.
 * El servidor lo evalúa de forma perezosa (al consultar `state` o recibir `act`), contra `updated_at` de la partida,
 * que se actualiza con cada acción persistida. Sin cron: el rival que espera consulta cada pocos segundos.
 *
 * El límite lo elige quien crea la sala entre valores fijos (`LIMITES_INACTIVIDAD_S`) y queda guardado en la partida.
 */

/** Opciones que ofrece el lobby, en segundos. */
export const LIMITES_INACTIVIDAD_S = [60, 120, 180, 300, 600] as const
export type LimiteInactividadS = (typeof LIMITES_INACTIVIDAD_S)[number]

/** Límite por defecto (5 min): con 3 las partidas se cerraban demasiado rápido. */
export const LIMITE_INACTIVIDAD_DEFECTO_S: LimiteInactividadS = 300
export const LIMITE_INACTIVIDAD_MS = LIMITE_INACTIVIDAD_DEFECTO_S * 1000

export function esLimiteInactividadS(x: unknown): x is LimiteInactividadS {
  return typeof x === 'number' && (LIMITES_INACTIVIDAD_S as readonly number[]).includes(x)
}

/** ¿Pasó el límite desde la última actividad? Una fecha ausente o ilegible NUNCA expira (no se castiga lo que no se puede medir). */
export function inactividadExpirada(ultimaActividad: string | null | undefined, ahora: number, limiteMs: number = LIMITE_INACTIVIDAD_MS): boolean {
  if (!ultimaActividad) return false
  const desde = Date.parse(ultimaActividad)
  if (Number.isNaN(desde)) return false
  return ahora - desde > limiteMs
}

/** Instante (ms epoch) en que vence el plazo, o null si no se puede medir. */
export function vencimientoInactividad(ultimaActividad: string | null | undefined, limiteMs: number = LIMITE_INACTIVIDAD_MS): number | null {
  if (!ultimaActividad) return null
  const desde = Date.parse(ultimaActividad)
  return Number.isNaN(desde) ? null : desde + limiteMs
}
