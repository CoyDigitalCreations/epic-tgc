/**
 * Registro de handlers por cardId — FASE 2: SIN handlers.
 *
 * Todos los efectos se resuelven desde el JSON (PrimerColeccionEfectos.json):
 * - Auras → modificadoresJSONDe (Fase 1)
 * - Hechizos sin trigger → al jugar mística / activar Arcana (Fase 2a)
 * - block_ether → crearOpcionBloqueo (Fase 2a, data-driven)
 * - invocar_y_equipar → case en effectInterpreter (Fase 2a)
 * - Condiciones de Arcana → condicionCumple (Fase 2a)
 * - Pasivo 1A → phases.ts lee Éteres en 1A con block_ether (Fase 2a)
 *
 * Se mantiene la función como punto de extensión para infraestructura de
 * dispatch en tests (registrarEfecto sigue disponible para probes).
 */
export function registrarEfectos(): void {
  // Intencionalmente vacío — cero handlers por cardId.
}
