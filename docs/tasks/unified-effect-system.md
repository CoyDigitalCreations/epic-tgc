# Tasks: Unified Effect System — Card Maker

## Phase 1: Schema Expansion

- [ ] 1.1 Expand `EfectoData` interface in `src/shared/types/cards.ts` — add `campoAdicional`, `statsReserva` fields
- [ ] 1.2 Add `efectos: EfectoData[]` to all card type interfaces (CampeonCard, MisticaCard, ArcanaCard, EterCard, VinculoCard) — keep legacy fields as optional
- [ ] 1.3 Export new types from `src/shared/types/index.ts`

## Phase 2: EffectList Improvements

- [ ] 2.1 Improve `generateEffectText()` in `src/forge/components/EffectList.tsx` — better Spanish for Aurora-style effects (steal champion, release ether)
- [ ] 2.2 Add `campoAdicional` and `statsReserva` fields to `EffectField.tsx` — show conditionally based on effect type
- [ ] 2.3 Remove `texto` textarea from `EffectField.tsx` — replace with read-only preview of auto-generated text
- [ ] 2.4 Update `ALLOWED_EFFECTS` in `EffectList.tsx` — verify all types match expanded schema

## Phase 3: CardForm Integration

- [ ] 3.1 Remove all textarea effect fields from `src/forge/types/form-config.ts` — delete `efectoPasivo`, `efectoDisparo`, `efectoContinuo`, `efectoReserva`, `efectoPago`, `efectoBloqueo`, `condicion`, `recompensa` text fields
- [ ] 3.2 Add single `efectos` field of type `effect-list` to each card type config in `form-config.ts`
- [ ] 3.3 Handle `effect-list` field type in `src/forge/components/CardForm.tsx` — render EffectList component
- [ ] 3.4 Wire EffectList to read/write `draft.efectos[]` array

## Phase 4: CardPreview Update

- [ ] 4.1 Update `src/forge/components/CardPreview.tsx` — read from `efectos[].texto` instead of individual text fields
- [ ] 4.2 Handle multiple effects display (Pasivo + Disparo + Continuo) in preview
- [ ] 4.3 Verify preview shows correct text for all 5 card types

## Phase 5: Card Migration

- [ ] 5.1 Create migration script in `scripts/migrate-effects.ts` — read paquetes.ts, generate `efectos[]` from existing structured data
- [ ] 5.2 Run migration on all 65 cards — verify each card has valid `efectos[]` array
- [ ] 5.3 Update `src/shared/data/paquetes.ts` with migrated data
- [ ] 5.4 Add schema validation test — all cards must have valid `efectos[]`

## Phase 6: Engine Update

- [ ] 6.1 Update `costeEterHabilidad()` in `src/online/game/cards.ts` — read from `efectos[]` instead of `efectoDisparo` text
- [ ] 6.2 Update `campeonNecesitaEterBloqueado()` in `src/online/game/cards.ts` — read from `efectos[]`
- [ ] 6.3 Update `esContinuo()` in `src/online/game/cards.ts` — read from `efectos[]`
- [ ] 6.4 Run all existing engine tests — verify no regressions

## Phase 7: Cleanup

- [ ] 7.1 Remove legacy text field references from card type comments
- [ ] 7.2 Update `MazoEditor.tsx` — read effects from `efectos[]` instead of individual fields
- [ ] 7.3 Update `ActiveAbilitiesPanel.tsx` — read from `efectos[]` if applicable
- [ ] 7.4 Final TypeScript compilation check — zero errors
