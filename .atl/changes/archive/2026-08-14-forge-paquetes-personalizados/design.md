# Design: forge-paquetes-personalizados

Paquetes (sets de cartas tipo Estásis/Disonancia) creados DESDE el card maker, sin escribir código. Campo "Paquete" en el formulario de carta. Export/Import de paquete JSON. Fuente de requisitos: `proposal.md` (D1-D4). Fuente de verdad de textos: `src/shared/data/paquetes.ts`.

## Enfoque técnico

Extensión ADITIVA del store A3 (colecciones): `userPacks: Paquete[]` pasa de estar muerto a ser el registro de paquetes personalizados (persistido, `version: 2`). El campo `paqueteId` YA existe en `CardMeta` (cards.ts:41) y sobrevive al save (`...draft`) — solo falta la UI. Los paquetes son METADATA: sus cartas viven en la colección con `paqueteId` (un paquete nuevo no duplica cartas; el export recopila las de la colección).

## Decisiones de diseño

### D1 · userPacks persistido (bump version 2)
- `partialize` agrega `userPacks`. `version: 2`.
- `migrate`: v0→v1 (existente) + **v1→v2**: `{ ...state, userPacks: state.userPacks ?? [] }` (aditivo; v0 pasa por ambos).
- `merge` ya contempla `userPacks` (existe) — se conserva.

### D2 · Campo "Paquete" en el formulario (type `'paquete'`)
- `FieldDef.type` union + `'paquete'`. `META_FIELDS` agrega al PRINCIPIO: `{ name: 'paqueteId', label: 'Paquete', type: 'paquete', required: false }` → inyecta en los 7 tipos.
- `CardForm.renderField` case `'paquete'`: select dedicado con opción `""` = "Sin paquete" + `PAQUETES` (id → nombre) + `userPacks` del store. `updateDraft('paqueteId', value || undefined)`.
- `initDraft` NO setea `paqueteId` (undefined = sin paquete). Al editar una carta con paquete, `setDraft(card)` lo hereda → el select lo muestra. Guardado: `...draft` lo persiste (sin cambios).

### D3 · CRUD de paquetes en el store
- `crearPaquete(datos: { nombre, tipo?, facciones?, lore?, entrega? })` → `id = slugify(nombre)` con dedupe (`mutantes`, `mutantes-2`…); `color = FACCION_COLORS[facciones[0]] ?? '#6b7280'`; `distribucion` default `{15,45,6}`; `entrega` default `'Personalizado'`.
- `renombrarPaquete(id, nombre)` → solo nombre (id estable; las cartas NO se tocan).
- `eliminarPaquete(id)` → quita el paquete y **desasigna** `paqueteId → undefined` en TODAS las colecciones (sin borrar cartas).
- `slugify`: normalize NFD (sin diacríticos), lowercase, espacios → `-`, strip `[^a-z0-9-]`.

### D4 · CardList unificado (estáticos + userPacks)
- `paquetesVisibles = [...PAQUETES, ...userPacks]` (useMemo) → pills, filtro (`card.paqueteId === paquete.id` ya funciona).
- Pills estáticas: runa + badge `progresoPaqueteDe` + botón **Importar** (como hoy, `CARTAS_POR_PAQUETE`).
- Pills dinámicas: runa + nombre + badge **"N cartas"** (conteo de cartas de la colección con ese paqueteId) + botón **Exportar** (JSON).
- Header: botón **"Nuevo paquete"** → `PaqueteModal` (crear) + botón **"Importar paquete (JSON)"**.
- `paquetes.ts`: nuevo `progresoPaqueteDe(cards: AnyCard[], paquete: Paquete)` (usa `paquete.distribucion`); `progresoPaquete(cards, id)` existente delega (backwards compat, tests intactos).

