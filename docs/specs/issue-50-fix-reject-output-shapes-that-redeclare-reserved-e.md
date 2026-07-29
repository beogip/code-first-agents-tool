---
issue_number: 50
issue_title: "fix: reject output shapes that redeclare reserved envelope fields"
repo: "beogip/code-first-agents-tool"
labels: [bug]
plan_level: "full"
depth: "medium"
branch_name: "beogip/fix-issue-50"
created_at: "2026-07-29T18:10:25Z"
---

# Implementation Plan: #50 — fix: reject output shapes that redeclare reserved envelope fields

All three output helpers spread the author's `fields` LAST, so an author-declared `message` or
`instructions` with a weaker Zod type silently overrides the fixed envelope field via JS
last-key-wins. Since `HandlerReturn<O> = Omit<z.infer<O>, "ok">`, the field also stops being
required at the type level: `tsc` passes clean, Zod validates, and the tool emits `ok: true` with
the field absent.

This plan closes the hole at **two** layers — compile time and registration time — with a single
declaration site for the reserved-key sets.

Discovery session: `.cothinker/session-50-reject-reserved-envelope-fields-20260729.md`
(6 branches closed, zero `[GAP]`s).

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | modify | `src/output-helpers.ts` | Single source of truth for reserved keys (3 `as const` arrays), `NoReserved<T,R>` type, `assertNoReservedCollision` guard, type constraint on the 3 helper signatures, JSDoc |
| 2 | modify | `src/types.ts` | Type constraint on `output` in the 3 per-type spec interfaces, unions derived via `import type` |
| 3 | create | `tests/output-helpers.test.ts` | The 9 unit tests moved out of `index.test.ts:478` + new guard tests |
| 4 | modify | `tests/index.test.ts` | Remove the `describe("output helpers")` block; add per-type-method rejection to the `:719` block |
| 5 | modify | `tests/fixtures/dummy-tool.ts` | Compile-time assertions in the existing `:195-221` section |
| 6 | modify | `README.md` | Document that `output` rejects reserved envelope keys |

## Codebase Context

**Modules to reuse / patterns to respect:**

- `src/args.ts:18` — the `RESERVED_SUBCOMMANDS` precedent:
  `export const RESERVED_SUBCOMMANDS: ReadonlySet<string> = new Set(["schema", "help"]);`
  Declared in the file that owns the concept, consumed locally (`args.ts:85`) and cross-module
  (`tool-class.ts:278`), exported at module level but **absent from the `src/index.ts` barrel**.
  Replicate this shape exactly.
- `src/tool-class.ts:279-284` — the `RangeError` style to mirror (fact + em-dash + causal clause):
  ```ts
  `Subcommand name "${spec.name}" is reserved — the base class auto-registers 'schema' and 'help'`
  `Subcommand "${spec.name}" is already registered`
  ```
- `src/tool-class.ts:167, 202-205, 233-235` — the three per-type methods all funnel through the
  standalone helpers, so a runtime guard placed inside the helpers covers the class path with no
  extra wiring.
- `src/output-helpers.ts:119, 125, 131` — `l1Output`/`l2Output`/`l3Output` are plain
  `export const x = y` re-exports; they inherit the guard automatically. Still worth an explicit
  test so they cannot silently diverge.
- `src/tool-class.ts:199-201` — key order is a deliberate invariant:
  ```ts
  // Splitting `classification` out normalizes key order to
  // `ok, message, classification, ...extras` — byte-identical to what the
  // standalone helper emits, whatever order the author wrote the shape in.
  ```
  **Do not touch it.** This is why reordering the spread was rejected (see Out of Scope).
- `tests/fixtures/dummy-tool.ts:195-221` — a purpose-built "Compile-time assertions" section where
  `@ts-expect-error` IS the assertion. `tsconfig.json:17` includes `tests`, so `bunx tsc --noEmit`
  enforces it: if the type layer stops rejecting, tsc fails with
  `Unused '@ts-expect-error' directive`.
- `src/index.ts` — nothing module-private is exported (e.g. `isPlainObject` in `tool-class.ts`
  stays private). The guard stays internal.

