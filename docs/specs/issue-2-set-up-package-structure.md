---
issue_number: 2
issue_title: "[#1] feat: set up package structure"
repo: "beogip/code-first-agents-tool"
labels: [enhancement]
plan_level: "lean"
depth: "medium"
branch_name: "feat/2-set-up-package-structure"
created_at: "2026-05-21T20:45:00-03:00"
---

# Implementation Plan: #2 — [#1] feat: set up package structure

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | modify | `package.json` | Rename to `@code-first-agents/tool`, set v0.1.0, MIT license, add zod dep, add exports field |
| 2 | modify | `LICENSE` | Replace Apache-2.0 with MIT text |
| 3 | modify | `README.md` | Update from template description to `@code-first-agents/tool` |
| 4 | modify | `src/index.ts` | Replace template greet function with empty barrel export |

## Codebase Context

- `tsconfig.json` already Bun-compatible (ESNext, bundler resolution, bun-types) — no changes needed
- `biome.json` already fully configured — no changes needed
- `src/` and `tests/` directories already exist — no changes needed
- `lefthook.yml` enforces conventional commits + biome check — all commits must follow this
- CI (`.github/workflows/ci.yml`) runs `bun test` — keep aligned

## Steps

1. **Update package.json** → `package.json`
   - Set `name` to `@code-first-agents/tool`
   - Set `version` to `0.1.0`
   - Set `license` to `MIT`
   - Add `zod` as runtime dependency
   - Add `exports` field for library distribution
   - Update `description`
   - **Done when:** `jq '.name, .version, .license' package.json` outputs `@code-first-agents/tool`, `0.1.0`, `MIT`

2. **Replace LICENSE file with MIT text** → `LICENSE`
   - Replace full Apache-2.0 text with MIT license text
   - Copyright holder: Juan Gipponi
   - **Done when:** LICENSE contains "MIT License" header with correct copyright year (2026)

3. **Update README.md** → `README.md`
   - Replace template description with `@code-first-agents/tool` project info
   - **Done when:** README.md references `@code-first-agents/tool` and does not reference "bun-ts-template"

4. **Replace template code with barrel export** → `src/index.ts`
   - Remove greet function
   - Leave as empty barrel export placeholder
   - **Done when:** `src/index.ts` is a valid empty/placeholder module (no greet function)

5. **Run bun install and verify** → `bun.lock`
   - Run `bun install` to resolve new zod dependency
   - Update tests if needed (greet function removed)
   - **Done when:** `bun install` exits 0 and zod appears in `node_modules`

## Interfaces

N/A — this is a package scaffolding issue, no domain types yet.

## Function Design

N/A — no application logic in this issue.

## Acceptance Criteria (EARS)

- **AC-1.** The `package.json` SHALL have name `@code-first-agents/tool`, version `0.1.0`, and license field `MIT`.
- **AC-2.** The `tsconfig.json` SHALL be configured for TypeScript with Bun-compatible settings (ESNext target, bundler moduleResolution, bun-types).
- **AC-3.** The `src/` and `tests/` directories SHALL exist in the repository root.
- **AC-4.** When `bun install` is executed, the command SHALL exit with code 0 and produce no errors.
- **AC-5.** The `package.json` SHALL declare `zod` as a runtime dependency.

## Out of Scope

- **vitest config:** repo uses `bun:test` natively; no migration to vitest (`bun:test` is Bun-idiomatic and already integrated in CI)
- **npm publish / scope creation:** issue notes this as a future concern
- **Build output / library distribution:** exports field added but full build pipeline is deferred

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | npm scope `@code-first-agents` doesn't exist | [from issue] | Scope only needed at publish time — no action now, noted in Risks |
| 2 | `bun.lock` conflicts after dep changes | [inferred] | Run `bun install` to regenerate; commit updated `bun.lock` |
| 3 | lefthook pre-commit rejects formatting | [inferred] | All new/modified files pass through biome check before commit |

## Done Criteria per Feature

| Feature | Done when |
|---------|-----------|
| Package identity | AC-1, AC-4 |
| TypeScript config | AC-2 (already satisfied, verify no regression) |
| Directory structure | AC-3 (already satisfied, verify no regression) |
| Zod dependency | AC-4, AC-5 |
| License compliance | AC-1 (MIT field + LICENSE file) |

## Risks

1. **Epic branch doesn't exist yet** → must create `feat/1-implement-code-first-agentstool-package` from main first
   - *Mitigation:* create the epic branch before branching for this issue
2. **`@code-first-agents` npm scope not created** → blocks future publish
   - *Mitigation:* out of scope for this issue; document in README

## Test Strategy

- **Structural:** verify `package.json` fields via `jq` assertions
- **Functional:** `bun install` exits 0
- **Regression:** `bun test` still passes (existing tests may need update since `src/index.ts` changes)
- **Lint:** `bunx biome check .` exits 0
