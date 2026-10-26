# Tareas — Motor de reglas base + modificadores

Ver `design.md`. Marcar al terminar cada tarea.

## F0 — Manual
- [x] Regla de oro (la carta manda sobre el manual; el manual es el fallback)
- [x] §10: keywords `Tirador` e `Inexiliable`
- [x] §8.6: primer turno **del juego**
- [x] §5.2/§7.4/§8.3a/§7.6: el Disparo agota; sin "una vez por turno"
- [x] §9.4: una sola Ruptura por turno y no se ataca después de romper
- [x] §5.5/§13: el sexto Vínculo puede evitar la derrota o forzar empate
- [x] §9.6: cadena general (no solo en combate)

## F1 — Fundamentos
- [x] Catálogo de reglas + resolución pura (`src/shared/rules/reglas.ts`)
- [x] Keywords `Tirador` e `Inexiliable` en el enum
- [x] Esquema: efecto `modificar_regla`
- [x] `GameState.reglasTemporales` + purga
- [x] `reglaVigente` en el motor (keywords, efectos en juego, temporales)
- [x] Intérprete: `case 'modificar_regla'`
- [x] Tests

## F2 — Estado del Campeón
- [x] Separar *cansado* (`entradaEsteTurno`) de *agotado*
- [x] El agotado no bloquea
- [x] Paga y Agota agota
- [x] Tirador
- [x] Quitar "una vez por turno" de todo Disparo
- [x] Reescribir tests con cita correcta

## F3 — Combate
- [x] Una Ruptura por turno; sin más ataques tras romper
- [x] Bloqueos por turno (no por combate)
- [x] Prioridad del defensor en la cadena

## F4 — Alba
- [x] Orden: enderezar → reagrupar → efectos de inicio → robar
- [x] Rediseñar el Pasivo 1A

## F5 — Pila general
- [x] Definir eventos que abren ventana: acciones de jugador (jugar Mística/Campeón, activar Arcana/habilidad, declarar ataque/bloqueo) y respuestas; `al-pagar-eter` y los triggers sin acción de jugador siguen inmediatos
- [x] Toda activación apila su efecto y resuelve al cierre (LIFO)
- [x] Arcanas y Místicas con Presteza/Fugaz como respuestas (la velocidad manda, F5f)
- [x] Manual §9.6 reescrito con lo implementado en F5 y neutral entre juego físico y virtual (sin "ventana", "gate", etc.); también §5.3, §5.4 (candado de Arcana), §8.3a, keywords y glosario
- [x] Continuos (bloquear Éter) como respuesta solo durante la Forja (decisión del usuario 2026-10-26; no agotan al Campeón); `validarBloquearEter` y `getValidActions` con paridad
- [x] Místicas solo se juegan desde la mano: `motivoNoResponde(..., 'campo')` ya no deja responder a una Mística del campo (helper de tests `conRespuestaDeMano`; 21 tests reescritos; snapshot del bot seed 1: -142 ventanas, ver Engram)
- [ ] Un Disparo con Éter bloqueado puede activarse agotado, pero como respuesta el motor exige Campeón enderezado: decidir y alinear `motivoNoResponde` con `getValidActions`
- Subfases hechas: F5a pila única · F5b opener resuelve último · F5c bloqueo abre ventana antes del daño · F5d-1 objetivos antes de la ventana · F5e respuestas con objetivo · F5f velocidad · F5g candado de Arcana · F5h revalidación de objetivos · F5d-2 infraestructura de triggers apilados · F5d-3 `al-jugar-mistica` · F5d-4 `al-invocar` · F5d-5 `al-atacar` · H4 elector ajeno al turno (`electorAjeno`)
- [ ] Decidir `al-activar-habilidad` (nadie lo dispara: Draven y Korr tienen 2 efectos letra muerta); cablear en `ejecutarActivarHabilidad` o corregir las cartas en el Card-Maker
- Deuda anotada: prevención a mitad de la pila (el bucle de resolución es síncrono, se acepta; revisar en F9) · `electorAjeno` solo mira el frente de la cola (un pendiente de umbral delante retrasa a los de resolución) · `engine.js` desactualizado desde F5a hasta el despliegue (tras F6)

## F6 — Fin de partida
- [x] Resultado `empate`: punto de control único `confirmarFinDePartida` (`finPartida.ts`) al final de cada acción y tras el robo del Alba; dos derrotados a la vez = empate (`ganador` null, motivo `'empate'`, evento `partida_terminada` con `ganador: null`)
- [x] La derrota por Vínculos se recalcula en cada punto de control (sin bandera: algún Vínculo destruido, ninguno vivo y la regla lo permite); el mazo vacío se marca al intentar robar (`mazosAgotados`) y se confirma en el mismo punto. Lo obligatorio retrasa la confirmación (cadena, declaración, Artefacto por equipar, prevención, elector rival H4); la cola opcional del turno no
- [x] Efectos que previenen la derrota: regla booleana `derrotaPorVinculos` (por jugador, base sí, prohibible con `modificar_regla`). No existe ni existirá un efecto `forzar_empate`
- [x] UI del empate: modal del tablero (⚖), logs y servidor (`winner` null). Migración `20261026120000_eter_games_finish_reason_empate.sql` escrita, NO aplicada: va con el despliegue
- [x] Corregido el bug del manual §5.5/§13: antes la derrota se confirmaba antes de que el efecto del último Vínculo pudiera resolverse (ganaba el rival aunque el efecto lo destruyera también)
- [x] Despliegue (2026-10-26): `engine.js` regenerado (`89770e1`), migración aplicada vía MCP (`eter_games_finish_reason_empate`, constraint verificado) y `match-engine` desplegado = v9 (CLI `--use-api`). Servidor y cliente alineados con F5, H4 y F6. A partir de aquí cada cambio de `src/online/game` exige regenerar el bundle y redesplegar

