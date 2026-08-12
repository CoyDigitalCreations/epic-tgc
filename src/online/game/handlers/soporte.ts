/**
 * Handlers de SOPORTE (ADR-26): Místicas one-shot (FB-019/020, DS-019/020),
 * Tácticas con duración (FB-021/022, DS-021/022), Arcanas condicionales
 * (FB-023, DS-023) y Combates trampa en el turno del rival (FB-024, DS-024),
 * incluida la cadena 9.6 (al-resolver-cadena).
 *
 * C1 (esqueleto): la estructura queda definida; los handlers reales se registran
 * en el commit C5 (soporte.test.ts RED → GREEN).
 */
export function registrarEfectosSoporte(): void {
  // C5: al-jugar-mistica, Tácticas por duración, Arcanas inicio-choque,
  // activar_combate (turno rival) y al-resolver-cadena.
}