**CLAUDE.md constraints:** Conventional Commits (`fix:` here — see Risks); Biome (double quotes,
trailing commas, semicolons, no unused vars/imports as errors); strict TS with
`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`; `bun:test`.

**Derived, not user-decided:** `NoReserved<T, R>` lives in `src/output-helpers.ts` next to the
reserved-key consts (exported as a type, consumed by `types.ts` via `import type`). This follows
from output-helpers.ts owning the "reserved" concept and keeps the dependency one-directional —
placing `NoReserved` in `types.ts` while the consts live in `output-helpers.ts` would create a
type-only circular import.

## Steps

1. **Add the single source of truth to `src/output-helpers.ts`** — the three `as const` arrays,
   the `NoReserved<T,R>` type helper, and the derived key unions.
   **Done when:** `DATA_RESERVED_KEYS`, `CLASSIFICATION_RESERVED_KEYS` and
   `PROCEDURE_RESERVED_KEYS` exist as module-level `export const [...] as const`, and
   `bunx tsc --noEmit` passes.

2. **Implement `assertNoReservedCollision(fields, reserved)`** using `Object.keys` + `RangeError`.
   **Done when:** it returns without throwing for `undefined`, and the thrown message matches the
   format in Interfaces below.

3. **Call the guard as the first statement of all three helpers** (`src/output-helpers.ts` before
   `:37`, inside the impl signature before `:73`, and before `:107`).
   **Done when:** all three functions call the guard before any `z.object(...)` executes.

4. **Apply `NoReserved` to the three helper parameter types** (`fields: T & NoReserved<T, ...>`).
   **Done when:** a `@ts-expect-error` placed above `dataTypeOutput({ message: z.string() })` does
   not report `Unused '@ts-expect-error' directive`.

5. **Apply `NoReserved` to `output` in the three spec interfaces** in `src/types.ts`
   (`DataTypeSubcommandSpec`, `ClassificationTypeSubcommandSpec`, `ProcedureTypeSubcommandSpec`).
   **Done when:** `types.ts` imports the consts with `import type` only, still has zero
   `export const`, and `bunx tsc --noEmit` passes.

6. **Update the JSDoc of all three helpers** (`src/output-helpers.ts:19-33`, `:44-63`, `:81-96`).
   **Done when:** each `@param fields` line states that reserved keys are rejected with
   `RangeError` rather than merged.

7. **Create `tests/output-helpers.test.ts`** — move the 9 tests from
   `index.test.ts:478-537` verbatim, then add the guard tests.
   **Done when:** total test count strictly increases (never decreases) and
   `describe("output helpers")` no longer exists in `tests/index.test.ts`.

8. **Add per-type-method rejection tests + compile-time assertions** to
   `tests/index.test.ts` (`:719` block) and `tests/fixtures/dummy-tool.ts` (`:195-221` section).
   **Done when:** `bun test` is green and `bunx tsc --noEmit` reports no
   `Unused '@ts-expect-error'`.

9. **Document the rejection in `README.md`.**
   **Done when:** the API table at `:187` mentions the reserved keys and the README shows the
   error a colliding shape produces.

Dependency order: 1 → 2 → 3 → 4 → 5 → 6, then 7 → 8, then 9. Steps 7-9 may proceed in parallel
once 1-6 land.

## Interfaces

- `DATA_RESERVED_KEYS`: `readonly ["ok", "message"]`
- `CLASSIFICATION_RESERVED_KEYS`: `readonly ["ok", "message"]` — `classification` is **not**
  included; it is a required author-declared key inside `S` by design, structurally different from
  a fixed spread-in field.
- `PROCEDURE_RESERVED_KEYS`: `readonly ["ok", "message", "instructions"]`
- `NoReserved<T, R extends string>`:
  ```ts
  Extract<keyof T, R> extends never ? unknown : { [K in Extract<keyof T, R>]: never }
  ```
- `ReservedKey<A extends readonly string[]>` = `A[number]` — the array → literal-union bridge that
  makes one declaration site serve both layers.

**Error message format** (author declaration order, per `Object.keys(fields)` — no sorting):

```
output shape redeclares reserved envelope field(s): ok, instructions — the output helper composes these, so declaring them would silently override the envelope contract
```

