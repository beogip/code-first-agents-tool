---
issue_number: 6
issue_title: "[#1] test: set up test suite and port Tool.ts tests"
repo: "beogip/code-first-agents-tool"
labels: [enhancement]
plan_level: "full"
depth: "medium"
branch_name: "feat/6-test-setup-and-port-tool-tests"
created_at: "2026-05-23T12:00:00Z"
---

# Implementation Plan: #6 — [#1] test: set up test suite and port Tool.ts tests

> **Note:** The issue mentions `vitest.config.ts` but the project uses `bun:test` (no vitest dependency). This plan interprets the AC as "test suite configured and runnable via `bun test`" — which is already the case. No vitest will be added.

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | create | tests/args.test.ts | parseArgs + validateInput test coverage |
| 2 | modify | tests/index.test.ts | Expand coverage for envelopes, schema/help depth, non_object_return, schema_violation, edge cases |

## Codebase Context

- `bun:test` is the test runner (not vitest); imports: `describe`, `expect`, `it`, `mock`, `beforeEach`, `afterEach`
- Biome for linting/formatting (double quotes, 2-space indent, trailing commas)
- ESM module system with `.ts` extensions in imports
- Existing test pattern: inline fixtures per `it()` block, no shared fixture files
- Mock pattern: `mock()` from `bun:test`, restore in `afterEach`
- zod v4 API (`z.toJSONSchema`, `ZodMiniError`, etc.)

## Steps

1. **Create branch** `feat/6-test-setup-and-port-tool-tests` from `feat/1-implement-code-first-agentstool-package`
   **Done when:** git branch exists and is checked out

2. **Create `tests/args.test.ts`** with parseArgs and validateInput coverage
   **Done when:** tests/args.test.ts exists with passing tests for subcommand extraction, flag parsing, `--help`/`--schema` promotion, `--` sentinel, positional args, and validateInput success/failure paths

3. **Expand `tests/index.test.ts`** with missing coverage:
   - `non_object_return` envelope (handler returns null/array/string)
   - `schema_violation` envelope (handler returns wrong shape)
   - `schema` subcommand structure depth (verify input/output JSON Schema keys)
   - `help` subcommand structure depth (verify description and input_schema fields)
   - `unknown_subcommand` with empty string
   - `ToolError` without detail field (detail absent, not undefined)
   - `subcommand()` TypeError when input or output missing
   **Done when:** all new tests pass and existing 24 tests remain passing

4. **Run `bun test`** to verify all tests pass with zero failures
   **Done when:** bun test exits 0 with all tests passing

5. **Run `biome check`** to verify formatting/linting
   **Done when:** biome check passes with no errors

## Interfaces

No new interfaces needed — tests use existing types from `src/`.

## Function Design

No new production functions — test-only additions.

## Acceptance Criteria (EARS)

- **AC-1.** [ubiquitous] The test suite shall be runnable via `bun test`
- **AC-2.** [event-driven] When a registered subcommand is invoked, the dispatch test shall verify the correct handler is called
- **AC-3.** [event-driven] When invalid input is provided, the test shall verify an `input_validation_error` envelope is returned
- **AC-4.** [ubiquitous] Tests shall verify the envelope structure for all error codes (`ok`, `error`, `message`, `detail` fields)
- **AC-5.** [event-driven] When a handler throws `ToolError`, the test shall verify the custom error code, message, and optional detail
- **AC-6.** [event-driven] When `schema` subcommand is invoked, the test shall verify each registered subcommand has `input`/`output` JSON Schema
- **AC-7.** [event-driven] When `help` subcommand is invoked, the test shall verify `name`, `description`, and `input_schema` per subcommand
- **AC-8.** [ubiquitous] Tests shall verify `l1Output`/`l2Output`/`l3Output` compose schemas with correct required fields
- **AC-9.** [ubiquitous] `bun test` shall exit with 0 failures
- **AC-10.** [ubiquitous] All test fixtures shall be self-contained (inline zod schemas and handlers)

## Out of Scope

- No vitest installation or `vitest.config.ts` (project uses `bun:test`)
- No coverage reporting configuration (not in ACs)
- No production code changes

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | Handler returns null instead of object | [inferred] | Expect `non_object_return` envelope |
| 2 | Handler returns array instead of object | [inferred] | Expect `non_object_return` envelope |
| 3 | Handler returns primitive string | [inferred] | Expect `non_object_return` envelope |
| 4 | Handler returns wrong shape (missing fields) | [inferred] | Expect `schema_violation` envelope |
| 5 | invoke("") — empty subcommand name | [inferred] | Expect `unknown_subcommand` envelope |
| 6 | ToolError without detail parameter | [inferred] | Expect error envelope with no `detail` key |
| 7 | subcommand() called without input schema | [from issue] | Expect TypeError thrown |
| 8 | schema subcommand with 0 registered subs | [inferred] | Expect schema output with empty/message |

## Done Criteria per Feature

| Feature | Done when |
|---------|-----------|
| args.test.ts | AC-1, AC-2, AC-9, AC-10 |
| Envelope coverage | AC-3, AC-4, AC-5, AC-9 |
| Schema/help depth | AC-6, AC-7, AC-9 |
| Output helpers | AC-8, AC-9, AC-10 |

## Risks

1. **bun:test mock API differs from vitest** → Mitigation: use only `bun:test` imports, follow existing mock pattern in `tests/utils.test.ts`
2. **zod v4 `toJSONSchema` output may differ between versions** → Mitigation: assert structural keys (`type`, `properties`, `required`) not exact deep equality

## Test Strategy

- All tests via `bun:test` — no external test framework needed
- Black-box testing via `Tool.invoke()` for dispatch/envelope tests
- Unit testing for `parseArgs`/`validateInput` in isolation
- Self-contained inline fixtures: `z.object({...})` schemas + inline handlers
- Run `bun test` as final gate — zero failures required
