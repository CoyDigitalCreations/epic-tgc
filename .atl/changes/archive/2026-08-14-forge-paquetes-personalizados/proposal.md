# Proposal: Paquetes personalizados desde el Card Maker

## Intent

Hoy los paquetes (Estásis, Disonancia) son datos estáticos en `src/shared/data/paquetes.ts`: para crear un set nuevo hay que escribir código TS. El objetivo de la sesión pasada (malinterpretado como "colecciones" A3) era **crear paquetes desde el card maker sin tocar el repo**, asignar cada carta a su paquete desde el formulario, y compartir el paquete como JSON (un tercer colaborador crea su set sin cambiar código).

## Scope

### In Scope
- **D1 — Campo "Paquete" en el formulario de carta**: `FieldDef` select en `META_FIELDS` (opciones: sin paquete + estáticos + personalizados). Inyecta automáticamente en los 7 tipos de carta. El draft hereda `paqueteId` y el save ya lo persiste.
- **D2 — Gestión de paquetes en el forge**: crear / renombrar / eliminar paquete (modal con nombre, tipo, facción, color, lore), persistidos en `userPacks` (hoy muerto: `partialize` lo excluye — fix de persistencia + bump `version: 2`).
- **D3 — CardList generalizado**: pills de paquetes dinámicos con progreso, botón "Importar" (cartas del paquete → colección activa) y filtro — unificando estáticos + `userPacks`.
- **D4 — Export/Import de paquete JSON**: exporta metadata + cartas de la colección con ese `paqueteId`; importar crea el paquete e importa sus cartas.

### Out of Scope
- Integración Supabase / juego online (MAZOS sigue unión estática `'estasis' | 'disonancia'`; fase futura).
- Handlers de motor para cartas nuevas (change 3 game-handlers).
- Modificar `scripts/generate-seed.ts` / seeds (solo sets versionados del repo).

## Capabilities

N/A — proyecto sin `openspec/`; el `design.md` es la fuente de requisitos (patrón change-4).

## Approach

1. Fix persistencia `userPacks` (`partialize` + `merge` + migrate v1→v2) y acciones CRUD de paquetes en el store.
2. `FieldDef` de `paqueteId` en `META_FIELDS` con opciones derivadas (estáticos + `userPacks`).
3. `PaqueteModal` (patrón `ColeccionModal`) para crear/renombrar.
4. CardList: getter unificado `paquetesVisibles = [...PAQUETES, ...userPacks]`; generalizar `progresoPaquete` (lookup combinado) para que el badge funcione con dinámicos.
5. `export-paquete.ts`: export/import JSON con round-trip de `paqueteId`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/forge/store/useCardStore.ts` | Modified | userPacks persistido + CRUD de paquetes (crearPaquete, renombrarPaquete, eliminarPaquete), version 2 |
| `src/forge/types/form-config.ts` | Modified | META_FIELDS + campo select paqueteId |
| `src/forge/components/CardForm.tsx` | Modified | (herencia de draft ya funciona — revisar default del draft) |
| `src/forge/components/CardList.tsx` | Modified | pills dinámicas + filtro + importar |
| `src/forge/components/modals/PaqueteModal.tsx` | New | crear/renombrar paquete |
| `src/forge/utils/export-paquete.ts` | New | export/import JSON de paquete |
| `src/shared/data/paquetes.ts` | Modified | lookup unificado estáticos+dinámicos (helper) |
| `src/forge/store/__tests__/useCardStore.test.ts` | Modified | tests CRUD paquetes + persist |
| `src/forge/components/__tests__/CardList.test.tsx` | Modified | adaptar orden/sesión de paquetes dinámicos |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `progresoPaquete` estático devuelve `null` para userPacks | High | Lookup combinado (estáticos + userPacks) en un helper compartido |
| `CardList.test.tsx` depende del orden `[estasis, disonancia]` | Med | Actualizar tests a la nueva sesión unificada |
| `userPacks` pierde datos si partialize no lo persiste | High | Bump `version: 2` + migrate v1→v2 + test de persistencia |
| Cartas existentes sin paquete rompen filtros | Low | Select con opción "Sin paquete" |

## Rollback Plan

`git revert` del commit del change. Los paquetes dinámicos son datos runtime en localStorage (no tocan datos estáticos del repo); si algo falla, borrar la key `epic-tgc-collection` devuelve el estado base.

## Dependencies

- A3 colecciones múltiples (ya implementado y verde — base del store).
- `Paquete` type existente (shared/types/paquetes.ts) — sin cambios.

## Success Criteria

- [ ] Crear un paquete nuevo desde el forge sin escribir código (modal + persistencia tras reload).
- [ ] El formulario de carta permite asignar/editar el paquete y el `paqueteId` sobrevive al guardado y al round-trip JSON.
- [ ] El paquete dinámico aparece en CardList con progreso, filtro e importación a la colección.
- [ ] Exportar paquete → importar paquete = round-trip idéntico (metadata + cartas).
- [ ] Gate: `npx tsc -b` + `npm test` verdes.