## F7 — Exilio
- [x] Un solo punto de control de exilio: `exilio.ts` (`esExiliable` sin efectos secundarios, `permitirExilio` que emite `exilio_prevenido`). Lo consultan `executeExile`, el tutor con destino Exilio, el Éter hacia el Exilio y el costo `exile_self` (una fuente Inexiliable no es fuente elegible de `prevent_destroy`)
- [x] Inexiliable: la carta se queda donde está (campo, cementerio o mazo) y se avisa con `exilio_prevenido` (evento nuevo, 36 en el contrato); puede ser destruida (§10). Cierra H5 (`it.fails` → `it`). `engine.js` desactualizado desde F7 hasta el próximo despliegue
- Deuda anotada: ningún efecto de la carta consulta `puedeSerExiliada` al ELEGIR objetivo (igual que Inmortal: se puede elegir y falla al resolver); no hay `modificar_regla` de ámbito "cualquier carta" para el Exilio (la regla es solo de Campeón)

## F8 — Mazos
- [x] Límite de copias, Vínculo ×3, Única ×1 en `validarDeck` (`initialState.ts`): `limiteCopiasDe(cardId)` = `limiteCopias` de la carta (sin dato o ilegible, 1, igual que el editor); Única siempre 1; Vínculo con tope 3. El error nombra la carta, las copias y el límite. 16 tests en `validarMazo.test.ts`; manual §12 aclara que Única es siempre ×1
- [x] El servidor valida el mazo completo (`validarDeck`) también en `create` y `join` (422 con el motivo, tras registrar las cartas custom); el cliente (`matchApi`) muestra el motivo real y no el mensaje genérico de la Edge Function. Bundle regenerado con F7 y F8. Desplegado por el usuario (2026-10-26): `match-engine` = v10 ACTIVE, `verify_jwt` true (verificado con `list_edge_functions`)

