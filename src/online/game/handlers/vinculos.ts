/**
 * Handlers de VÍNCULOS DESTRUIDOS (ADR-27): hook al-ser-destruido-vinculo
 * ANTES de verificar derrota (sexto Vínculo incluido) — one-shot (FB-026/027/028/030,
 * DS-026/027/028/030) y periódicos en la Alba del dueño mientras bocaArriba
 * (FB-025/029, DS-025/029). Skarn DS-018 es la excepción §5.7 (inicio-choque).
 *
 * C1 (esqueleto): la estructura queda definida; los handlers reales se registran
 * en el commit C6 (vinculos.test.ts RED → GREEN).
 */
export function registrarEfectosVinculos(): void {
  // C6: one-shot al destruirse + periódicos inicio-alba + Skarn DS-018.
}
