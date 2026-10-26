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
- [ ] Manual §9.6 (revisar que el texto refleje lo implementado en F5a-F5h y F5d)
- Subfases hechas: F5a pila única · F5b opener resuelve último · F5c bloqueo abre ventana antes del daño · F5d-1 objetivos antes de la ventana · F5e respuestas con objetivo · F5f velocidad · F5g candado de Arcana · F5h revalidación de objetivos · F5d-2 infraestructura de triggers apilados · F5d-3 `al-jugar-mistica` · F5d-4 `al-invocar` · F5d-5 `al-atacar` · H4 elector ajeno al turno (`electorAjeno`)
- [ ] Decidir `al-activar-habilidad` (nadie lo dispara: Draven y Korr tienen 2 efectos letra muerta); cablear en `ejecutarActivarHabilidad` o corregir las cartas en el Card-Maker
- Deuda anotada: prevención a mitad de la pila (el bucle de resolución es síncrono, se acepta; revisar en F9) · `electorAjeno` solo mira el frente de la cola (un pendiente de umbral delante retrasa a los de resolución) · `engine.js` desactualizado desde F5a hasta el despliegue (tras F6)

## F6 — Fin de partida
- [ ] Resultado `empate`
- [ ] Efectos que previenen la derrota o fuerzan empate
- [ ] UI del empate

## F7 — Exilio
- [ ] Un solo punto de control de exilio
- [ ] Inexiliable

## F8 — Mazos
- [ ] Límite de copias, Vínculo ×3, Única ×1 en `validarDeck`

## F9 — Cierre
- [ ] Auditar el intérprete efecto por efecto (hay tipos del esquema sin ejecutor)
- [ ] Matriz de casos borde
- [ ] Card-Maker: formulario de `modificar_regla`
- [ ] Regenerar manual impreso
