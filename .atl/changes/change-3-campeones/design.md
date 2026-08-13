# Change 3 · Commit C3 — Handlers de Campeones (diseño)

Motor Éter Online — `src/online/game`. Change 3 "Efectos de carta" (ADR-20..29).
C1 infra ✅ · C2 éteres ✅ · **C3 campeones (este documento)** · C4 habilidades · C5 soporte · C6 vínculos.

Fuente de verdad de textos: `src/shared/data/paquetes.ts` y `manual.html` §10 (keywords oficiales).

## Decisiones de diseño (confirmadas por el dueño del proyecto)

### D1 · Targeting interactivo — acción nueva `elegir_objetivo`
El jugador ELIGE el objetivo entre los válidos (patrón `elegir_opcion`, actions.ts:539-584).
- Estado nuevo en `GameState` (types.ts): `objetivosPendientes: Array<{ jugador: PlayerId, instId: string, trigger: string, opciones: string[] }>` — **cola FIFO** (Vaela+Kael atacan juntos → 2 pendientes). El campo `trigger` guarda el tipo de trigger que originó el pendiente.
- Acción: `{ type: 'elegir_objetivo', objetivoId: string }` — validador: hay pendiente del jugador de turno en el frente de la cola y `objetivoId` ∈ opciones.
- **Resolución por re-dispatch (patrón C2 `contextoUso`)**: `ejecutarElegirObjetivo` saca el frente de la cola y llama `dispararTrigger(s, ctx, pendiente.trigger, pendiente.jugador, [pendiente.instId], { contextoUso: 'objetivo-elegido', objetivoId })`. El handler que registró el trigger distingue: si `payload.contextoUso === 'objetivo-elegido'` → APLICA el efecto sobre `payload.objetivoId` (no arma pendiente); si no → ARMA `objetivosPendientes`. Así el estado es serializable (sin callbacks) y el mecanismo es idéntico al de `al-pagar-eter`.
- Si quedan pendientes tras resolver, se exponen de nuevo (cola FIFO).
- `opciones` se arman YA filtradas (Protector + requisitos del efecto): el motor nunca expone objetivos inválidos.
- NO se agregan eventos nuevos: la UI lee `objetivosPendientes` vía `getValidActions` (mantener contrato/snapshot estable).
- `validActions.ts`: exponer `elegir_objetivo` si el frente de la cola pertenece al jugador activo (patrón de `elegir_opcion`, validActions.ts:73-78).

### D2 · Aurora FB-010 — control prestado MOVIENDO la instancia entre campos
"Al ser invocada, toma control de un Campeón que controla el rival. Ese Campeón queda agotado hasta el inicio de tu próxima Alba."
- Mover `players[B].campo.campeones[i]` → `players[A].campo.campeones[slotLibre]` (primer slot libre de A, 5 slots).
- `owner` NO cambia (queda B): si el campeón sube a mano / muere / exilio → zona del DUEÑO (regla del dueño del proyecto). `moverAlCementerio`/`liberarEterBloqueado` ya usan `inst.owner` (correcto).
- `agotado = true` al robar. El "agotado hasta tu próxima Alba" se resuelve SOLO: la Alba del controlador endereza sus campeones en campo (phases.ts `resolverAlba`). No hace falta marcador.
- Control **permanente** (el texto no dice "mientras Aurora esté en campo"): no vuelve al morir Aurora.
- Requisito: campo del controlador con slot libre. Si no hay slot, el efecto no arma objetivos (no-op).
- Edge: excluir de `opciones` los objetivos que romperían Singular del controlador (`copiasEnCampo(state, controlador, cardId) >= 1`).
- Eventos: reusar `carta_salida_de_zona` + `carta_entrada_a_zona` (patrón `ejecutarJugarCampeon`). Sin eventos nuevos.
- Para hacerlo genérico y no hardcodear: registrar el "efecto de control" con el handler de `al-invocar` de FB-010; la resolución del objetivo delega al handler de la instancia `instId`.