## F9 — Cierre
- Decisión del usuario (2026-10-26): opción A, implementar los 12 efectos sin ejecutor aunque ninguna carta los use hoy, con cartas Dummy sintéticas para probarlos. Semántica acordada: `scry` clásico (mira N del tope, reordena y puede mandar al fondo); `direct_attack` = no puede ser bloqueado (sigue 1 Ruptura por turno); `redirect` = cambia el objetivo de un efecto en la cadena; `recuperar_exilio` = destino de `objetivo.zonaDestino`, por defecto la mano de su dueño; `change_type` por decidir
- [x] F9a — `invocar`, `recuperar_campo` y los `recuperar_*` (mano, mazo, mazo_barajar, mazo_top, mazo_bottom, exilio): ejecutor único `executeRecuperar`. Destino mano/mazo = el del DUEÑO (o el de `controladorDestino`); campo = el de quien controla el efecto; mazo sin posición = fondo (como el tutor), tope = índice 0, barajar con el ctx (determinista). `invocarAlCampo` ahora saca la carta de las zonas de su DUEÑO (antes solo del invocador). `resolveTargets` ahora filtra por TIPO también en Cementerio, Exilio y mano (antes «un Campeón del Cementerio» ofrecía cualquier carta). 28 tests en `recuperar.test.ts`. Debt: `invocar` no dispara `al-invocar` (igual que `invocar_y_equipar`; el usuario lo decidirá junto con steal_champion)
- [x] F9b — `direct_attack` = regla nueva `puedeSerBloqueado` (§9.3, ámbito Campeón, base sí) que se consulta sobre el ATACANTE; el efecto es un atajo de `modificar_regla` (`reglaDeEfecto` en `reglas.ts`): en el campo (pasivo/continuo) se deriva del estado y como efecto de resolución (hechizo/disparo/trigger) crea una regla temporal. Combate: `ataquesBloqueables` (los sin bloquear que sí pueden bloquearse) manda en el bloqueo forzoso, `asignacionForzada`, `validarDeclararBloqueo`, `getValidActions` y el auto-avance a resolución; el ataque directo sigue contando como «sin bloquear» para la Ruptura (1 por turno, §9.4). 10 tests en `ataqueDirecto.test.ts`
- [x] F9c — `scry` (motor + bot; el modal del Tablero es F9c-UI, antes del despliegue): `scry.ts`. El efecto mira las N del tope (cantidad, por defecto 1; menos si el mazo tiene menos; controlador `rival` = el mazo del rival, ordena quien lanza) y crea un `ScryPendiente` (cola FIFO `GameState.scryPendientes`); acción nueva `ordenar_mazo { arriba, fondo }` (arriba = al tope en ese orden, fondo = al fondo; juntas, exactamente las miradas). Mientras exista, la partida espera a quien mira (`actorActual`, `validarAccion` solo ordenar/rendirse, `hayPendienteObligatorio`); las elecciones de objetivo/prevención van antes. Vigencia por cartas aún en el mazo (si una se robó se ordenan las que quedan; sin ninguna se descarta). `visibleState` revela las cartas SOLO a quien mira. Bot: jugada canónica (conserva el orden, nada al fondo). Eventos nuevos `mazo_mirado` y `mazo_ordenado` (38 en el contrato). El servidor no cambia (valida con `actorActual` + `applyAction`). 20 tests en `scry.test.ts`. Deuda: un scry de `inicio_alba` resuelve ANTES del robo pero se ordena después (el Alba es automática y roba igual): hoy el robo toma la carta de arriba sin que el jugador haya ordenado
- [ ] F9c-UI modal del Tablero para `ordenar_mazo` (la UI debe armar `arriba`/`fondo`; sin él, un humano con un scry pendiente queda bloqueado)
- [x] F9d — `redirect` (decisión del usuario 2026-10-26: solo la entrada INMEDIATAMENTE INFERIOR de la pila, el nuevo objetivo debe ser candidato de ESE efecto con sus mismos filtros, y lo elige quien juega el redirect): `redirect.ts`. Se juega como respuesta o trigger y elige el nuevo objetivo al declararse; al resolverse (LIFO) reescribe el objetivo ya guardado de la entrada de debajo (trigger `objetivoId`, respuesta `respuestas[id].objetivos` u opener `objetivos`) y emite `objetivo_redirigido` (39 eventos). La posición del paso en curso la lleva `GameState.pasoResolviendo` (transitorio, lo fija `chain.resolverPila`). Si el nuevo objetivo no es legal, no hay nada con objetivo debajo o el redirect no resuelve desde la pila: no hace nada (la Mística se consume igual). Con varios efectos con objetivo en la entrada redirigida, cambia el PRIMERO al que el nuevo objetivo pueda apuntar. 7 tests en `redirect.test.ts`. Hallazgo (no corregido): los filtros `atqMax`/`resMax` de `resolveTargets` comparan con el ATQ/RES IMPRESOS de la carta (`meta.stats`), no con los vigentes (`statsDe`)
- [x] Filtros de ATQ/RES original vs actual (decisión del usuario 2026-10-26, a raíz del hallazgo de F9d): `atqMax`/`resMax` = valor ORIGINAL (impreso; comportamiento de siempre, los textos de las cartas existentes no cambian) y NUEVOS `atqActualMax`/`resActualMax` = valor ACTUAL (`statsDe`: buffs, debuffs y auras). Se pueden combinar. Esquema (`FiltroObjetivo`), `targetResolver`, Card-Maker (4 campos y texto «ATQ actual N o menos») y manual del Card-Maker. Añadidos también los filtros Min (`atqMin`/`resMin` original, `atqActualMin`/`resActualMin` actual) y `seleccionar.valor` (`'original'` por defecto | `'actual'`) para el ranking («Mayor ATQ actual»); el Card-Maker muestra «Ranking por» cuando hay ranking de ATQ/RES. 7 tests en `filtrosStats.test.ts`. Deuda: en un AURA con `seleccionar` el defecto (sin `valor`) sigue siendo base + modificadores (DS-030 depende de ello, `vinculos-sin-trigger.test.ts`), mientras que en un efecto el defecto es el impreso; `'actual'` en un aura no incluye otras auras (evita recursión). Las cartas nuevas deberían fijar `valor` explícito
- [ ] F9e `change_type` (preguntar semántica antes)
- [ ] Auditar el intérprete efecto por efecto (hay tipos del esquema sin ejecutor). Hallazgo (2026-10-26): de los 35 `EfectoAccion` del esquema, 12 no tienen ejecutor y NINGUNA carta actual los usa (`FuenteEfectos`, `PrimerColeccion` y `CartasPrueba` verificadas): `scry`, `redirect`, `direct_attack`, `change_type`, `invocar`, `recuperar_campo`, `recuperar_mano`, `recuperar_mazo`, `recuperar_mazo_barajar`, `recuperar_mazo_top`, `recuperar_mazo_bottom`, `recuperar_exilio`. Riesgo: el Card-Maker ofrece varios (`recuperar_*`) y una carta nueva con ellos se juega sin hacer nada. `fix_exhaust` sí funciona (solo como tramo de otro efecto)
- [ ] Implementar la keyword INEGABLE (hoy solo existe en el enum `enums.ts` y en el manual §10; nadie la consulta)
- [ ] Efecto "va al Exilio" tras resolver una Mística (no existe todavía; el manual §5.3 ya lo contempla)
- [ ] Matriz de casos borde
- [ ] Card-Maker: formulario de `modificar_regla`
- [ ] Regenerar manual impreso
