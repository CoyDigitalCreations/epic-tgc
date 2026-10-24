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
- [ ] Definir eventos que abren ventana (pregunta abierta)
- [ ] Toda activación apila su efecto y resuelve al cierre (LIFO)
- [ ] Arcanas y Místicas con Presteza como respuestas
- [ ] Manual §9.6

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
