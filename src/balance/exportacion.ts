import type { Ajuste, StatsAjuste } from './ajuste'
import { CONFIG_V1 } from './config'
import type { ConfigBalance } from './tipos'

export interface CambioExportado {
  id: string
  antes: StatsAjuste
  despues: StatsAjuste
  motivo: string
}

export interface ExportacionBalance {
  version: string
  cambios: CambioExportado[]
}

const stats = (s: StatsAjuste): StatsAjuste => ({ poder: s.poder, resistencia: s.resistencia })

/**
 * Arma el contrato de exportación: solo lo que cambia, ordenado por id y con las
 * claves en orden fijo. No lleva fechas, así que mismos datos y config dan la
 * misma salida.
 */
export function aExportacion(ajustes: readonly Ajuste[], cfg: ConfigBalance = CONFIG_V1): ExportacionBalance {
  const cambios = ajustes
    .filter((a) => a.antes.poder !== a.despues.poder || a.antes.resistencia !== a.despues.resistencia)
    .map((a): CambioExportado => ({ id: a.id, antes: stats(a.antes), despues: stats(a.despues), motivo: a.motivo }))
    .sort((a, b) => a.id.localeCompare(b.id, 'es'))
  return { version: cfg.version, cambios }
}

/** Texto JSON de la exportación, con sangría de dos espacios. */
export function aJson(ajustes: readonly Ajuste[], cfg: ConfigBalance = CONFIG_V1): string {
  return JSON.stringify(aExportacion(ajustes, cfg), null, cfg.exportacion.sangria)
}
