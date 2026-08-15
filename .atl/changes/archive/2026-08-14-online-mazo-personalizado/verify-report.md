# Verification Report — online-mazo-personalizado

**Change**: online-mazo-personalizado
**Version**: proposal.md (intención y alcance) + design.md (fuente de requisitos) + tasks.md (desglose TDD)
**Mode**: Standard (TDD estricto: RED → GREEN por tarea, gate por tarea)

---

## Completeness

| Frente | Estado |
|--------|--------|
| T1 — Store `useMazosStore` (persist, tope 5, CRUD) | ✅ Implementado + 8 tests |
| T2 — Helpers en `mazos.ts` + `validarDeck` exportada | ✅ Implementado + 11 tests |
| T3 — `MazoEditor` (vista dedicada, filtros, topes, contadores) | ✅ Implementado + 9 tests |
| T4 — `OnlineApp`: retiro de integración + selector + bot determinista | ✅ Implementado + 10 tests |

Tareas completadas: T1–T4 (RED → GREEN + gate por tarea). No quedan tareas de implementación pendientes.

---

## Build & Tests Execution

**Build**: ✅ Passed — `npx tsc -b` sin errores

**Tests**: ✅ 459 passed / 0 failed (45 archivos) — `npx vitest run --no-cache` (base anterior: 436/43)

**Coverage**: ➖ No disponible (no configurado)

---

## Spec Compliance Matrix

| Requisito | Escenario | Test | Resultado |
|-----------|-----------|------|-----------|
| T1 | Agregar mazo con id slugificado | `useMazosStore.test.ts > agrega con id slugificado` | ✅ COMPLIANT |
| T1 | Dedupe de id (`-2`) | `useMazosStore.test.ts > dedupe` | ✅ COMPLIANT |
| T1 | Nombre vacío → error | `useMazosStore.test.ts > rechaza nombre vacío` | ✅ COMPLIANT |
| T1 | Tope de 5 (6º rechazado, no agrega) | `useMazosStore.test.ts > tope 5` | ✅ COMPLIANT |
| T1 | Renombrar (id estable) / actualizar / eliminar | `useMazosStore.test.ts` | ✅ COMPLIANT |
| T1 | Persistencia localStorage + rehidratación | `useMazosStore.test.ts > persiste y rehidrata` | ✅ COMPLIANT |
| T2 | `cartasDisponibles` sin colección = ALL_CARDS | `mazos.test.ts > sin colección` | ✅ COMPLIANT |
| T2 | Custom con id nuevo se agrega | `mazos.test.ts > agrega custom` | ✅ COMPLIANT |
| T2 | Custom con id de diseño NO pisa el diseño (sets puros) | `mazos.test.ts > no pisa diseño` | ✅ COMPLIANT |
| T2 | `conteosDe` 15/45/6 sobre Estásis | `mazos.test.ts > conteosDe` | ✅ COMPLIANT |
| T2 | `buildDeck` expande copias en orden estable | `mazos.test.ts > buildDeck` | ✅ COMPLIANT |
| T2 | Deck armado pasa `validarDeck` (exportada) | `mazos.test.ts > mazo armado válido` | ✅ COMPLIANT |
| T2 | `validarDeck` rechaza distribución inválida | `mazos.test.ts > inválido` | ✅ COMPLIANT |
| T3 | Contadores en cero + guardar deshabilitado | `MazoEditor.test.tsx > render inicial` | ✅ COMPLIANT |
| T3 | `+`/`−` con tope `limiteCopias` | `MazoEditor.test.tsx > no pasa de limiteCopias` | ✅ COMPLIANT |
| T3 | Filtros por tipo y texto | `MazoEditor.test.tsx > filtra por tipo/texto` | ✅ COMPLIANT |
| T3 | No guarda mazo incompleto | `MazoEditor.test.tsx > inválido` | ✅ COMPLIANT |
| T3 | Arma 66 válidos y `onGuardar` recibe cardIds | `MazoEditor.test.tsx > válido completo` | ✅ COMPLIANT |
| T3 | Edición: precarga nombre y selección | `MazoEditor.test.tsx > con inicial` + cancelar | ✅ COMPLIANT |
| T4 | Menú sin "Importar colección"/"Añadir cartas terminadas" | `OnlineApp.test.tsx > ya no ofrece` | ✅ COMPLIANT |
| T4 | Abrir editor desde el menú | `OnlineApp.test.tsx > abre el editor` | ✅ COMPLIANT |
| T4 | Volver cancela sin guardar | `OnlineApp.test.tsx > cancela` | ✅ COMPLIANT |
| T4 | Elegir custom guardado → partida arranca | `OnlineApp.test.tsx > elige custom y comienza` | ✅ COMPLIANT |
| T4 | Sets siguen presentes en el menú | `OnlineApp.test.tsx > no pisa sets` | ✅ COMPLIANT |
| T4 | Bot determinista: custom → `MAZOS[seed % 2]` | `mazos.test.ts > mazoParaBot custom` | ✅ COMPLIANT |
| T4 | Bot: set → el otro set (seed irrelevante) | `mazos.test.ts > mazoParaBot set` | ✅ COMPLIANT |