### D3 · Protector — REGLA GENERAL (no solo habilidades activas)
"Tus otros Campeones no pueden ser objetivo de efectos del rival" — protege de TODO efecto dirigido del rival (Aurora, Ragnar, Vaela, Kael, y en C4 habilidades activas). Los Protectores SÍ pueden ser objetivo ("tus OTROS campeones").
- Función compartida (en efectos.ts o campo.ts): `objetivosCampeonesValidos(state, jugador): string[]` → campeones no-null del jugador; si controla ≥1 con keyword `Protector` (`keywordsDe`), retorna SOLO los Protectores.
- Se usa para armar `opciones` de todo targeting que designe "un Campeón que controla el rival".

### D4 · Transmutar (Mira FB-012) — acción propia `usar_transmutar`
"Manda esta carta al Cementerio: regresa hasta 2 Éter pagados (1A) a tu Reserva."
- Acción: `{ type: 'usar_transmutar', cardInstanceId: string, eterIds: string[] }`.
- Validador: `tieneKeyword(state, cardInstanceId, 'Transmutar')` (genérico, no hardcodear FB-012); carta del jugador activo en su campo; `eterIds` ⊆ `p.eterPagado` (zona 1A común del jugador — NO se rastrea por carta), únicos, ≤ 2.
- Ejecutor: quitar eterIds de `p.eterPagado` → `p.eterReserva` (emitir `eter_reagrupado`, patrón combat.ts:112); liberar `eterBloqueado` de Mira ('1A'); quitar de `campo.campeones[slot]` → `cementerio` (del dueño, patrón sacrificio actions.ts:446-457); eventos `carta_salida_de_zona`/`carta_entrada_a_zona`.
- **Auto-sacrificio, NO pasa por `destruirCarta`** (Inmortal/Indestructible no deben prevenirlo; es coste, no destrucción).
- Fase: turno del controlador, forja o choque.

### D5 · Disparos de triggers nuevos (dispatch)
| Trigger | Hook | Instancias |
|---|---|---|
| `al-invocar` | actions.ts `ejecutarJugarCampeon`, DESPUÉS del emit `carta_invocada` (~L466) | `[id]`, jugador `s.turno` |
| `al-atacar` | combat.ts `ejecutarDeclararAtaque`, después del emit `ataque_declarado` (~L115), ANTES de `abrirCadena` | `atacanteIds`, jugador `s.turno` |
| `al-matar-en-combate` | combat.ts `resolverCombate`: por cada par killer→victim CONFIRMADO, con `payloadExtra: { killerId, victimaId }` | `[victimaId]`, jugador = controlador del killer |

- `PayloadEfecto.killerId/victimaId` YA existen (efectos.ts:45-46, sin uso).
- `al-matar-en-combate` se dispara SOLO si la muerte NO fue prevenida (Indestructible). Preferencia: `destruirCarta(...)` pasa a retornar `boolean` (true = destruida) — los callers actuales ignoran el retorno (aditivo, no rompe). El dispatch corre después de `destruirCarta` de cada víctima (estado post-muerte).

### D6 · Auras de campo (Isolde, Thane, Elena, Marek)
No existe infraestructura (aurasDe solo reserva+bloqueo). Mecanismo nuevo:
- `registrarAuraCampo(cardId, fn)` donde `fn: (s, ctx, fuente, objetivo) => { atq?: number, res?: number } | null` — decide por par (fuente, objetivo); admite `objetivo === fuente`.
- Scan en `aurasDe` (efectos.ts:93-131): por cada jugador, por cada fuente en su `campo.campeones` con aura campo registrada, por cada objetivo en su `campo.campeones` → acumular (Σ aditivo, determinista, solo campo propio — los textos dicen "que controles").
- Registros C3:
  - FB-014 Isolde: `objetivo !== fuente` → +1 ATQ +1 RES.
  - DS-014 Thane: `objetivo !== fuente` → +1 ATQ.
  - FB-015 Elena: `objetivo === fuente && fuente.eterBloqueado.length >= 1` → +1 ATQ.
  - DS-015 Marek: `objetivo === fuente &&` algún campeón del RIVAL con `eterBloqueado.length >= 1` → +1 ATQ.
