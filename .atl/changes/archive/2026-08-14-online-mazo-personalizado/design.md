# Design: Mazo personalizado en Éter Online

## Technical Approach

Un mazo personalizado se arma en un **editor interactivo** (vista dedicada) eligiendo cartas de `ALL_CARDS` + la colección local de la forja, con validación en vivo 15/45/6 = 66. Se persiste en un **store zustand nuevo** (localStorage, tope 5 mazos) como 66 cardIds expandidos, listos para `createInitialState`. En paralelo se **retira del Online** la integración de cartas custom (importación JSON + reemplazo por nombre): los sets preestablecidos juegan siempre con diseños originales (efectos keyed por cardId, no replicables).

## Architecture Decisions

| Decisión | Opciones | Tradeoff | Decisión |
|----------|----------|----------|----------|
| D1 — Store de mazos | (a) nuevo `useMazosStore` zustand+persist; (b) extender `useCardStore`; (c) localStorage manual | (b) contamina el forge con dominio online; (c) reimplementa persist/migrate | **(a)** store nuevo, key `epic-tgc-mazos-personalizados`, version 1, partialize `mazosPersonalizados` |
| D2 — Validación | (a) exportar `validarDeck` de `initialState.ts`; (b) moverla a `mazos.ts`; (c) duplicar | (b) invierte dependencia game→online (mal); (c) drift | **(a)** exportar y reusar en editor + arranque |
| D3 — Registro de custom en motor | (a) `registrarCartas(coleccion)` completo; (b) solo cartas con id fuera de `ALL_CARDS` | (a) un rediseño con id de diseño contaminaría los sets puros | **(b)** registrar solo ids custom: sets intactos, custom resuelven en mazos personales |
| D4 — UI del editor | (a) vista dedicada; (b) modal | (b) espacio insuficiente para lista+filtros+contadores | **(a)** `MazoEditor` reemplaza el menú mientras edita, con botón "Volver al menú" |
| D5 — Formato persistido | (a) 66 cardIds expandidos; (b) selección `{cardId, copias}` | (b) más fiel al editor pero deriva 2 formatos | **(a)** expandidos: listos para el motor; el editor reconstruye conteos agrupando |
| D6 — Bot con humano custom | (a) `MAZOS[seed % 2]` determinista; (b) `Math.random()` | (b) rompe "mismo seed → misma partida" | **(a)** determinista desde el seed |
| D7 — Retiro integración | (a) quitar importación + `armarMazoConColeccion`; (b) solo importación | (b) el reemplazo por nombre seguiría metiendo custom en los sets | **(a)** quitar ambos (aprobado por el usuario) |

## Data Flow

```
Menu (OnlineApp)
  ├─ set Estásis/Disonancia ──────────────┐
  └─ "Mazo personalizado" ──→ MazoEditor  │  guardar (válido 15/45/6)
        selección Map{cardId→copias} ─────┴→ useMazosStore (persist localStorage, máx 5)
                                                    │
  Comenzar partida: deckA = set elegido | custom.cardIds
                    deckB = otro set | MAZOS[seed % 2]
                    registrarCartas(coleccion.filter(custom)) ─→ createInitialState(validarDeck)
```

## File Changes

| File | Acción | Descripción |
|------|--------|-------------|
| `src/online/useMazosStore.ts` | Crear | Store persist de mazos personalizados (máx 5, CRUD) |
| `src/online/components/MazoEditor.tsx` | Crear | Editor: lista filtrable, `+`/`−` con topes, contadores 15/45/6 · 66/66, guardado validado |
| `src/online/mazos.ts` | Modificar | Eliminar `armarMazoConColeccion`/`MazoConColeccion`/`indiceColeccion`; agregar `cartasDisponibles(coleccion)` (dedupe, custom gana), `conteosDe(cardIds)`, `buildDeck(seleccion)` |
| `src/online/OnlineApp.tsx` | Modificar | Quitar `importar`/`importarTerminadas` + botones/inputs; quitar `mazosConColeccion` (sets = MAZOS); selector de mazo unión `set|custom`; bot determinista; integrar editor |
| `src/online/game/initialState.ts` | Modificar | Exportar `validarDeck` |
| `src/online/__tests__/OnlineApp.test.tsx` | Modificar | Quitar describe "añadir cartas terminadas"; agregar: selección custom, bot determinista, sets puros |
| `src/online/__tests__/mazos.test.ts` | Modificar | Quitar describe `armarMazoConColeccion`; cubrir `cartasDisponibles`/`conteosDe`/`buildDeck` |
| `src/online/__tests__/useMazosStore.test.ts` | Crear | CRUD, tope 5, persistencia (rehydrate) |
| `src/online/components/__tests__/MazoEditor.test.tsx` | Crear | Render, filtros, topes `+`/`−`, guardado inválido/válido, edición |

## Interfaces / Contracts

```ts
interface MazoPersonalizado { id: string; nombre: string; cardIds: string[] } // 66 expandidos
type MazoSeleccionado =
  | { tipo: 'set'; id: 'estasis' | 'disonancia' }
  | { tipo: 'custom'; id: string }

interface MazosState {
  mazosPersonalizados: MazoPersonalizado[]
  agregarMazo(mazo: { nombre: string; cardIds: string[] }): { ok: boolean; error?: string } // tope 5
  renombrarMazo(id: string, nombre: string): void
  actualizarMazo(id: string, cardIds: string[]): void
  eliminarMazo(id: string): void
}

// mazos.ts
cartasDisponibles(coleccion: AnyCard[]): AnyCard[] // dedupe por id (custom gana), ALL_CARDS primero
conteosDe(cardIds: string[]): { eter: number; principal: number; vinculos: number }
buildDeck(seleccion: Map<string, number>): string[] // expande copias en orden estable
```

## Testing Strategy

| Capa | Qué | Cómo |
|------|-----|------|
| Unit — store | CRUD, tope 5 (rechazo con error), persistencia | `useMazosStore.test.ts` con `persist.rehydrate()` |
| Unit — mazos | `cartasDisponibles` dedupe (custom gana), `conteosDe`, `buildDeck` respeta copias | `mazos.test.ts` |
| Component — editor | Filtros (tipo/facción/texto), `+`/`−` topes (`limiteCopias` y 15/45/6), contadores, no guarda inválido, guarda válido, edita existente | `MazoEditor.test.tsx` (jsdom + user-event) |
| Integration — OnlineApp | Sin botones de importar; elegir custom → bot `MAZOS[seed % 2]`; sets sin contaminación | `OnlineApp.test.tsx` |

## Migration / Rollout

Store nuevo (version 1, sin migrate). El localStorage de la colección (`epic-tgc-collection`) NO se toca. La eliminación de `importar`/`importarTerminadas` no requiere migración de datos: el menú simplemente deja de ofrecerlos.

## Open Questions

- [ ] Ninguna que bloquee.
