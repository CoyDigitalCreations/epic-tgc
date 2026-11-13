import { ALL_CARDS as TODAS } from '../../shared/data/paquetes'

/**
 * Las 66 cartas de Estásis (FB-) y Disonancia (DS-): el pool sobre el que se calibraron los tests de balance
 * (techos de ATQ/RES, letalidad, bandas por coste, conteos). Purga (PU-) y Mutación (MU-) se suman al seed real,
 * pero esos números históricos no cambian por ellas, así que los tests de calibración usan este pool fijo.
 * Los tests que prueban el seed completo (Purga y Mutación incluidas) importan `ALL_CARDS` de `paquetes` directamente.
 */
export const ALL_CARDS = TODAS.filter((c) => c.id.startsWith('FB-') || c.id.startsWith('DS-'))
