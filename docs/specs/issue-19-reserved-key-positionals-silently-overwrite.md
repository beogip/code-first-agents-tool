---
issue_number: 19
issue_title: "Reserved _ key: positionals silently overwrite an explicit --_ flag"
repo: "beogip/code-first-agents-tool"
labels: [claude]
plan_level: "lean"
depth: "standard"
branch_name: "claude/issue-19-20260608-0304"
created_at: "2026-06-08T03:05:00Z"
---

# Implementation Plan: #19 — Reserved `_` key: positionals silently overwrite an explicit `--_` flag

## Files

| File | Change |
|------|--------|
| `src/args.ts` | Emit a loud stderr warning in `validateInput` when both an explicit `--_` flag and positional args are present; document `_` as reserved. |
| `src/types.ts` | Document `_` as a reserved key in `ParsedArgs` and `SubcommandSpec.input` JSDoc. |
| `tests/args.test.ts` | Add unit tests asserting the warning fires only when both are present (spy on `process.stderr.write`). |
| `tests/fixtures/dummy-tool.ts` | Add an `echoArgs` subcommand whose input schema declares the reserved `_` key. |
| `tests/cli.test.ts` | Add a black-box test asserting the warning reaches stderr and positionals win on stdout. |

## Codebase Context

- `validateInput` (`src/args.ts:116`) merges flags then sets `toValidate._ = positional` when positionals exist — the exact silent-overwrite site.
- The library's design principle is **loud failure modes** (per spec + CLAUDE.md). stdout is reserved for the JSON envelope (`jsonOutput`), so warnings belong on **stderr**.
- `process.stderr.write` is already used by the `sideEffect` fixture handler and is not flagged by Biome's `noConsole` rule (which only targets `console.*`).
- `invoke()` bypasses `validateInput` (it calls `spec.input.safeParse` directly), so the CLI path is the only one affected — correct scope for the warning.

## Steps

1. In `validateInput`, when `parsed.positional.length > 0` and `parsed.flags` owns key `_`, write a warning to `process.stderr` before the overwrite. **Done when:** the warning fires only when both are present.
2. Document `_` as reserved in `validateInput`, `ParsedArgs`, and `SubcommandSpec.input` JSDoc. **Done when:** docs name `_` as reserved-for-positionals.
3. Add unit tests spying on `process.stderr.write`. **Done when:** tests assert warning present-with-both / absent-otherwise.
4. Add `echoArgs` fixture subcommand + CLI black-box test. **Done when:** stderr carries the warning and stdout shows positionals winning.

## Acceptance Criteria (EARS)

- **AC-1:** When both an explicit `--_` flag and positional args are present, the system shall write a warning to stderr naming `_` as reserved.
- **AC-2:** When only positionals (no `--_`) OR only `--_` (no positionals) are present, the system shall NOT write the warning.
- **AC-3:** The system shall preserve existing behavior — positional args overwrite the `--_` flag value (no breaking change).
- **AC-4:** The warning shall go to stderr only; stdout shall continue to carry only the JSON envelope.

## Out of Scope

- Changing the overwrite behavior itself (positionals continue to win — backward compatible).
- Erroring/exiting non-zero on collision (violates always-exit-0 contract).

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | `--_ v` present, no positionals | [inferred] | No warning; `_` flag passes through to schema. |
| 2 | positionals present, no `--_` | [from issue] | No warning; normal positional attachment. |
| 3 | both present | [from issue] | Warn on stderr, positionals win. |

## Done Criteria per Feature

| Feature | ACs |
|---------|-----|
| Loud-warn on `_` collision | AC-1, AC-2, AC-3, AC-4 |

## Risks

- Test flakiness from stderr spying — mitigated by also asserting via the subprocess CLI test.

## Test Strategy

- Unit: `spyOn(process.stderr, "write")` in `args.test.ts`.
- Black-box: subprocess `echoArgs` test asserting stderr + stdout in `cli.test.ts`.
