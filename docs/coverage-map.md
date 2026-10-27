# Mapa de Cobertura — Motor vs JSON (fuente de verdad: seed/FuenteEfectos.json)

Cartas: **65** | Efectos clasificados: **76** | Combos únicos (tipo×trigger×efecto): **52**

## Cobertura data-driven: **98.7%** de los efectos se ejecutan por el puro motor (interpreter/activación)

## Resumen por estado

| Estado | Efectos | % |
|---|---:|---:|
| OK_INTERPRETER | 26 | 34.2% |
| OK_ACTIVACION | 37 | 48.7% |
| OK_AURA_JSON | 12 | 15.8% |
| HUECO_NOOP | 1 | 1.3% |

## Matriz de combos (tipo × trigger × efecto)

| Combo | Cartas | Estados |
|---|---|---|
| `bloqueo` × `(sin trigger)` × `buff` | FB-007, FB-009, DS-008, DS-010 | OK_AURA_JSON |
| `bloqueo` × `(sin trigger)` × `grant_keyword` | FB-008, DS-009 | OK_AURA_JSON |
| `continuo` × `(sin trigger)` × `double_attack` | FB-015 | OK_ACTIVACION |
| `continuo` × `(sin trigger)` × `grant_keyword` | DS-001 | OK_ACTIVACION |
| `continuo` × `(sin trigger)` × `steal_champion` | FB-010 | OK_ACTIVACION |
| `continuo` × `(sin trigger)` × `toggle_exhaust+fix_exhaust` | FB-016 | OK_ACTIVACION |
| `disparo` × `(sin trigger)` × `buff` | DS-016 | OK_ACTIVACION |
| `disparo` × `(sin trigger)` × `destroy` | FB-010, FB-014, DS-001, DS-012, DS-013 | OK_ACTIVACION |
| `disparo` × `(sin trigger)` × `mover` | FB-017, DS-017 | OK_ACTIVACION |
| `disparo` × `(sin trigger)` × `return_hand` | DS-018 | OK_ACTIVACION |
| `disparo` × `(sin trigger)` × `toggle_exhaust` | FB-013 | OK_ACTIVACION |
| `disparo` × `ninguno` × `negar` | DS-014 | HUECO_NOOP |
| `hechizo` × `(sin trigger)` × `buff` | FB-020, FB-024, DS-021, DS-024 | OK_AURA_JSON, OK_ACTIVACION |
| `hechizo` × `(sin trigger)` × `copy` | FB-022 | OK_ACTIVACION |
| `hechizo` × `(sin trigger)` × `debuff` | DS-020, DS-023 | OK_ACTIVACION |
| `hechizo` × `(sin trigger)` × `destroy` | DS-019 | OK_ACTIVACION |
| `hechizo` × `(sin trigger)` × `draw` | FB-023, DS-023 | OK_ACTIVACION |
| `hechizo` × `(sin trigger)` × `invocar_y_equipar` | FB-032, DS-022 | OK_ACTIVACION |
| `hechizo` × `(sin trigger)` × `negar` | FB-021 | OK_ACTIVACION |
| `hechizo` × `(sin trigger)` × `return_hand` | FB-019 | OK_ACTIVACION |
| `hechizo` × `(sin trigger)` × `tutor` | DS-032, DS-033 | OK_ACTIVACION |
| `pago` × `(sin trigger)` × `block_ether` | FB-005, DS-006 | OK_ACTIVACION |
| `pago` × `al_pagar_eter` × `buff` | FB-001, FB-004, DS-005 | OK_INTERPRETER |
| `pago` × `al_pagar_eter` × `draw` | FB-003 | OK_INTERPRETER |
| `pago` × `al_pagar_eter` × `grant_keyword` | FB-002 | OK_INTERPRETER |
| `pago` × `al_pagar_eter` × `mover` | DS-007 | OK_INTERPRETER |
| `pago` × `al_pagar_eter` × `return_ether` | FB-006 | OK_INTERPRETER |
| `pago` × `al_pagar_eter` × `rival_discard` | DS-004 | OK_INTERPRETER |
| `pasivo` × `(sin trigger)` × `buff` | FB-010 | OK_AURA_JSON |
| `pasivo` × `(sin trigger)` × `grant_keyword` | DS-001 | OK_AURA_JSON |
| `pasivo` × `activacion` × `condicion` | DS-024 | OK_ACTIVACION |
| `pasivo` × `al_atacar` × `debuff` | DS-011 | OK_INTERPRETER |
| `pasivo` × `al_invocar` × `copy` | DS-015 | OK_INTERPRETER |
| `pasivo` × `al_matar_en_combate` × `mover` | FB-011 | OK_INTERPRETER |
| `pasivo` × `al_matar_en_combate` × `return_ether` | DS-012 | OK_INTERPRETER |
| `pasivo` × `al_ser_enviado_al_cementerio` × `tutor` | FB-012, FB-031, DS-031 | OK_INTERPRETER |
| `pasivo` × `cuando_vinculo_seria_destruido` × `prevent_destroy` | FB-018 | OK_ACTIVACION |
| `pasivo` × `inicio_alba` × `condicion` | FB-023, FB-024 | OK_ACTIVACION |
| `pasivo` × `inicio_choque` × `condicion` | DS-023, DS-032 | OK_ACTIVACION |
| `reserva` × `inicio_choque` × `grant_keyword` | DS-003 | OK_INTERPRETER |
| `reserva` × `ninguno` × `debuff` | DS-002 | OK_AURA_JSON |
| `vinculo` × `(sin trigger)` × `buff` | DS-030 | OK_AURA_JSON |
| `vinculo` × `(sin trigger)` × `debuff` | FB-030 | OK_AURA_JSON |
| `vinculo` × `inicio_alba` × `block_ether` | FB-025 | OK_INTERPRETER |
| `vinculo` × `inicio_alba` × `buff` | DS-025 | OK_INTERPRETER |
| `vinculo` × `inicio_alba` × `exile` | DS-029 | OK_INTERPRETER |
| `vinculo` × `inicio_alba` × `grant_keyword` | FB-028, DS-028 | OK_INTERPRETER |
| `vinculo` × `inicio_alba` × `mover` | FB-027 | OK_INTERPRETER |
| `vinculo` × `inicio_alba` × `return_hand` | FB-029 | OK_INTERPRETER |
| `vinculo` × `inicio_alba` × `rival_discard` | DS-026 | OK_INTERPRETER |
| `vinculo` × `inicio_choque` × `mover` | DS-027 | OK_INTERPRETER |
| `vinculo` × `inicio_choque` × `toggle_exhaust` | FB-026 | OK_INTERPRETER |

## Handlers por cardId (legacy) presentes en la data


## Detalle de NO-OK (huecos y parciales)

### HUECO_NOOP (1)

- **DS-014** Thane, Voz del Trueno (Campeón) — `disparo`×`ninguno`×`negar` [efectos]
  - Ruta: negar → executeEffect solo niega la activación pendiente de la ventana; tipoNegacion 'efecto_activo' no se lee
  - Falta implementar tipoNegacion 'efecto_activo' (hoy actúa como 'activacion'). Requiere decisión de diseño.
