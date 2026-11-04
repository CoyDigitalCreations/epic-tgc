# Skill Registry — epic-tgc

Generado: 2026-11-03 · Modo: engram (SDD persistido en memoria, sin `openspec/`)

## Skills de proyecto

No hay skills a nivel proyecto (`.claude/skills/`, `.gemini/skills/`, `.agent/skills/`, `skills/`).

## Skills de usuario (~/.claude/skills)

| Skill | Descripción | Trigger |
|---|---|---|
| branch-pr | Workflow de PR con sistema issue-first | Al crear un PR |
| issue-creation | Creación de issues GitHub (bug/feature) | Al crear issue |
| judgment-day | Revisión adversarial paralela con 2 jueces ciegos | "judgment day", "doble review", "juzgar" |
| go-testing | Patrones de test Go / Bubbletea | Tests Go (no aplica a este proyecto) |
| skill-creator | Crear nuevas skills de agente | Crear skill |
| gepeto / pinokio | Launchers Pinokio | No aplican a este proyecto |

Fases SDD (sdd-init/explore/propose/spec/design/tasks/apply/verify/archive/onboard) y skill-registry: las gestiona el orquestador.

## Convenciones del proyecto

- Texto del proyecto/UI en español neutro de México (tuteo); nunca voseo rioplatense.
- Commits: `[SLA]: <emoji> (<tipo>) descripción`; SIN atribución de IA ni Co-Authored-By.
- NUNCA ejecutar build (`tsc -b` / `vite build`) tras cambios. Sí se corren tests: `npm test` / `npx vitest run <archivo>`.
- Tests de efectos de cartas se ajustan al final; código NUEVO (p. ej. `src/balance/`) se desarrolla con TDD.
- Fuente de datos de cartas: `seed/FuenteEfectos.json` vía `src/shared/data/paquetes.ts`.
- `.atl/changes/` (motor-reglas-base, change-3-campeones, archive): no modificar.
- `handoff-opencode.md`: permanente, nunca trackear/commitear/borrar.
- No hay CLAUDE.md / AGENTS.md / .cursorrules propios en el proyecto.

## Testing

- Runner: vitest 4 (`npm test` = `vitest run`), entorno jsdom, globals, setup `src/test-setup.ts`.
- Linter: oxlint (`npm run lint`). Typecheck: `npx tsc -b` (solo si el usuario lo pide; regla: no build tras cambios).
- Strict TDD: activo.
