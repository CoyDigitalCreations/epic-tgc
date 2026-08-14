# Change 4 — Éter Forge (colecciones) + Mazo 45 (diseño)

Proyecto Éter Online (`epic_tgc`). Este change cubre DOS frentes que el dueño pidió juntos:

## Parte A — Card maker "Éter Forge" (`src/forge/`, ruta `/card-maker`)

### A1 · Sección de comentarios por carta
- Campo de texto libre (notas del diseñador) en `CardForm`.
- Viaja en el JSON de la carta (campo `comentario`/`notas` — nombre exacto al definir con la data real del forge).
- Se renderiza/edita en la vista de carta; NO afecta el juego online (es metadata de autoría).

### A2 · Selector de variante: full art / normal
- Las cartas "legendarias ultra raras top" pueden ser **full art** (el arte ocupa todo el frame de la carta) o **normal** (marco estándar 744×1038).
- Campo nuevo en la carta: `variante: 'normal' | 'full-art'` (nombre a confirmar con el schema real).
- El render (`CardPreview` / `RenderCarta`) cambia según la variante: full art = sin marco, arte a sangre completa + textos superpuestos.
- El selector vive en `CardForm` (toggle/select).

### A3 · Colecciones múltiples + creación + import local
Contexto del dueño: un camarada diseña sus propias cartas. El proyecto está desplegado en Vercel, pero los JSON con arte son MUY pesados → se comparten por Drive e importan LOCALMENTE (no pasan por el repo ni por Vercel).
- El forge hoy maneja UNA colección fija → debe soportar **múltiples colecciones** (como `estasis` y `disonancia` hoy).
- Flujo esperado:
  1. **Crear colección nueva** (nombre + facción + atributos base).
  2. **Importar localmente** un JSON de colección (estructura `seed/estasis.json` o `seed/disonancia.json`) — arrastrar/soltar o file picker; las imágenes vienen embebidas en el JSON (dataURL, por eso son pesadas).
  3. **Trabajar sobre la colección importada/creada** (CRUD de cartas como hoy).
  4. **Exportar** la colección a JSON local (para compartir por Drive).
- Restricciones de producto:
  - Las colecciones locales NO suben a Vercel (peso) — persistencia LOCAL (localStorage/indexedDB, respetando el quota guard actual de `useCardStore`).
  - El juego online (`src/online/`) debe poder consumir la colección local (mismo pipeline de datos que hoy — investigar cómo llegan las cartas al juego).
  - La colección `estasis`/`disonancia` del repo siguen existiendo como las oficiales.

## Parte B — Mazo principal 40 → 45 (manual + seeds + estructura)

### B1 · Estructura del cambio
- Deck principal pasa de 40 a 45 cartas (por mazo).
- **Estasis (Orden):** +5 = campeona ×3 + mística ×2.
- **Disonancia (Caos):** +5 = campeón ×2 + arcana ×2 + mística ×1.
- Actualizar: `manual.html` (todas las menciones de 40 / estructura de mazo), seeds (`seed/estasis.json`, `seed/disonancia.json`), `src/shared/data/paquetes.ts` (si es la fuente), y `scripts/generate-seed.ts` si regenera.

### B2 · Diseño de las 5 cartas — objetivo de diseño
Todas orientadas a **acelerar el flujo del mazo buscando cartas del deck principal** (estrategia de tutor) bajo condiciones. Ejemplo dado por el dueño (campeón de Estasis):
> "Cuando esta carta es enviada hacia el cementerio (no importa el medio, es decir que mientras toque el cementerio se activa el efecto) puedes añadir de tu deck a tu mano 1 carta tipo campeón del orden de coste 2 o menos (o de ATQ 5 o menos...)"

- **Estasis:** campeona (3 copias, tutor al ir al cementerio — cualquier causa) + mística (2 copias, tutor con condición).
- **Disonancia:** campeón (2 copias, análogo), arcana (2 copias, tutor al colocarse/persistente), mística (1 copia).
- Los diseños concretos (nombre, coste, stats, texto exacto) se completan con la data real de los mazos (inventario del explore — delegación `profitable-maroon-termite`) para que encajen con el balance actual (patrón visto: campeones coste 2 = 5/3 Carga o 4/4; coste 4 = 9/9 Soberano Singular; etc.).

### B3 · Dependencia del motor (ANOTADA — NO implementar en este change)
- **Mecánica de TUTOR** (deck → mano con filtro por tipo/coste/stats) + **trigger al-morir / al-ser-enviado-al-cementerio (cualquier causa)**.
- El motor NO tiene ninguna de las dos. Anotado como dependencia en `.atl/changes/change-3-campeones/design.md` (sección "Dependencias registradas") — ubicación estimada C5 del change 3 (soporte.ts) + extensión de triggers.
- Los JSON/seeds/manual se actualizan en este change (los datos existen); la implementación del efecto en el motor es el change 3.

## Estado del trabajo
- ✅ Artefacto change 3 actualizado con dependencias (tutor + al-morir).
- ✅ **B1/B2 — Mazo 45 implementado**: 5 cartas nuevas (FB-031 campeona ×3, FB-032 mística ×2; DS-031 campeón ×2, DS-032 arcana ×2, DS-033 mística ×1) con efectos tutor (deck→mano con filtro de tipo/coste).
- ✅ Distribución oficial 15/45/6 (66 cartas) propagada: `paquetes.ts`, `MAZO_TOTAL=66`, motor (`initialState.ts` 45/66 + extracciones 99 + instancias c1..c132), `invariants.ts` (66), `mazos.ts`, `manual.html` (todas las menciones 40/61 → 45/66), seeds regenerados, snapshot del contrato actualizado. Suite: 392/392 verdes.
- ✅ **A1/A2 — Forge**: campos `variante` (select normal/full-art, default 'normal') y `comentario` (textarea de autoría) en `META_FIELDS` (form-config) para TODOS los tipos; render full-art en `RenderCarta` (arte a sangre completa 1038px, sin CardFrame ni marco inferior, overlays oscurecidos arriba/abajo); export-json conserva ambos campos. Tests de CardForm y CardPreview cubren A1/A2.
- ✅ **A3 — Colecciones**: `ColeccionModal` creado e integrado en `CardList` (sesión previa).
- ✅ **tsc preexistente resuelto**: `campeones.ts:108` usaba `string | null` en `copiasEnCampo` (guard solo filtraba `undefined`); fix `?? null` + `m !== null`. `tsc -b` limpio, suite 392/392.
- 🔲 B3 — Mecánica de TUTOR + trigger al-ser-enviado-al-cementerio en el motor: anotada como dependencia del change 3 (NO implementada acá, por diseño).
- 🔲 Implementación A3 completa (CRUD de colecciones múltiples + import local): pendiente de verificación end-to-end.
