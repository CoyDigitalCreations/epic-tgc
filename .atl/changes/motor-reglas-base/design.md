# Diseño — Motor de reglas base + modificadores

Estado: **en curso** · Creado: 2026-10-23 · Decisiones del usuario: Engram #1912 (`decision/reglas-base-y-modificadores`)

## 1. Objetivo

Que el motor sea **data-driven de verdad**: el manual es el cimiento y el *fallback*;
cualquier efecto de carta puede modificar o romper una regla y, si lo hace, **gana el efecto**.

> Ejemplo guía: una carta permite bloquear hasta 3 Éter. Otro efecto permite un cuarto.
> El motor no debe saber nada de ninguna de las dos cartas: solo que "el tope de Éter bloqueado"
> es una regla con valor base y que algo la modificó.

### Doctrina de capas (ya vigente desde 2026-10-22, ahora con arquitectura explícita)

| Capa | Qué es | Quién gana |
|---|---|---|
| 1 | **Manual**: valor base de cada regla | Pierde ante la Capa 2 |
| 2 | **Efectos del Card-Maker**: modifican reglas | Gana al manual |
| — | **Cero cartas hardcodeadas**: el JSON es la única verdad | — |

## 2. Estado actual (auditoría 2026-10-23, Engram #1911)

Las excepciones a las reglas están **dispersas y hardcodeadas**: `LIMITE_MANO` en `zones.ts`
(y un `> 6` literal en `partida.ts`), "agotados sí bloquean" en `combat.ts:88`, el tope de Éter
sale solo de `costo.cantidad` del propio efecto, etc. No hay un lugar donde un efecto pueda
decir "esta regla cambia".

Divergencias confirmadas con evidencia (todas se corrigen pasando por la nueva capa):

1. Los agotados bloquean (manual §9.3: no).
2. El Campeón invocado entra agotado (manual §5.2: entra enderezado, con *invocación cansada*).
3. "Paga y Agota" no agota (manual §5.2/§7.4/§8.3a: agota).
4. El motor no valida límites de copias ni "Vínculo ×3".
5. ~~Carga en el primer turno~~ → **no era un bug**: el motor ya aplica "nadie ataca en el primer turno *del juego*".

## 3. Arquitectura

### 3.1 Catálogo de reglas (`src/shared/rules/reglas.ts`, puro y compartido)

Cada regla del manual que un efecto pueda alterar es una entrada con:

| Campo | Significado |
|---|---|
| `id` | Identificador estable (`agotadoPuedeBloquear`) |
| `manual` | Sección del manual que la define (`§9.3`) |
| `ambito` | A quién afecta: `partida`, `jugador`, `campeon` o `carta` |
| `tipo` | `numero` o `booleano` |
| `base` | **El valor del manual** (el fallback) |

Vive en `shared` porque el Card-Maker necesita el mismo catálogo para ofrecer las reglas en su formulario.

### 3.2 Resolución (función pura, testeable sin motor)

```
valor = base
numero:   si hay 'fijar'  → toma el más reciente; luego suma todos los 'sumar'; acota a [min, max]
booleano: si hay 'prohibir' → false;  si no, si hay 'permitir' → true;  si no, base
```

**Precedencia** (decisión de diseño, ajustable): *lo que prohíbe gana a lo que permite*
(el mismo criterio de los TCG clásicos). Entre dos `fijar`, gana el más reciente.

### 3.3 De dónde salen los modificadores (todo **estado derivado**, sin estado que limpiar)

1. **Keywords** → una tabla `KEYWORD_REGLAS` las traduce a modificadores:
   `Carga` → `invocacionCansada: prohibir`, `Vigor` → `atacarAgota: prohibir`,
   `Tirador` → `disparoAgota: prohibir`, `Inexiliable` → `puedeSerExiliada: prohibir`,
   `Inmortal` y `Indestructible` igual. **Una keyword es azúcar para una regla modificada.**
   Esto cubre las keywords otorgadas temporalmente (ya viven en `keywordsDe`).
2. **Efectos `modificar_regla`** de cartas en juego, con la misma activación que ya usan las auras:
   campo, Éter en Reserva/pagado/bloqueado, Vínculo destruido y `mientras_ester_bloqueado`.
3. **Modificadores temporales** (`GameState.reglasTemporales`) para efectos de resolución
   ("este turno puedes…"), con el mismo ciclo de expiración que `modificadores` (`ocaso`,
   `alba-dueño`, `hasta-fase`, `turnosRestantes`).