**Compliance summary**: 27/27 COMPLIANT

---

## Correctness (Static — Structural Evidence)

| Requisito | Estado | Notas |
|-----------|--------|-------|
| T1 — persist v1, partialize, storage JSON | ✅ Implementado | useMazosStore.ts (`epic-tgc-mazos-personalizados`) |
| T2 — `validarDeck` exportada | ✅ Implementado | initialState.ts (reuso en editor + arranque) |
| T2 — retiro de `armarMazoConColeccion`/`MazoConColeccion` | ✅ Implementado | mazos.ts reescrito (se eliminó el reemplazo por nombre) |
| T3 — editor con filtros, topes y contadores | ✅ Implementado | MazoEditor.tsx (vista dedicada, reemplaza el menú) |
| T4 — retiro de `importar`/`importarTerminadas` + botones/inputs | ✅ Implementado | OnlineApp.tsx reescrito |
| T4 — `registrarCartas` solo con ids custom | ✅ Implementado | OnlineApp.tsx (filtro contra ALL_CARDS: sets puros) |
| T4 — bot determinista + fallback robusto de deckA | ✅ Implementado | `mazoParaBot(seed, humano)` + `?.cardIds ?? MAZOS[0]` (fix de unhandled error del afterEach) |

---

## Coherence (Design)

| Decisión | Seguida? | Notas |
|----------|----------|-------|
| D1 — store nuevo separado del forge | ✅ Sí | useMazosStore.ts, key propia |
| D2 — exportar `validarDeck` (no moverla) | ✅ Sí | Sin dependencia game→online |
| D3 — registrar solo custom (sets puros) | ✅ Sí | Filtro `!ALL_CARDS.some(d => d.id === c.id)` |
| D4 — editor como vista dedicada | ✅ Sí | `enEditor` en OnlineApp, botón "Volver al menú" |
| D5 — persistir 66 cardIds expandidos | ✅ Sí | `MazoPersonalizado.cardIds`; reconstrucción agrupando en el editor |
| D6 — bot determinista `MAZOS[seed % 2]` | ✅ Sí | `mazoParaBot` |
| D7 — retiro total de la integración custom | ✅ Sí | Importación JSON + reemplazo por nombre eliminados (aprobado por el usuario) |

---

## Issues Found

**CRITICAL**: None

**WARNING**:
- Las cartas custom con id nuevo juegan SIN su texto de efecto (el motor registra handlers por cardId de diseño) — riesgo aceptado explícitamente por el usuario y documentado en el menú del editor. Re-integración pendiente de efectos dinámicos (fuera de alcance).

**SUGGESTION**:
- QA manual: armar un mazo completo en el editor, guardarlo, recargar (persistencia) y jugar; verificar que el bot use un set u otro según `seed % 2`.
- Un test de integración que arme el mazo completo vía UI en OnlineApp (hoy se precarga vía store; el flujo de guardado completo está cubierto en MazoEditor.test).

---

## Verdict

**PASS**

Implementación completa y verificada: 459 tests verdes + tsc limpio. Los criterios de éxito del proposal se cumplen: editor interactivo con validación 15/45/6 = 66, hasta 5 mazos persistentes, bot determinista según el tipo de mazo humano, y retiro total de la integración de cartas custom del Online (importación JSON y reemplazo por nombre). 27/27 COMPLIANT.
