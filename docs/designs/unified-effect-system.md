# Design: Unified Effect System — Card Maker

## Technical Approach

Replace the dual text+structured system with a single structured-only system. `EffectList` becomes the ONLY effect editor. Text fields are auto-generated from `EfectoData` fields — never manually written. The `EfectoData` schema expands to cover all 65 card patterns.

## Architecture Decisions

### Decision: Remove all effect TextAreas from CardForm

**Choice**: Delete `efectoPasivo`, `efectoDisparo`, `efectoContinuo`, `efectoReserva`, `efectoPago`, `efectoBloqueo`, `condicion`, `recompensa` text fields from FORM_CONFIGS.

**Alternatives considered**: Keep TextAreas as "override" — rejected because it creates dual-source-of-truth bugs.

**Rationale**: The `texto` field in EfectoData + `generateEffectText()` already produces human-readable text. Manual text breaks sync with structured data.

### Decision: EffectList replaces per-zone EffectField instances

**Choice**: Single `EffectList` component per card, NOT individual EffectField per zone.

**Alternatives considered**: Keep per-zone layout — rejected because it doesn't support "add effect" with type constraints.

**Rationale**: EffectList already has ALLOWED_EFFECTS, add/remove, accordion. Just needs wiring.

### Decision: CardPreview reads from auto-generated text, not raw EfectoData

**Choice**: `generateEffectText()` produces the display string. CardPreview reads from a derived `efectosTexto` field on the card.

**Alternatives considered**: CardPreview parses EfectoData directly — rejected because rendering logic belongs in the forge, not the preview component.

**Rationale**: Keeps CardPreview simple. Text generation is centralized in one function.

### Decision: Expand EfectoData schema for missing patterns

**Choice**: Add fields to cover Aurora's "steal champion" + "conditional release ether" patterns.

**New fields**:
- `campoAdicional?: string` — free-text for edge cases (e.g., "Éter regresa a reserva")
- `statsReserva?: { ATQ?: number; RES?: number }` — stats while blocked vs while in reserve
- `condicion Activacion?: string` — when to activate (replaces separate `condicion` field)

**Rationale**: The current schema covers 90% of patterns. The remaining 10% need 2-3 extra fields, not a full redesign.

## Data Flow

```
CardForm
  ├── reads draft.efectos: EfectoData[]  (array, NOT per-zone fields)
  ├── renders EffectList(cardType, effects, onChange)
  │     ├── EffectField #1 (tipo=pasivo, trigger, objetivo, efecto, stats...)
  │     ├── EffectField #2 (tipo=continuo, costoTipo, objetivo, stats...)
  │     └── "+ Agregar Efecto" button (only shows available types)
  ├── auto-generates: draft.efectos[].texto = generateEffectText(data)
  └── saves to JSON: { efectos: [...], ... }

CardPreview
  ├── reads draft.efectos[].texto
  └── renders: "Pasivo: {texto1}\nContinuo: {texto2}"

Engine
  ├── reads draft.efectos[] (structured data)
  └── ignores .texto (display only)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/shared/types/cards.ts` | Modify | Add `efectos: EfectoData[]` to all card interfaces. Keep legacy fields as optional for backward compat. Add new fields to EfectoData. |
| `src/forge/types/form-config.ts` | Modify | Remove all textarea effect fields. Add single `efectos` field of type `effect-list`. |
| `src/forge/components/EffectList.tsx` | Modify | Improve `generateEffectText()` for better Spanish. Add "Agregar Efecto" with type constraints. Add preview of auto-generated text per effect. |
| `src/forge/components/CardForm.tsx` | Modify | Handle `effect-list` field type. Wire EffectList as the only effect editor. |
| `src/forge/components/CardPreview.tsx` | Modify | Read from `efectos[].texto` instead of individual text fields. |
| `src/forge/components/fields/EffectField.tsx` | Modify | Remove `texto` textarea (auto-generated only). Add new fields (campoAdicional, statsReserva). |
| `src/shared/data/paquetes.ts` | Modify | Migrate all 65 cards: generate `efectos[]` from existing structured data. |
| `src/online/game/cards.ts` | Modify | Update `costeEterHabilidad()` and `campeonNecesitaEterBloqueado()` to read from `efectos[]`. |

## Interfaces / Contracts

```typescript
// Expanded EfectoData
export interface EfectoData {
  tipo: 'pasivo' | 'continuo' | 'disparo' | 'reserva' | 'pago' | 'bloqueo' | 'hechizo' | 'vinculo'
  costoTipo?: 'ninguno' | 'eter' | 'eter_bloqueado' | 'exhaust'
  costoMax?: number
  objetivo?: string  // expanded: now includes all patterns
  efecto?: string    // expanded: now includes steal_champion, etc.
  stats?: { ATQ?: number; RES?: number }
  keyword?: string
  duracion?: string
  trigger?: string
  condicion?: string
  maxObjetivos?: number
  texto?: string     // AUTO-GENERATED, not user-editable
  // New fields for edge cases:
  campoAdicional?: string     // "Éter regresa a reserva", etc.
  statsReserva?: { ATQ?: number; RES?: number }  // stats while in different state
}

// New card interface addition
export interface CampeonCard extends CardMeta {
  // ... existing fields ...
  efectos: EfectoData[]  // NEW: unified effect list
  // Legacy fields kept as optional for migration:
  efectoPasivo?: string
  efectoDisparo?: string
  efectoContinuo?: string
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `generateEffectText()` output for each card type | Snapshot tests with Aurora, Korr, Cassandra examples |
| Unit | `ALLOWED_EFFECTS` constraints (can't add duplicate types) | Test add/remove flows |
| Integration | CardForm → EffectList → CardPreview text sync | Render test: fill fields, verify preview shows correct text |
| Integration | Engine reads `efectos[]` correctly | Existing engine tests must pass |
| Migration | All 65 cards in paquetes.ts have valid `efectos[]` | Schema validation test |

## Migration / Rollout

1. **Phase 1**: Expand EfectoData schema + add `efectos[]` to card interfaces (backward compat)
2. **Phase 2**: Wire EffectList into CardForm, remove TextAreas
3. **Phase 3**: Update CardPreview to read from `efectos[].texto`
4. **Phase 4**: Migrate 65 cards in paquetes.ts (script to auto-generate `efectos[]` from existing data)
5. **Phase 5**: Update engine functions to prefer `efectos[]` over legacy fields
6. **Phase 6**: Remove legacy text fields (breaking change — do last)

## Open Questions

- [ ] Should `condicion` for Arcanas be a separate field or part of `efectos[]`?
- [ ] How to handle Aurora's "steal champion" + "release on leave" combo? One effect or two?
- [ ] Should we use Google API for text generation or keep `generateEffectText()` pure?
