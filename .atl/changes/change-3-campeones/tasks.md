# Change 3 · Commit C3 — Tasks (sub-commits)

Fuente: `.atl/changes/change-3-campeones/design.md` (decisiones D1-D8). LEERLO PRIMERO.

Patrón por sub-commit: **RED → GREEN** (test que falla → implementación → test que pasa), con el archivo de tests `src/online/game/__tests__/campeones.test.ts` creciendo de a partes (un `describe` por sub-commit, TDD estricto).

Gate obligatorio ANTES de cada commit:
- `npx tsc --noEmit` → EXIT 0
- `npx vitest run --no-cache` → suite completa verde (349+ tests actuales)

GOTCHAS (críticos, del proyecto):
- NUNCA usar `vitest` con cache (`node_modules/.vite` da falsos negativos): siempre `--no-cache`.
- El gate por commit del repo: `tsc -b` + `npm test` — pero para iterar usar `npx vitest run --no-cache src/online/game/__tests__/campeones.test.ts`.
- Helpers de test copiar de `eteres.test.ts` (`estadoMinimo`, `conCampeon`, `conEterReserva`, `crearCtx` — `ctx.next()` = 0).
- Los tests se ejecutan con docblock `// @vitest-environment node`.
- NO hardcodear cardIds en el motor: usar `keywordsDe`/`tieneKeyword` para keywords (Transmutar, Protector, etc.).

## C3a — Infraestructura de targeting + dispatch de triggers
- types.ts: `objetivosPendientes` (cola FIFO, D1: shape `{ jugador, instId, trigger, opciones }`) + acciones `elegir_objetivo` en la union.
- actions.ts: dispatch `al-invocar` post-`carta_invocada` (D5); `validarElegirObjetivo` + `ejecutarElegirObjetivo` (D1 — resolución por re-dispatch con `contextoUso: 'objetivo-elegido'`, patrón elegir_opcion).
- combat.ts: dispatch `al-atacar` (D5) y `al-matar-en-combate` en resolverCombate con killerId/victimaId (D5).
- replacements.ts: `destruirCarta` retorna boolean (aditivo).
- validActions.ts: exponer `elegir_objetivo`.
- events.ts: sin eventos nuevos (reusar existentes).
- Tests (RED→GREEN):
  1. dispatch `al-invocar` dispara handlers registrados al invocar por `applyAction` (registro directo de un handler de prueba, patrón efectos.test.ts:112).
  2. dispatch `al-atacar` dispara con `instancias = atacanteIds` al declarar ataque.
  3. dispatch `al-matar-en-combate` dispara con killerId/victimaId por víctima confirmada (NO si Indestructible previene).
  4. `elegir_objetivo`: valida frente de cola + opciones; resuelve y pasa al siguiente pendiente.
- Commit mensaje: `feat(online): dispatch triggers al-invocar/al-atacar/al-matar-en-combate + elegir_objetivo`

## C3b — Auras de campo
- efectos.ts: `registrarAuraCampo` + scan en `aurasDe` (D6); `objetivosCampeonesValidos` con Protector (D3) — esta función se usa en C3c.
- handlers/campeones.ts: registrar auras FB-014/DS-014/FB-015/DS-015 (D6).
- combat.ts:13-14: actualizar comentario "pre-auras" (ahora el combate ve auras de campo).
- Tests (RED→GREEN):
  1. Isolde: +1/+1 a OTRO campeón del mismo jugador; NO a sí misma; no al rival.
  2. Thane: +1 ATQ a otros.
  3. Elena: +1 ATQ propio si `eterBloqueado.length >= 1`.
  4. Marek: +1 ATQ propio si un campeón del rival tiene éter bloqueado.
  5. `objetivosCampeonesValidos`: sin Protector → todos; con Protector → solo Protectores.
- Commit: `feat(online): auras de campo + objetivosCampeonesValidos con Protector`

## C3c — Handlers de campeones con targeting (Aurora, Ragnar, Vaela, Kael, Draven) ✅
- [x] handlers/campeones.ts: registros reales (D7): al-invocar (FB-010, DS-001), al-atacar (FB-011, DS-011), al-matar-en-combate (DS-012).
- [x] Resolución de objetivos: dispatch en `ejecutarElegirObjetivo` por `instId` → handler de resolución registrado (patrón de registro por trigger + cardId).
- [x] Tests (RED→GREEN): 8 tests en `describe('C3c: handlers de campeones con targeting (D7)')` — suite 363 → 371, tsc EXIT 0, snapshot intacto.
- [x] Ajustes de diseño descubiertos en GREEN:
  - `resolverCombate` despacha `[victimaId, killerId]` (D5 decía `[victimaId]`): los handlers keyed por el cardId del ASESINO (Draven) deben disparar.
  - `moverAlCementerio` barre AMBOS campos (D2): con control prestado la instancia muere desde el campo del rival; 2G = dueño.
- Commit: `feat(online): handlers de campeones (al-invocar/al-atacar/al-matar-en-combate)`

## C3d — Transmutar (Mira FB-012) ✅
- [x] types/actions/validActions: acción `usar_transmutar` (D4) — unión + validar + ejecutar.
- [x] Validador genérico por keyword `Transmutar` (`tieneKeyword` de combat.ts, no hardcodea FB-012): carta del activo en su campo, fase forja/choque, eterIds ⊆ eterPagado, únicos, ≤ 2.
- [x] Ejecutor: eterIds 1A → 2A (eter_reagrupado) → carta sale del campo → 2G del dueño + libera su eterBloqueado ('1A'). NO pasa por `destruirCarta` (es coste).
- [x] getValidActions: se expone SOLO con 1A disponible y variante de retorno máximo (la vacía es estrictamente dominada; el validador la acepta igual).
- [x] bot.ts: `botTonto` NO activa `usar_transmutar` (sacrifica su propia carta; consistente con elegir_ruptura → variante null). El snapshot seed-1 del contrato NO cambia.
- [x] Tests (RED→GREEN): 6 tests en `describe('C3d: Transmutar (Mira FB-012)')` — suite 371 → 377, tsc EXIT 0, snapshot intacto.
- Commit: `feat(online): transmutar de Mira (usar_transmutar)`

## Verificación final
- Suite completa `npx vitest run --no-cache` verde.
- `npx tsc --noEmit` EXIT 0.
- contract.test.ts snapshot intacto (sin eventos nuevos).
- Commit del archivo de diseño+tasks (o incluir en C3d): `.atl/changes/change-3-campeones/`
