/**
 * Handlers de efectos de ÉTER (ADR-25): auras derivadas por zona (2A/1A/bloqueado)
 * evaluadas en statsDe + gatillos al pagar (variantePago=Gatillo) en aplicarPago.
 *
 * C1 (esqueleto): la estructura queda definida; los handlers reales se registran
 * en el commit C2 (eteres.test.ts RED → GREEN).
 */
export function registrarEfectosEteres(): void {
  // C2: efectoReserva 2A (FB-001 +1ATQ propios, DS-002 -1ATQ rivales),
  // efectoBloqueo (FB-007/DS-008 +2/+2, FB-008 Inmortal, DS-009 Indestructible,
  // FB-009 +1RES, DS-010 +1ATQ), Pasivo 1A (FB-005/DS-006),
  // gatillos al-pagar-eter (FB-003, FB-004/DS-005, FB-006/DS-007, DS-004).
}
