---
issue_number: 4
issue_title: "[#1] feat: bundle required utils (stringifyError, jsonOutput, ToolOutput)"
repo: "beogip/code-first-agents-tool"
labels: [enhancement]
plan_level: "lean"
depth: "medium"
branch_name: "feat/4-bundle-required-utils"
created_at: "2026-05-23T12:00:00Z"
---

# Implementation Plan: #4 — [#1] feat: bundle required utils (stringifyError, jsonOutput, ToolOutput)

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | modify | `src/index.ts` | Re-export `jsonOutput` + `stringifyError` from `./utils.ts` |
| 2 | create | `tests/utils.test.ts` | Dedicated unit tests for the 3 utils exports |
| 3 | verify | `src/utils.ts` | Already exists on epic branch; verify contents match ACs |

## Codebase Context

- `src/utils.ts` already exists on `feat/1-implement-code-first-agentstool-package` with `ToolOutput`, `jsonOutput`, `stringifyError` — created as part of PR #9 (issue #3)
- `tool-class.ts` imports `{ jsonOutput, type ToolOutput }` from `"./utils.ts"`
- `envelopes.ts` imports `{ stringifyError }` from `"./utils.ts"`
- `biome.json` has `noConsole: "warn"` — `jsonOutput` already carries a `biome-ignore` comment
- `tsconfig.json` has `verbatimModuleSyntax: true` — type-only imports must use `import type`
- Build command: `bun build src/index.ts --outdir dist --target bun`
- Package has zero kael.factory references in any `src/` file

## Steps

1. **Create branch from epic branch**
   Create `feat/4-bundle-required-utils` from `feat/1-implement-code-first-agentstool-package` HEAD (4d80253).
   **Done when:** `git log --oneline -1` shows commit `4d80253` as the starting point.

2. **Verify `src/utils.ts` exports match acceptance criteria**
   Confirm file exports `ToolOutput` type, `jsonOutput` function, and `stringifyError` function.
   **Done when:** All 3 exports are present and match the kael.factory originals (minus unused helpers).

3. **Update `src/index.ts` to re-export `jsonOutput` and `stringifyError`**
   Add `export { jsonOutput, stringifyError } from "./utils.ts"` alongside the existing `export type { ToolOutput }` line.
   **Done when:** `index.ts` exports all 3 utils items and `bunx tsc --noEmit` passes.

4. **Create `tests/utils.test.ts` with unit tests**
   Test `stringifyError` with Error, string, null, undefined, number, and plain object inputs.
   Test `jsonOutput` by mocking `process.exit` and capturing `console.log` to verify JSON serialization.
   **Done when:** `bun test` passes with all new tests green.

## Interfaces

- `ToolOutput`: `{ ok: boolean; message: string; [key: string]: unknown }` — already defined in `src/utils.ts`, no changes needed.

## Function Design

- `src/utils.ts`: `jsonOutput(data: ToolOutput): never` — serialize ToolOutput envelope to stdout as JSON and terminate with exit code 0
- `src/utils.ts`: `stringifyError(err: unknown): string` — coerce an unknown caught value to a human-readable string, preserving Error.message when available

## Acceptance Criteria (EARS)

- **AC-1.** `src/utils.ts` shall export `stringifyError` function, `jsonOutput` function, and `ToolOutput` type. [from issue]
- **AC-2.** When `tool-class.ts` and `envelopes.ts` reference utils, they shall import from `./utils.ts` (local path, not kael.factory). [from issue]
- **AC-3.** The package shall have zero runtime dependency on kael.factory. [from issue]

## Out of Scope

- Adding `jsonError`, `jsonEscape`, `fail`, or other utils from kael.factory not mentioned in the issue
- Modifying `tool-class.ts` or `envelopes.ts` import paths (already correct on epic branch)

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | `stringifyError` receives `null` | [inferred] | `String(null)` returns `"null"` |
| 2 | `stringifyError` receives `undefined` | [inferred] | `String(undefined)` returns `"undefined"` |
| 3 | `stringifyError` receives non-Error object | [inferred] | `String(obj)` returns `"[object Object]"` |
| 4 | `jsonOutput` calls `process.exit(0)` | [inferred] | Tests must mock `process.exit` to avoid killing the test runner |

## Done Criteria per Feature

| Feature | Done when |
|---------|-----------|
| Utils exported from `src/utils.ts` | AC-1 — file exports all 3 items, type-check passes |
| Local imports in tool modules | AC-2 — grep confirms `tool-class.ts` and `envelopes.ts` import from `./utils.ts` |
| Zero kael.factory dependency | AC-3 — no kael.factory entry in `package.json`, no kael.factory imports in `src/` |

## Risks

| Risk | Mitigation |
|------|------------|
| Worktree is on initial commit, not epic branch | Must create/checkout branch from epic branch HEAD before starting work |
| PR #9 (issue #3) may have introduced `src/utils.ts` with different API than expected | Verified: exact match with issue #4 ACs — `ToolOutput`, `jsonOutput`, `stringifyError` |

## Test Strategy

- **Unit tests** in `tests/utils.test.ts`:
  - `stringifyError`: test with `Error`, `string`, `null`, `undefined`, `number`, plain object
  - `jsonOutput`: mock `process.exit`, spy on `console.log`, verify JSON envelope output
- **Type check**: `bunx tsc --noEmit` (all files compile cleanly)
- **Lint**: `bunx biome check .` (no warnings except expected `biome-ignore` for `console.log`)
- **Full suite**: `bun test` (existing tests from issue #3 + new utils tests must pass)
