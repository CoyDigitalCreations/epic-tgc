# Tasks: online-mazo-personalizado

TDD estricto: RED → GREEN por tarea + gate parcial (tests del archivo). Gate final: `npx tsc -b` + `npm test` (`vitest --no-cache`). Orden de implementación pensado para que cada tarea deje el repo compilando y con tests verdes.

## T1 — Store `useMazosStore` (persist, tope 5, CRUD)

- Crear `src/online/useMazosStore.ts`:
  - `MazoPersonalizado { id, nombre, cardIds }`; estado `mazosPersonalizados: MazoPersonalizado[]`
  - `agregarMazo({nombre, cardIds})` → `{ ok, error? }`; rechaza si ya hay 5 (`'Máximo 5 mazos personalizados'`) o nombre vacío; genera id (`slugify`/crypto, dedupe)
  - `renombrarMazo(id, nombre)`, `actualizarMazo(id, cardIds)`, `eliminarMazo(id)`
  - persist (localStorage `epic-tgc-mazos-personalizados`, version 1, partialize `mazosPersonalizados`)
- Tests `src/online/__tests__/useMazosStore.test.ts` (RED primero):
  - agregar agrega con id slugificado · renombrar solo cambia nombre · actualizar reemplaza cardIds · eliminar quita
  - tope: el 6º mazo falla con error y NO agrega
  - nombre vacío → error
  - persistencia: `persist.rehydrate()` tras setear localStorage reconstruye los mazos

## T2 — Helpers de mazo en `mazos.ts` + `validarDeck` exportada

- `src/online/game/initialState.ts`: exportar `validarDeck` (hoy privada).
- `src/online/mazos.ts`: eliminar `armarMazoConColeccion`, `MazoConColeccion`, `indiceColeccion`; agregar:
  - `cartasDisponibles(coleccion)` → `AnyCard[]`: `[...ALL_CARDS]` + custom de la colección con id fuera de ALL_CARDS (dedupe: si el id existe en ALL_CARDS se usa el diseño original; la custom con id nuevo se agrega)
  - `conteosDe(cardIds)` → `{ eter, principal, vinculos }`
  - `buildDeck(seleccion: Map<cardId, copias>)` → `string[]` expandido en orden estable
- Tests `src/online/__tests__/mazos.test.ts` (RED primero): eliminar describe `armarMazoConColeccion`; agregar:
  - `cartasDisponibles`: sin colección = solo ALL_CARDS; con custom id nuevo la agrega; con custom que repite id de diseño NO pisa el diseño
  - `conteosDe` sobre un deck válido (15/45/6)
  - `buildDeck` expande copias (limiteCopias) y conserva orden
  - `validarDeck` exportada: deck custom válido pasa, inválido tira error

## T3 — `MazoEditor` (vista dedicada)

- Crear `src/online/components/MazoEditor.tsx`:
  - Props: `{ inicial?: MazoPersonalizado; onGuardar(mazo: { nombre; cardIds }): void; onCancelar(): void }`
  - Estado: selección `Map<cardId, copias>`, nombre, filtros (tipo, facción, texto)
  - Lista de `cartasDisponibles(coleccionLocal)`; botones `+`/`−` por carta; topes: `limiteCopias` por carta y distribución (15 éter / 45 principal / 6 vínculos)
  - Contadores en vivo `15/15 · 45/45 · 6/6 · 66/66`; guardar deshabilitado hasta que el mazo sea válido (usa `validarDeck` o conteos)
  - Edición: si `inicial`, reconstruye selección agrupando `cardIds`
- Tests `src/online/components/__tests__/MazoEditor.test.tsx` (RED primero):
  - renderiza la lista con filtros y contadores en cero
  - `+` agrega copia y actualiza contador; no pasa de `limiteCopias`
  - filtros por tipo/facción/texto filtran la lista
  - no habilita guardar con mazo inválido (p.ej. solo 10 cartas)
  - arma un mazo válido completo (o mock de selección) y `onGuardar` recibe 66 cardIds
  - con `inicial` muestra nombre y selección reconstruida

## T4 — `OnlineApp`: retiro de integración + selector + bot determinista

- `src/online/OnlineApp.tsx`:
  - Quitar imports de `importCollectionFromJson`/`importCardDataFromJson` y handlers `importar`/`importarTerminadas` + botones/inputs "Importar colección (JSON)" y "Añadir cartas terminadas (JSON)"
  - Quitar `mazosConColeccion`/`armarMazoConColeccion`; los sets = `MAZOS` directos (diseños originales)
  - `mazoHumano: MazoSeleccionado` (unión `set|custom`); card "Mazo personalizado" en el grid (nombre + `N cartas`) + vista editor integrada
  - `registrarCartas(coleccion.filter(c => !ALL_CARDS.some(d => d.id === c.id)))` (solo custom)
  - Bot: humano set → el otro set; humano custom → `MAZOS[seed % 2]`
  - `PartidaConfig.deckA/deckB` según selección; `key` de partida incluye el id del mazo
- Tests `src/online/__tests__/OnlineApp.test.tsx` (RED primero): quitar describe "añadir cartas terminadas"; agregar:
  - menú ya no muestra "Importar colección"/"Añadir cartas terminadas"
  - con un mazo guardado: elegirlo → partida con `MAZOS[seed % 2]` como bot (seed par/impar) y sets intactos
  - editor: crear mazo válido → guardado → aparece en el menú → comenzar partida

## T5 — Verify + Archive

- Correr gate completo `npx tsc -b` + `npm test`
- Escribir `verify-report.md` (matriz de compliance del design + issues + verdict)
- Archivar en `.atl/changes/archive/2026-08-14-online-mazo-personalizado/`
- Persistir resumen en Engram (topic_key `sdd/online-mazo-personalizado/implemented`)
- Preguntar al usuario por commit/push