### 3.4 Consumo

El motor lee **siempre** `reglaVigente(estado, regla, sujeto)`. Ningún módulo del motor vuelve a
llevar un literal de regla. Un test guardia lo vigila.

### 3.5 Esquema del efecto

```jsonc
{ "tipo": "pasivo", "efecto": "modificar_regla",
  "regla": { "id": "eterBloqueadoExtra", "operacion": "sumar", "valor": 1 },
  "objetivo": { "tipo": "equipped_champion", "controlador": "propio", "zona": "campo" } }
```

## 4. Catálogo inicial (v1)

| Regla | Ámbito | Base | Manual | Keyword / efecto asociado |
|---|---|---|---|---|
| `limiteMano` | jugador | 6 | §7.1, §8.5 | |
| `cartasPorAlba` | jugador | 1 | §8.2 | |
| `rupturasPorTurno` | jugador | 1 | §9.4 | |
| `atacarTrasRuptura` | jugador | no | §9.4 | decisión 8 |
| `primerTurnoSinAtaques` | partida | sí | §8.6 | |
| `agotadoPuedeBloquear` | campeón | no | §9.3 | |
| `invocacionCansada` | campeón | sí | §9.2 | Carga |
| `atacarAgota` | campeón | sí | §9.2 | Vigor |
| `disparoAgota` | campeón | sí | §5.2, §8.3a | Tirador |
| `ataquesPorTurno` | campeón | 1 | §9.2 | doble ataque |
| `bloqueosPorTurno` | campeón | 1 | §9.3 | |
| `puedeSerExiliada` | campeón | sí | §10 | Inexiliable |
| `puedeSerDestruidaPorEfecto` | campeón | sí | §10 | Inmortal |
| `puedeSerDestruidaEnBatalla` | campeón | sí | §10 | Indestructible |
| `eterBloqueadoExtra` | carta | 0 | §7.7 | tope = `costo.cantidad` + extra |

## 5. Plan por fases

| Fase | Contenido | Cambia el juego |
|---|---|---|
| **F0** | Manual: regla de oro, Tirador, Inexiliable, primer turno, agotar/disparo, doble ataque/Ruptura, sexto Vínculo, cadena general | Solo documento |
| **F1** | Catálogo + resolución + derivación + esquema + keywords nuevas | No |
| **F2** | Estado del Campeón: *cansado* ≠ *agotado*; agotado no bloquea; Paga y Agota agota; Tirador; Disparo sin "1 vez por turno" | Sí |
| **F3** | Combate: una sola Ruptura por turno y sin más ataques; bloqueos por turno; prioridad del defensor | Sí |
| **F4** | Orden del Alba según el manual; rediseño del Pasivo 1A | Sí |
| **F5** | **Pila general**: toda activación abre ventana; la carta que abre resuelve **última** | Sí |
| **F6** | Fin de partida: sexto Vínculo puede prevenir la derrota o forzar empate | Sí |
| **F7** | Inexiliable y todos los caminos de exilio por un solo punto de control | Sí |
| **F8** | Validación de mazos (copias, Vínculo ×3, Única ×1) en el motor | Sí |
| **F9** | Auditoría del intérprete efecto por efecto + matriz de casos borde + Card-Maker + manual impreso | — |

Cada fase termina con: tests verdes, `tsc` limpio, manual actualizado y **un commit propio**.

## 6. Estrategia de pruebas

- **Una prueba por regla del manual**, atada a su id del catálogo (la regla base) y otra de **override**
  (un efecto la modifica). Un test recorre el catálogo y falla si alguna regla no tiene ambas.
- Las pruebas de efectos son **genéricas por tipo de efecto**, no por carta.
- Guardia anti-literales: ningún módulo del motor puede usar `LIMITE_MANO`/`6`/`ataque` hardcodeado.

## 7. Preguntas abiertas

- **F5**: qué eventos abren ventana de respuesta (¿también la invocación y los efectos disparados?).
- **F6**: cómo expresa una carta "evita la derrota" y "fuerza empate".

## 8. Riesgos

- F2 cambia el ritmo del juego (atacar cuesta defensa). Rompe tests que hoy afirman lo contrario
  (`combat.test.ts:319-364`, `invocar.test.ts:127`): se reescriben con cita correcta al manual.
- F5 toca la cadena entera. Va aislada y con el motor de cadena existente como referencia.
- El bot (`botStrategies.ts`) asume las reglas actuales; hay que reentrenar sus heurísticas.
