/**
 * Inactividad en partidas PvP: quien debe actuar y no lo hace en `LIMITE_INACTIVIDAD_MS` pierde por abandono.
 * El servidor lo evalúa de forma perezosa (al consultar `state` o recibir `act`), contra `updated_at` de la partida,
 * que se actualiza con cada acción persistida. Sin cron: el rival que espera consulta cada pocos segundos.
 */
export const LIMITE_INACTIVIDAD_MS = 3 * 60 * 1000

/** ¿Pasó el límite desde la última actividad? Una fecha ausente o ilegible NUNCA expira (no se castiga lo que no se puede medir). */
export function inactividadExpirada(ultimaActividad: string | null | undefined, ahora: number, limiteMs: number = LIMITE_INACTIVIDAD_MS): boolean {
  if (!ultimaActividad) return false
  const desde = Date.parse(ultimaActividad)
  if (Number.isNaN(desde)) return false
  return ahora - desde > limiteMs
}