- `statsDe`/`keywordsDe` ya consumen `aurasDe` → quedan cubiertos. Actualizar el comentario "pre-auras" de combat.ts:13-14 (ahora el combate ve auras de campo).

### D7 · Handlers por carta (campeones.ts, `registrarEfectosCampeones()`)
- **FB-010 Aurora** — `al-invocar`: arma `objetivosPendientes` (D2 + D3); resolución: mover instancia.
- **DS-001 Ragnar** — `al-invocar`: arma `objetivosPendientes` (D3); resolución: `destruirCarta(s, ctx, objetivoId, 'efecto')` — Inmortal previene (correcto, ADR-15).
- **FB-011 Vaela** — `al-atacar`: arma `objetivosPendientes` (D3); resolución: `inst.agotado = true`.
- **DS-011 Kael** — `al-atacar`: arma `objetivosPendientes` (D3); resolución: `aplicarMod(s, ctx, objetivoId, { atq: -1, expira: 'ocaso' })` ("hasta el final del turno").
- **DS-012 Draven** — `al-matar-en-combate`: si `killerId` es Draven → el jugador que CONTROLABA la víctima pierde 1 Éter de su `p.eterPagado` (el primero, orden estable — determinista) → su `p.eterReserva`. Si no hay éteres en 1A, no-op. (Caso borde Aurora: la víctima puede estar en el campo del rival del controlador de Draven; el éter sale de quien controlaba la víctima.)
- Nota: los handlers de `al-invocar`/`al-atacar` con targeting SETEAN el pendiente; la resolución efectiva ocurre en la acción `elegir_objetivo` (dispatch al handler por `instId`).

### D8 · Gate por sub-commit
`npx tsc --noEmit` + `npx vitest run --no-cache` (NUNCA con cache: `node_modules/.vite` da falsos negativos) + archivo de tests RED→GREEN.

## Archivos que se tocan
- `src/online/game/types.ts` — `objetivosPendientes` en GameState; acciones nuevas en la union.
- `src/online/game/actions.ts` — dispatch `al-invocar` (~L466); acciones `elegir_objetivo` + `usar_transmutar` (validar+ejecutar).
- `src/online/game/combat.ts` — dispatch `al-atacar` (~L115) y `al-matar-en-combate` (resolverCombate).
- `src/online/game/efectos.ts` — `registrarAuraCampo` + scan en `aurasDe`; `objetivosCampeonesValidos` (o campo.ts).
- `src/online/game/replacements.ts` — `destruirCarta` retorna boolean (aditivo).
- `src/online/game/validActions.ts` — exponer `elegir_objetivo` y `usar_transmutar`.
- `src/online/game/handlers/campeones.ts` — registros reales (D7) + auras (D6).
- `src/online/game/__tests__/campeones.test.ts` — NUEVO (TDD, patrón de eteres.test.ts: `estadoMinimo`, `conCampeon`, `conEterReserva`, `crearCtx`).

## No tocar (es C4/C5/C6)
- `habilidades.ts` (C4: activar_habilidad, coste bloqueado), `soporte.ts` (C5), `vinculos.ts` (C6: Rowena FB-018, Skarn DS-018, Último Refugio FB-022). El registro de replacements SIGUE vacío (replacements.test.ts:132-134 intacto).

## Dependencias registradas (decidido con el dueño — NO implementar en C3)
- **Mecánica de TUTOR / buscar del deck a la mano** (change 4 "mazo 45"): las cartas nuevas de estasis/disonancia (campeón + mística + arcana) usan "añade de tu deck a tu mano 1 carta [filtro]". El motor NO tiene esa mecánica. Dependencia: implementar búsqueda en deck (deck → mano con filtro por tipo/coste/stats) + trigger **al-morir / al-ser-enviado-al-cementerio** (cualquier causa — el campeón de estasis busca al ir al cementerio, no solo por combate). Ubicación estimada: C5 (soporte.ts — místicas/arcanas/combates) + extensión de triggers. NO hacer en C3.
- Mecánica de descarte de mano del rival ("pierde 1 carta al azar" — Fracturar): pendiente, fuera de alcance (no requerida por C3).