## Function Design

- `src/output-helpers.ts` → `assertNoReservedCollision(fields, reserved)` — single concern: detect
  reserved-key collisions and throw. It does not compose schemas, does not know about subcommands,
  and is not exported from the barrel.

No function in this change combines orchestration with lifecycle management.

## Acceptance Criteria (EARS)

- **AC-1.** When `dataTypeOutput` receives a shape containing `ok` or `message`, it shall throw `RangeError`.
- **AC-2.** When `classificationTypeOutput` receives extras containing `ok` or `message`, it shall throw `RangeError`.
- **AC-3.** When `procedureTypeOutput` receives a shape containing `ok`, `message`, or `instructions`, it shall throw `RangeError`.
- **AC-4.** The thrown message shall name every colliding key, in `Object.keys(fields)` order.
- **AC-5.** Rejection shall hold regardless of the colliding field's Zod type — `z.string()`, `.optional()`, and any other type all throw.
- **AC-6.** Shapes with no reserved-key collision shall register unchanged, and the full suite shall stay green.
- **AC-7.** The runtime guard shall apply to both the per-type subcommand methods and the legacy `tool.subcommand` + standalone-helper path, including the `@deprecated` `l1Output`/`l2Output`/`l3Output` aliases.
- **AC-8.** `classification` shall remain a legal author-declared key on `classificationSubcommand`.
- **AC-9.** When an `output` shape passed to `dataSubcommand`, `classificationSubcommand`, or `procedureSubcommand` declares a reserved key, `bunx tsc --noEmit` shall report an error.
- **AC-10.** When a shape passed to a standalone output helper declares a reserved key, `bunx tsc --noEmit` shall report an error.
- **AC-11.** The reserved-key sets shall have exactly one declaration site, from which both the runtime guard and the type-level constraint derive.
- **AC-12.** If a shape key differs from a reserved key only by case (`Message`, `OK`), then the guard shall not reject it.
- **AC-13.** If `output` is omitted on `procedureSubcommand`, or `procedureTypeOutput` is called with no argument, then the guard shall not throw.
- **AC-14.** Symbol-keyed and inherited prototype keys on the passed shape shall not be treated as collisions.
- **AC-15.** The JSDoc of all three helpers shall state that reserved keys are rejected rather than merged.
- **AC-16.** The README shall document that `output` rejects reserved envelope keys.
- **AC-17.** `src/index.ts` shall not export the guard function.
- **AC-18.** `bun run build` shall emit declarations without `TS4023` or `TS4033`.
- **AC-19.** The composed output schema key order shall remain `ok`, `message`, then `classification`/`instructions`, then extras.

## Out of Scope

- **Reordering the spread** so the system fields win. Verified to work standalone (it converts the
  silent loss into a loud `instructions:invalid_type`), but rejected: it changes key order in both
  the parsed output and the `--schema` JSON Schema (`ok,message,count` → `count,ok,message`),
  breaking the invariant `src/tool-class.ts:199-201` deliberately maintains. Behind the guard it
  would also never execute on a collision (verified: `z.object` reached count `0`).
- The excess-property-check gap on handler returns — object literals returned from
  contextually-typed arrow functions skip TypeScript's excess-property check. Needs its own issue.
- Removing or renaming any existing export.
- Moving `describe("deprecated output helper aliases")` (`index.test.ts:823-918`) out of
  `index.test.ts` — those 6 tests build a `Tool` and `await tool.invoke(...)`, exercising the
  dispatch pipeline rather than the helpers, so they stay.
