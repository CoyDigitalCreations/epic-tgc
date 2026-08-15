# Proposal: Mazo personalizado en Éter Online

## Intent

Hoy el Online solo permite jugar con los sets preestablecidos (Estásis/Disonancia). Se quiere poder armar un mazo personalizado eligiendo de TODAS las cartas disponibles (diseños del catálogo + cartas custom de la colección local de la forja), con validación en vivo 15/45/6 = 66, y jugar con él. Además, se retira del Online la integración de cartas custom por importación JSON: el motor registra efectos por `cardId` de diseño (`registrarEfecto(trigger, cardId)`), así que el texto de una carta nueva NO se puede replicar aún. Se re-integrará cuando el motor soporte efectos dinámicos.

## Scope

### In Scope
- Quitar del menú del Online: botones "Importar colección (JSON)" y "Añadir cartas terminadas (JSON)" + handlers `importar`/`importarTerminadas`.
- Quitar el reemplazo automático por nombre (`armarMazoConColeccion`): los sets preestablecidos juegan SIEMPRE con diseños originales (efectos 100% replicados).
- Editor interactivo de mazo personalizado: catálogo completo (diseños + custom locales), filtros (tipo/facción/texto), agregar/quitar copias hasta `limiteCopias`, contadores en vivo `15/45/6 · 66/66`.
- Persistencia local: hasta **5 mazos** personalizados (localStorage) — crear, renombrar, editar, eliminar, jugar.
- Bot: humano con preestablecido → el otro set (comportamiento actual). Humano con personalizado → uno de los 2 sets, elegido **determinísticamente a partir del seed** (`seed % 2`) para preservar "mismo seed → misma partida".
- Tests RED→GREEN + gate (`tsc` + `vitest --no-cache`).

### Out of Scope
- Motor con efectos dinámicos (replicar texto de efectos de cartas nuevas) — requisito previo para re-integrar cartas custom con efectos.
- Re-integración de importación JSON de colección/cartas terminadas al Online.
- Multiplayer online real (sigue siendo local vs bot).
- Más de 5 mazos guardados.

## Capabilities

### New Capabilities
- `mazo-personalizado`: editor interactivo + persistencia (hasta 5 mazos) + validación de distribución 15/45/6 = 66.

### Modified Capabilities
- `integracion-coleccion-online`: se REMUEVE la importación JSON de colección/cartas y el reemplazo por nombre; la colección local del forge solo alimenta el selector del mazo personalizado (las custom juegan vanilla o con el efecto de su id de diseño si lo tienen).

## Approach

- Nuevo store zustand con persist: `mazosPersonalizados: { id, nombre, cardIds: string[] }` (66 expandidos, listos para `createInitialState`) — tope 5, con upsert/eliminar/renombrar.
- `MazoEditor`: lista de cartas (`ALL_CARDS` + colección local con arte) con filtros y controles `+`/`−` por carta (tope `limiteCopias` y topes de distribución); contadores en vivo; guardado solo si la distribución es válida.
- Exportar/centralizar `validarDeck` (hoy privada en `initialState.ts`) para reusarla en el editor y en el arranque de partida.
- Mantener `registrarCartas(coleccion)` al iniciar partida: `getCardMeta` resuelve custom en mazos personalizados (efecto original si el id es de diseño; vanilla si id custom).
- Bot con mazo personalizado: `MAZOS[seed % 2]` (determinista).

## Affected Areas

| Área | Impacto | Descripción |
|------|---------|-------------|
| `src/online/OnlineApp.tsx` | Modified | Quitar import/terminadas; integrar editor y selector; bot determinista |
| `src/online/mazos.ts` | Modified | Quitar `armarMazoConColeccion`; helpers de deck custom (conteo, validación) |
| `src/online/game/initialState.ts` | Modified | Exportar `validarDeck` |
| `src/online/useMazosStore.ts` | New | Persistencia de mazos (máx 5) |
| `src/online/components/MazoEditor.tsx` | New | Selector interactivo con filtros y contadores |
| Tests (`OnlineApp`, `mazos`, `initialState`, nuevos) | Modified/New | Actualizar los que ejercitan importación; cubrir editor y store |

## Risks

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Tests existentes que ejercitan importar/terminadas/`armarMazoConColeccion` se rompen | Alta | Actualizarlos al quitar la funcionalidad (parte del TDD) |
| Custom con id custom juega sin efectos (vanilla) | Seguro | Aceptado por el usuario; documentado en el editor ("efectos no replicados") |
| Romper el determinismo del bot | Media | Elección del mazo del bot derivada del seed (`seed % 2`) |

## Rollback Plan

`git revert` del commit del cambio. Sin migraciones destructivas: los mazos guardados se ignoran si se revierte; la colección del forge y el card maker no se tocan.

## Dependencies

- Ninguna externa. Reutiliza `ALL_CARDS`, `getCardMeta`, `limiteCopias`, store del forge (solo lectura).

## Success Criteria

- [ ] Se arma un mazo de 66 (15/45/6) desde el editor y la partida arranca con él.
- [ ] Se guardan hasta 5 mazos y persisten al recargar (renombrar/editar/eliminar funcionan).
- [ ] El bot usa el otro set (preestablecido) o uno determinista del seed (personalizado).
- [ ] No existen "Importar colección" / "Añadir cartas terminadas" en el Online; los sets juegan con diseños originales.
- [ ] Gate verde: `npx tsc -b` + `npm test`.
