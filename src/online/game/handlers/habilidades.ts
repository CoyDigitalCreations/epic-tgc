/**
 * Handlers de HABILIDADES ACTIVAS (ADR-28): coste "(bloqueado)" con aura
 * mientras el Éter siga en eterBloqueado (Aurora FB-010, Ragnar DS-001,
 * Cassandra FB-016, Korr DS-016) y "paga 1 Éter y agota" con 1/turno
 * (usosEsteTurno): Seraphina FB-013, Nymeria FB-017, Varek DS-013, Vorlag DS-017.
 *
 * C1 (esqueleto): la estructura queda definida; los handlers reales se registran
 * en el commit C4 (habilidades.test.ts RED → GREEN).
 */
export function registrarEfectosHabilidades(): void {
  // C4: activar_habilidad + coste bloqueado (auras continuas) + 1/turno.
}
