# Skill Registry — epic_tgc

Generado: 2026-08-10 · Modo: engram (SDD persistido en memoria, sin `openspec/`)

## Skills de proyecto

No hay skills a nivel proyecto (`.claude/skills/`, `.gemini/skills/`, `.agent/skills/`, `skills/`).

## Skills de usuario relevantes

| Skill | Descripción | Trigger | Ubicación |
|---|---|---|---|
| sdd-propose | Crear propuesta de cambio (intención, alcance, enfoque) | /sdd-propose | ~/.config/opencode/skills/sdd-propose |
| sdd-spec | Escribir especificaciones (requisitos + escenarios Given/When/Then) | /sdd-spec | ~/.config/opencode/skills/sdd-spec |
| sdd-design | Diseño técnico con decisiones de arquitectura | /sdd-design | ~/.config/opencode/skills/sdd-design |
| sdd-tasks | Desglose del cambio en tareas de implementación | /sdd-tasks | ~/.config/opencode/skills/sdd-tasks |
| sdd-apply | Implementar tareas del cambio (TDD) | /sdd-apply | ~/.config/opencode/skills/sdd-apply |
| sdd-verify | Validar implementación vs specs/design/tasks | /sdd-verify | ~/.config/opencode/skills/sdd-verify |
| sdd-archive | Sincronizar deltas y archivar cambio completado | /sdd-archive | ~/.config/opencode/skills/sdd-archive |
| branch-pr | Workflow de PR con sistema issue-first | Al crear PR | ~/.config/opencode/skills/branch-pr |
| issue-creation | Creación de issues GitHub (bug/feature) | Al crear issue | ~/.config/opencode/skills/issue-creation |
| judgment-day | Revisión adversarial paralela con 2 jueces | "judgment day", "doble review" | ~/.config/opencode/skills/judgment-day |
| go-testing | Patrones de test Go (Bubbletea TUI) | Tests Go | ~/.config/opencode/skills/go-testing |

## Convenciones del proyecto

- AGENTS.md global del usuario (~/.config/opencode/AGENTS.md): persona senior architect, español Rioplatense al hablar, textos del juego en español de México, conventional commits sin atribución AI, nunca build, verificar antes de afirmar.
- Proyecto: no hay CLAUDE.md / AGENTS.md / .cursorrules propios.
- Commits: conventional (`feat:`, `docs:`, `fix:`), atómicos por tema, sin AI attribution.
- Verificación estándar: `npx tsc -b` + `npm test` (vitest, 129 tests actuales).
