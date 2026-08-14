# Tasks: forge-paquetes-personalizados

Patrón TDD: cada tarea = sub-commit RED → GREEN, con gate `npx tsc -b` + `npx vitest run --no-cache` (NUNCA con cache). Fuente de requisitos: `design.md`.

## T1 · Store: userPacks persistido + CRUD de paquetes
**Archivos**: `src/forge/store/useCardStore.ts`, `src/forge/store/__tests__/useCardStore.test.ts`

- [ ] RED: tests nuevos en useCardStore.test.ts:
  - `crearPaquete` agrega a `userPacks` con `id` slugificado (`Los Mutantes` → `los-mutantes`)
  - slugify dedupe: mismo nombre dos veces → `los-mutantes`, `los-mutantes-2`
  - `color` derivado de `FACCION_COLORS[facciones[0]]`; sin facción → `#6b7280`
  - `distribucion` default `{15,45,6}`; `entrega` default `'Personalizado'`
  - `renombrarPaquete` cambia solo `nombre` (id estable, cartas intactas)
  - `eliminarPaquete` quita el paquete y desasigna `paqueteId → undefined` en TODAS las colecciones (no borra cartas)
  - persistencia: `partialize` incluye `userPacks`; rehidratación la recupera
  - migrate v1→v2: storage sin `userPacks` → `userPacks: []`; v0 encadena (cards → colección default + userPacks [])
- [ ] GREEN: implementar en `useCardStore.ts` (version: 2, migrate aditivo, acciones nuevas, helper `slugify` con dedupe)
- [ ] Gate: `npx tsc -b` + `npx vitest run --no-cache` (ajustar test que espera `version === 1` → 2)
- [ ] sub-commit: `feat(forge): paquetes personalizados persistidos (version 2) + CRUD`

## T2 · Campo "Paquete" en el formulario
**Archivos**: `src/forge/types/form-config.ts`, `src/forge/types/__tests__/form-config.test.ts` (nuevo), `src/forge/components/CardForm.tsx`, `src/forge/components/__tests__/CardForm.test.tsx`

- [ ] RED:
  - `form-config.test.ts`: `META_FIELDS` incluye `{ name: 'paqueteId', label: 'Paquete', type: 'paquete', required: false }` en primera posición; todos los `FORM_CONFIGS` lo heredan vía META_FIELDS
  - `CardForm.test.tsx`: renderiza select "Paquete" con opciones: "Sin paquete" + paquetes estáticos (id→nombre) + `userPacks` del store; seleccionar actualiza `draft.paqueteId`; al editar carta con `paqueteId` el select lo muestra
- [ ] GREEN: `FieldDef.type` + `'paquete'`; `META_FIELDS` agrega el campo; `renderField` case `'paquete'` (select dedicado, `updateDraft('paqueteId', value || undefined)`); `initDraft` sin paqueteId
- [ ] Gate
- [ ] sub-commit: `feat(forge): campo paquete en el formulario de carta`

## T3 · PaqueteModal + CardList unificado
**Archivos**: `src/forge/components/modals/PaqueteModal.tsx` (nuevo), `src/forge/components/CardList.tsx`, `src/forge/components/__tests__/CardList.test.tsx`, `src/shared/data/paquetes.ts`

- [ ] RED: `CardList.test.tsx`:
  - pill dinámica para cada `userPack` (runa + nombre + badge "N cartas" = conteo de cartas de la colección con ese paqueteId)
  - botón "Exportar" en pill dinámica; botones "Nuevo paquete" + "Importar paquete (JSON)" en el header
  - al eliminar paquete desde la pill → desaparece y cartas desasignadas
  - paquetes estáticos conservan progreso/badge e Importar (orden de sesión preservado)
- [ ] GREEN: `PaqueteModal.tsx` (patrón ColeccionModal: nombre, tipo PAQUETE_TIPOS, facción FACCIONES, lore, entrega); `paquetes.ts` + `progresoPaqueteDe(cards, paquete)` (progresoPaquete delega); `CardList.tsx` `paquetesVisibles = [...PAQUETES, ...userPacks]`
- [ ] Gate
- [ ] sub-commit: `feat(forge): gestión y listado unificado de paquetes`

## T4 · Export/Import de paquete JSON
**Archivos**: `src/forge/utils/export-paquete.ts` (nuevo), `src/forge/utils/export-json.ts`, `src/forge/utils/__tests__/export-paquete.test.ts` (nuevo)

- [ ] RED: `export-paquete.test.ts`:
  - `importPaqueteFromJson` parsea `{ paquete, cards }` válido
  - shape inválida (sin `paquete.id`/`paquete.nombre`, sin `cards`) → rechaza con mensaje
  - round-trip: export genera el mismo `{ paquete, cards }` (conteo y campos)
- [ ] GREEN: `export-paquete.ts` (`exportPaqueteToJson` con arte embebido, `importPaqueteFromJson` con validación); `export-json.ts` extrae `conArteEmbebido` (reuso)
- [ ] Gate
- [ ] sub-commit: `feat(forge): export/import de paquete JSON`

## T5 · Verify + Archive
- [ ] Verify: `verify-report.md` en `.atl/changes/forge-paquetes-personalizados/` (criterios de éxito de proposal: crear sin código y persiste tras reload, campo asigna y sobrevive, paquete dinámico en CardList con progreso/filtro/import, export→import round-trip, gate verde)
- [ ] Sync design a main specs / archive cambio
- [ ] Preguntar al usuario si commitea/pushea (working tree acumulado sin commitear)
