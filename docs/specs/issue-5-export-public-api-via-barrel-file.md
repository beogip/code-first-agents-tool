---
issue_number: 5
issue_title: "[#1] feat: export public API via barrel file"
repo: "beogip/code-first-agents-tool"
labels: [enhancement]
plan_level: "lean"
depth: "medium"
branch_name: "feat/5-export-public-api-via-barrel-file"
created_at: "2026-05-23T00:00:00Z"
---

# Implementation Plan: #5 — [#1] feat: export public API via barrel file

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | modify | `src/index.ts` | Add re-exports for `parseArgs` and `validateInput` from `args.ts` |

## Codebase Context

- `src/index.ts` is already a well-formed barrel file with most required exports in place
- `src/args.ts` exports `parseArgs`, `validateInput`, and `RESERVED_SUBCOMMANDS` (last is intentionally internal)
- `tsconfig.json` enforces `verbatimModuleSyntax` (requires `export type` for type-only exports) and `allowImportingTsExtensions` (`.ts` extensions in imports)
- `package.json` configures `exports["."].import` → `./dist/index.js` and `types` → `./dist/index.d.ts`

## Steps

1. **Add `parseArgs` and `validateInput` re-exports to `src/index.ts`**
   Add `export { parseArgs, validateInput } from "./args.ts";` to the barrel file, positioned logically near the args-related type exports.
   **Done when:** `export { parseArgs, validateInput } from "./args.ts";` is present in `src/index.ts`

2. **Verify TypeScript compiles and tests pass**
   Run `bun run build` and `bun test` to confirm no regressions.
   **Done when:** `bun run build` exits 0 AND `bun test` exits 0

## Interfaces

N/A — no new interfaces needed.

## Function Design

N/A — no new functions; only re-exports.

## Acceptance Criteria (EARS)

- **AC-1** (ubiquitous): `src/index.ts` shall export the values: `Tool`, `ToolError`, `l1Output`, `l2Output`, `l3Output`, `parseArgs`, `validateInput`
- **AC-2** (ubiquitous): `src/index.ts` shall export the types: `HandlerReturn`, `ParsedArgs`, `SubcommandSpec`, `ToolMeta`
- **AC-3** (event-driven): When a consumer writes `import { Tool, l1Output } from "@code-first-agents/tool"`, TypeScript shall resolve the imports without error

## Out of Scope

- Removing existing extra exports (`ErrorEnvelope`, `HelpPayload`, `buildHelpPayload`, etc.) — issue only mandates presence of the listed items
- Adding new tests specifically for `parseArgs`/`validateInput` — they already have coverage via `Tool.run` integration tests

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|---------|
| 1 | `parseArgs`/`validateInput` may be implementation details | [from issue] | Include — issue explicitly lists them in acceptance criteria |
| 2 | Removing an export later is a breaking change | [from issue] | Intentional API surface — all listed exports reviewed and confirmed |
| 3 | `verbatimModuleSyntax` requires `export type` for type-only exports | [inferred] | `parseArgs`/`validateInput` are values, not types → use plain `export` |
| 4 | Extra exports already in index.ts beyond the required list | [inferred] | Keep — issue does not ask for removal, and existing consumers may depend on them |

## Done Criteria per Feature

| Feature | Done when |
|---------|-----------|
| Barrel file re-exports complete | AC-1, AC-2, AC-3 |

## Risks

| Risk | Mitigation |
|------|-----------|
| `parseArgs` and `validateInput` become part of public semver contract once exported | Issue explicitly requires them; kael.factory's barrel also exports them as public API |

## Test Strategy

- Run `bun run build` to verify TypeScript compilation succeeds with new exports
- Run `bun test` to verify no regressions in existing tests
- Inspect `dist/index.d.ts` to confirm `parseArgs` and `validateInput` appear in type declarations
