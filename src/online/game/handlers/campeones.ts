/**
 * Handlers de efectos de CAMPEONES (ADR-21/28): al-invocar (Aurora control
 * prestado, Ragnar destruir), al-atacar (Vaela, Kael), al-matar-en-combate
 * (Draven), auras de campo en statsDe (Isolde, Thane, Elena, Marek),
 * Transmutar de Mira y targeting con Protector (ADR-24).
 *
 * C1 (esqueleto): la estructura queda definida; los handlers reales se registran
 * en el commit C3 (campeones.test.ts RED → GREEN).
 */
export function registrarEfectosCampeones(): void {
  // C3: al-invocar (FB-010 Aurora, DS-001 Ragnar), al-atacar (FB-011 Vaela,
  // DS-011 Kael), al-matar-en-combate (DS-012 Draven), auras de campo
  // (FB-014 Isolde, DS-014 Thane, FB-015 Elena, DS-015 Marek), Transmutar (FB-012).
}