### D5 · Export/Import de paquete JSON (`utils/export-paquete.ts`)
- Formato: `{ paquete: Paquete, cards: AnyCard[] }`.
- `exportPaqueteToJson(paquete, cards)`: recopila cartas de la colección con ese `paqueteId`, re-embebe arte desde IndexedDB (reusa `conArteEmbebido` extraído de `export-json.ts`), descarga `{slug}.paquete.json`.
- `importPaqueteFromJson(file)`: valida shape (`paquete.id`/`nombre`, `cards` array) → `{ paquete, cards }`.
- En CardList: al importar, si `paquete.id` ya existe (estático o userPack) → alert "ya existe" (no duplica); si no → `crearPaquete` + `loadCards(cards)`.

### D6 · PaqueteModal (patrón ColeccionModal)
- Campos: nombre (input, requerido), tipo (select `PAQUETE_TIPOS`, default "Mazo Temático"), facción (select `FACCIONES` + "Sin facción"), lore (textarea opcional), entrega (input opcional).
- `onConfirm({ nombre, tipo, facciones, lore?, entrega? })`. Usado en crear; renombrar reusa el modal con solo nombre.

## Data Flow

    PaqueteModal ──crearPaquete──▶ useCardStore.userPacks ──partialize──▶ localStorage (v2)
       ▲                                                                      │
       │                                                                      ▼
    CardList.paquetesVisibles = [...PAQUETES, ...userPacks]        migrate v1→v2 (reload)
       │
       ├── pill estática ──progresoPaqueteDe──▶ badge N/total
       ├── pill dinámica ──conteo──▶ badge "N cartas" ──exportPaqueteToJson──▶ {paquete, cards}.json
       └── filtro paqueteId ──▶ cards de la colección

    CardForm (type 'paquete') ──updateDraft('paqueteId')──▶ draft ──handleSave──▶ carta con paqueteId
    importPaqueteFromJson ──crearPaquete + loadCards──▶ paquete nuevo + cartas en colección

## Archivos

| Archivo | Acción | Descripción |
|---------|--------|-------------|
| `src/forge/store/useCardStore.ts` | Mod | userPacks en partialize, version 2, migrate v1→v2, crear/renombrar/eliminarPaquete + slugify |
| `src/forge/types/form-config.ts` | Mod | FieldDef.type + `'paquete'`; META_FIELDS + campo paqueteId (primero) |
| `src/forge/components/CardForm.tsx` | Mod | renderField case `'paquete'` (select estáticos + userPacks) |
| `src/forge/components/modals/PaqueteModal.tsx` | New | crear/renombrar paquete |
| `src/forge/utils/export-json.ts` | Mod | extraer `conArteEmbebido` (reuso) |
| `src/forge/utils/export-paquete.ts` | New | export/import `{ paquete, cards }` |
| `src/forge/components/CardList.tsx` | Mod | paquetesVisibles, pills dinámicas, Nuevo/Importar/Exportar |
| `src/shared/data/paquetes.ts` | Mod | `progresoPaqueteDe` (De delega en él) |
| Tests (store, CardForm, CardList, export-paquete, paquetes) | Mod/New | ver Testing |

## Estrategia de testing

| Capa | Qué | Cómo |
|------|-----|------|
| Store (T1) | CRUD paquetes + desasignar al eliminar + persistencia v2/migrate v1 | `__tests__/useCardStore.test.ts` (vitest node, localStorage fake — patrón A3 existente) |
| Config (T2) | META_FIELDS contiene paqueteId; type `'paquete'` | `form-config.test.ts` (nuevo, unit) |
| Componente (T2) | CardForm: select de paquete con opciones estáticos+userPacks; actualiza draft; hereda al editar | `CardForm.test.tsx` (testing-library, patrón existente) |
| Util (T4) | export/import paquete round-trip; valida shape inválida | `export-paquete.test.ts` (nuevo; export sin arte = shape estable) |
| Componente (T3) | CardList: pills dinámicas con conteo; importar JSON crea paquete + cartas; no duplica si existe | `CardList.test.tsx` (adaptar orden de sesión estática) |

## Migración

`version: 1 → 2` con migrate aditivo (userPacks: `[]` si falta). v0 → v1 → v2 encadenados. Sin migración de datos: `userPacks` nunca se escribió antes (estaba muerto).

## Preguntas abiertas

- Ninguna — la integración online/Supabase queda como fase futura (fuera de alcance, confirmado en proposal).