- Sorting the message's keys by the reserved-set order instead of author declaration order.

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | `ok` collision | [from issue] | Inert today (the framework stamps `ok: true` after the handler, so the worst case is a loud `schema_violation`). Reserved anyway for consistency and to keep the rule simple. Verified: throws. |
| 2 | `procedureTypeOutput()` no-arg overload — no shape to inspect | [from issue] | `if (!fields) return;` at the top of the guard. Verified: no throw. |
| 3 | Empty shape `{}` | [from issue] | Passes on all three helpers. Verified: no throw. |
| 4 | `classification` declared in `output` | [from issue] | Not in any reserved set. Verified: no throw, and `classification` + extras still compiles. |
| 5 | Multiple simultaneous collisions | [from issue] | All named in a single error. Verified: `RangeError: ... instructions, ok`. At the type level each key produces its own error (two errors, one per column). |
| 6 | Near-miss casing `Message` / `OK` | [from issue] | Exact match only — Zod keys are case-sensitive. Verified: no throw, compiles clean. |
| 7 | Symbol-keyed or inherited prototype keys | [from issue] | `Object.keys` (own enumerable string keys) — exactly the collision surface the spread itself sees. Verified: a prototype-inherited `message` does not throw. |
| 8 | `instructions` declared on a **data** subcommand | [inferred] | Legal there — it is not a fixed field for `dataTypeOutput`. Verified: compiles clean. |

## Done Criteria per Feature

| Feature | Done when |
|---------|-----------|
| Runtime guard | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-12, AC-13, AC-14 |
| Type-level guard | AC-9, AC-10, AC-18 |
| Single source of truth | AC-11, AC-17 |
| Documentation | AC-15, AC-16 |
| No regression | AC-6, AC-19 |

## Risks

- **Throwing where the helpers previously accepted silently is technically breaking** → it only
  breaks code that was already silently broken, so it ships as `fix:`, not a major bump. Verified:
  a search across `src/`, `tests/`, `examples/changeset.ts` and `README.md` for
  `output: { ... ok|message|instructions: ... }` and for helper calls passing those keys returns
  **zero hits** — nothing in this repo collides.
- **The type-level guard is a compile-time break for downstream consumers** whose code currently
  compiles → intended (loud failure). The `fix:` commit message and the README note communicate it.
- **The type error does not name the colliding key** — it reads
  `Type 'ZodOptional<ZodString>' is not assignable to type 'never'`, identifying the key by column
  position only → mitigated by the runtime `RangeError`, which names every key explicitly.
- **New import edge `types.ts → output-helpers.ts`** (type-only) → no cycle today
  (`output-helpers.ts` imports only `zod`). `NoReserved` lives in `output-helpers.ts` precisely to
  keep this one-directional.
- **Moving 9 tests risks silently dropping coverage** → move them verbatim and assert that the
  total test count strictly increases.
- **Failure timing shifts from invoke time to registration time** → intended (loud failure), but it
  changes behavior for any consumer relying on the current silent merge.

No files are generated at runtime by this change, so no `.gitignore` additions are needed.
`.cothinker/` is already gitignored.

## Test Strategy

**`tests/output-helpers.test.ts` (new)** — helper-level unit tests, no `Tool`, no `invoke`:

- The 9 tests moved verbatim from `index.test.ts:478-537` (schema-level `safeParse` assertions).
- New rejection tests per helper: reserved key present, reserved key weakened with `.optional()`,
  multiple simultaneous collisions.
- New pass-through tests: empty shape, `undefined`/no-arg, near-miss casing, prototype-inherited
  key, `classification` alone and with extras.
- Rejection tests assert **both the class and the message** —
  `expect(() => ...).toThrow(RangeError)` plus a message assertion. This is a new idiom for this
  repo: all 5 existing assertions (`index.test.ts:44,56,76,795,814`) check the class only, which
  would leave AC-4 covered by no test at all.
- Explicit alias coverage so `l1Output`/`l2Output`/`l3Output` cannot silently diverge.

**`tests/index.test.ts` (`:719` block)** — registration-path parity for AC-7: a colliding `output`
passed to each of `dataSubcommand`, `classificationSubcommand`, `procedureSubcommand` throws at
registration. These assert `Tool` behavior, not helper behavior, which is why they live here.

**`tests/fixtures/dummy-tool.ts` (`:195-221` section)** — compile-time assertions for AC-9 and
AC-10, using the existing `@ts-expect-error`-as-assertion pattern against the throwaway
`typeAssertions` Tool. `tsconfig.json:17` includes `tests`, so `bunx tsc --noEmit` is a real gate:
if the type layer regresses, tsc fails with `Unused '@ts-expect-error' directive`.

**Gates, all four must pass:** `bun test`, `bunx tsc --noEmit`, `bun run build` (AC-18),
`bunx biome check .`.
