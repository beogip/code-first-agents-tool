---
issue_number: 41
issue_title: "feat: add per-layer subcommand helpers (tool.l1/l2/l3Subcommand)"
repo: "beogip/code-first-agents-tool"
labels: [enhancement, api]
plan_level: "full"
depth: "medium"
branch_name: "beogip/add-issue-41"
created_at: "2026-07-29T00:00:00Z"
---

# Implementation Plan: #41 — feat: add per-type subcommand helpers

> **Naming note.** The issue body says `tool.l1Subcommand` / `l2Subcommand` / `l3Subcommand`. That
> naming is stale: PR #49 renamed the output helpers to `dataTypeOutput` / `classificationTypeOutput` /
> `procedureTypeOutput`, and the issue comment says *"We should use the new names added in #49"*.
> The methods in this plan are therefore **`dataSubcommand` / `classificationSubcommand` /
> `procedureSubcommand`** — the mechanical mirror of the #49 names, keeping the `Type` segment.
>
> Discovery session (7 branches closed, zero `[GAP]`):
> `.cothinker/session-41-add-per-layer-subcommand-helpers-20260728.md`

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | modify | `src/types.ts` | Spec interfaces + composed-schema types for the three methods; update the `output` JSDoc (`:73-82`) |
| 2 | modify | `src/tool-class.ts` | The three methods; `@deprecated` on `subcommand`; module JSDoc (`:16-33`, `:42-47`) |
| 3 | modify | `src/index.ts` | Export the new types from the barrel (`:25-30`) |
| 4 | modify | `tests/fixtures/dummy-tool.ts` | Positive fixtures + malformed-handler fixture + two `@ts-expect-error` fixtures |
| 5 | modify | `tests/cli.test.ts` | Black-box runtime coverage for the new subcommands |
| 6 | modify | `tests/index.test.ts` | Schema equivalence + chainability |
| 7 | modify | `README.md` | Quickstart `:39`, Output types `:63-119`, API Reference `:185-198` |
| 8 | modify | `examples/changeset.ts` | Rewrite the three subcommands + imports (`:36-41`) + header doc (`:29-32`) |
| 9 | modify | `examples/README.md` | Import line `:16` |

## Codebase Context

- **Reuse the output helpers, do not re-implement them.** `dataTypeOutput` (`src/output-helpers.ts:34`),
  `classificationTypeOutput` (`:64`), `procedureTypeOutput` (`:97`). The new methods must *call* them
  rather than building their own `z.object`, so schema equivalence (AC-3/4/5) is structural instead of
  asserted by hand.
- **Reuse `this.subcommand`** (`src/tool-class.ts:112`). Delegation inherits `validateRegistration`
  for free: reserved-name collisions (`schema`/`help`), duplicate names, and missing schemas keep
  throwing exactly as today.
- **No dispatch changes needed.** `subs: Map<string, AnySpec>` is type-erased (`src/tool-class.ts:72`)
  and `runSubcommand`/`invoke`/`validateOutput` (`:235-321`) read only `spec.input`/`spec.output`/
  `spec.handler`. The new methods are a pure type-safe construction layer in front of an unchanged
  runtime.
- **`exactOptionalPropertyTypes: true`.** The existing helpers handle optional extras with
  `...(fields ?? {})` (`output-helpers.ts:77,111`). Reuse that spread pattern; do not pass `undefined`
  through to an overloaded helper.
- **`HandlerReturn<O> = Omit<z.infer<O>, "ok">`** (`src/types.ts:45`) — the framework stamps `ok: true`
  before output validation. Handlers never return it.
- **`src/types.ts` is kept pure**: types only, no runtime logic, imports only `zod`. Composed-schema
  types belong there; the helper calls belong in `tool-class.ts`.
- **Deprecation pattern from #48**: `@deprecated` JSDoc plus a note that the symbol is *removed*
  rather than adapted at the next breaking change — see `src/output-helpers.ts:55-58` and `:117-119`.
- **Type-level tests need no new infrastructure.** `tsconfig.json` has `include: ["src", "tests"]`,
  so `bunx tsc --noEmit` already covers the whole fixtures tree, and CI runs it
  (`.github/workflows/ci.yml:37`). Precedent for an inline directive: `tests/fixtures/dummy-tool.ts:93`.
- **Testing convention** (CLAUDE.md): prefer black-box CLI testing via `runTool` over white-box unit
  tests of internals.

## Steps

1. **Add the type layer** → `src/types.ts`
   Declare `ClassificationShape`, `DataTypeSchema<S>`, `ClassificationTypeSchema<S>`,
   `ProcedureTypeSchema<S>`, `DataTypeSubcommandSpec<I,S>`, `ClassificationTypeSubcommandSpec<I,S>`,
   `ProcedureTypeSubcommandSpec<I,S>`.
   **Done when:** `bunx tsc --noEmit` passes and all seven type names are declared and exported.

2. **Add the three methods** → `src/tool-class.ts`
   `dataSubcommand`, `classificationSubcommand`, `procedureSubcommand`, each composing the
   output schema via the corresponding helper and delegating to `this.subcommand(...)`.
   **Done when:** `tool.dataSubcommand({...}).procedureSubcommand({...})` compiles and both
   calls return the same instance.

3. **Mark `subcommand` deprecated** → `src/tool-class.ts:100-111`
   `@deprecated` tag stating the method stops being exported at the next breaking change.
   **Done when:** the tag names the next breaking change as the removal point and `bunx biome check .`
   passes.

4. **Export the new types** → `src/index.ts:25-30`
   **Done when:** importing all seven new type names from the package barrel type-checks.

5. **Positive fixtures** → `tests/fixtures/dummy-tool.ts`
   One subcommand per new method, registered via the new methods.
   **Done when:** the three new subcommand names appear in `runTool("help")` stdout.

6. **Malformed-handler fixture** → `tests/fixtures/dummy-tool.ts`
   A handler registered through a per-type method that returns a value violating the composed schema
   (`@ts-expect-error` used as an *enabler*, mirroring `:92-94`).
   **Done when:** `runTool(<name>)` exits 0 with `ok: false` and `error: "schema_violation"`.

7. **Type-level fixtures** → `tests/fixtures/dummy-tool.ts`
   Two `@ts-expect-error` cases used as the *assertion*: (a) a `procedureSubcommand` handler
   omitting `instructions`; (b) a `classificationSubcommand` whose `output` omits `classification`.
   **Done when:** `bunx tsc --noEmit` passes, and deleting either directive makes it fail with
   `Unused '@ts-expect-error' directive`.

8. **Schema equivalence + chainability** → `tests/index.test.ts`
   **Done when:** the JSON Schema emitted for each per-type subcommand deep-equals the one produced by
   the standalone helper called with the same inputs, and `tool.dataSubcommand({...})` returns the
   same instance.

9. **Rewrite the README** → `README.md`
   Quickstart (`:39`) and all three Output-types examples (`:63-119`) switch to the new methods. Remove
   the API Reference rows for `tool.subcommand` (`:188`), the three output helpers (`:191-193`) and the
   deprecated aliases (`:194`); add one row per new method. Reword the section lead-in at `:65`.
   **Done when:** `rg -n 'tool\.subcommand|TypeOutput\(|l1Output|l2Output|l3Output' README.md` returns
   no matches.

10. **Rewrite the example** → `examples/changeset.ts`, `examples/README.md`
    All three subcommands (`:87`, `:107`, `:123`), the imports (`:36-41`) and the header's
    package-import block (`:29-32`); plus `examples/README.md:16`.
    **Done when:** the three commands documented at `examples/changeset.ts:17-19` emit byte-identical
    JSON to before the change, and `rg -n 'tool\.subcommand|TypeOutput' examples/` returns no matches.

11. **Update the prose that points at the low-level path** → `src/tool-class.ts:16-33,42-47` and
    `src/types.ts:73-82`
    The module usage example switches to `classificationSubcommand`; the envelope-contract prose no
    longer offers raw `z.object` as a fallback, because every output must be one of the three types.
    **Done when:** the usage example uses a per-type method and no JSDoc in `src/` directs readers to
    raw `z.object` or to the standalone helpers as the way to build an output.

## Interfaces

Let `Envelope = { ok: z.ZodLiteral<true>; message: z.ZodString }` (the shape both existing helpers
already bake in).

| Name | Definition | Purpose |
|------|------------|---------|
| `ClassificationShape` | `z.ZodRawShape & { classification: z.ZodTypeAny }` | Constraint that turns a missing `classification` key into a compile error (AC-7) |
| `DataTypeSchema<S extends z.ZodRawShape>` | `z.ZodObject<Envelope & S>` | What `dataSubcommand` registers |
| `ClassificationTypeSchema<S extends ClassificationShape>` | `z.ZodObject<Envelope & S>` | `classification` already lives inside `S`, so no split is needed at the type level |
| `ProcedureTypeSchema<S extends z.ZodRawShape>` | `z.ZodObject<Envelope & { instructions: z.ZodString } & S>` | `instructions` is fixed, never declared by the author |
| `DataTypeSubcommandSpec<I, S extends z.ZodRawShape>` | `{ name: string; description: string; input: I; output: S; handler: (args: z.infer<I>) => HandlerReturn<DataTypeSchema<S>> \| Promise<HandlerReturn<DataTypeSchema<S>>> }` | `output` **required**; accepts `{}` |
| `ClassificationTypeSubcommandSpec<I, S extends ClassificationShape>` | as above with `ClassificationTypeSchema<S>` | `output` **required**, must declare `classification` |
| `ProcedureTypeSubcommandSpec<I, S extends z.ZodRawShape>` | as above with `ProcedureTypeSchema<S>`, `output?: S` | `output` **optional** |

**Design rule established in discovery:** `output` carries *only what the subcommand author chooses*.
The fixed envelope parts — `ok`, `message`, and `instructions` — never appear in it. `classification`
*does* appear, because the enum is chosen by whoever builds the subcommand.

## Function Design

All three live in `src/tool-class.ts`. Single concern each: **schema construction, then delegate.**
None of them touch dispatch, validation or process lifecycle — that stays in `run`/`runSubcommand`.

| Method | Single concern |
|--------|----------------|
| `dataSubcommand` | `dataTypeOutput(spec.output)` → `this.subcommand({ ...spec, output })` |
| `classificationSubcommand` | `const { classification, ...fields } = spec.output` → `classificationTypeOutput(classification, fields)` → `this.subcommand(...)`. The destructure normalizes key order to `ok, message, classification, ...extras`, which is exactly what the standalone helper emits |
| `procedureSubcommand` | `spec.output ? procedureTypeOutput(spec.output) : procedureTypeOutput()` → `this.subcommand(...)`. The ternary picks the correct overload instead of passing a possibly-`undefined` argument |

## Acceptance Criteria (EARS)

- **AC-1.** The `Tool` class shall expose three chainable instance methods — `dataSubcommand`,
  `classificationSubcommand`, `procedureSubcommand` — each returning `this`.
- **AC-2.** Each per-type method shall accept a single spec object with `name`, `description`, `input`,
  `output` and `handler`, where `output` is a Zod raw shape carrying only the fields the subcommand
  author chooses.
- **AC-3.** When `dataSubcommand` is called with `output: S`, it shall register a subcommand whose
  output schema equals `dataTypeOutput(S)`.
- **AC-4.** When `classificationSubcommand` is called with `output: S`, it shall register a
  subcommand whose output schema equals `classificationTypeOutput(S.classification, rest)`, where
  `rest` is `S` without the `classification` key.
- **AC-5.** When `procedureSubcommand` is called with `output: S`, it shall register a subcommand
  whose output schema equals `procedureTypeOutput(S)`; when `output` is omitted, it shall equal
  `procedureTypeOutput()`.
- **AC-6.** `dataSubcommand` shall require `output` and shall accept `output: {}`.
- **AC-7.** If the `output` passed to `classificationSubcommand` omits a `classification` key, then
  compilation shall fail.
- **AC-8.** If a `procedureSubcommand` handler's return type omits `instructions`, then compilation
  shall fail.
- **AC-9.** When a handler registered through a per-type method returns a value violating the composed
  output schema, the tool shall emit `{ ok: false, error: "schema_violation" }` and exit with code 0.
- **AC-10.** `tool.subcommand`, `dataTypeOutput`, `classificationTypeOutput`, `procedureTypeOutput` and
  the deprecated `l1Output`/`l2Output`/`l3Output` aliases shall keep working unchanged and shall remain
  exported from the package root.
- **AC-11.** `tool.subcommand` shall carry a `@deprecated` JSDoc tag stating that it stops being
  exported at the next breaking change.
- **AC-12.** The README shall document only the three per-type methods; `tool.subcommand`, the three
  standalone output helpers, and their deprecated aliases shall not appear in it.
- **AC-13.** `examples/changeset.ts` and `examples/README.md` shall build all three tool types using
  the per-type methods.

## Out of Scope

- Error model / `ok: false` envelopes — already implemented in `src/envelopes.ts`.
- Adapter to external SDKs (eve/claude) — separate issue.
- Package rename — parked.
- Removing `tool.subcommand` or the standalone output helpers from the exports. That is a breaking
  change; this issue is additive at the API level and only changes docs plus the `@deprecated` marker.
- Marking the three standalone output helpers `@deprecated`. Explicitly decided against in discovery —
  they stay clean, just undocumented.

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | `output: {}` on `dataSubcommand` | [from issue] | `dataTypeOutput({})` → envelope only; the handler returns just `message` |
| 2 | `output` omitted on `procedureSubcommand` | [from issue] | Ternary selects the no-arg overload; nothing `undefined` crosses the call boundary under `exactOptionalPropertyTypes` |
| 3 | `output: {}` on `procedureSubcommand` | [inferred] | Equivalent to omitting it — `z.object({ok, message, instructions})` either way |
| 4 | `classification` mixed with extras in `output` | [from issue] | Destructure normalizes key order to `ok, message, classification, ...extras`, matching `classificationTypeOutput` exactly regardless of the order the author wrote |
| 5 | Reserved name `schema`/`help` passed to a per-type method | [inferred] | Delegation runs `validateRegistration` → `RangeError` as today; no new code path to guard |
| 6 | Duplicate name across `subcommand` and a per-type method | [inferred] | Same `subs` Map → `RangeError` as today |
| 7 | Author declares `ok` or `message` inside `output` | [inferred] | Extras spread last, so it would override the envelope field — identical to the standalone helpers' behavior today. Not newly introduced by this change; no guard added, because guarding here without guarding `dataTypeOutput` would make the two paths diverge |
| 8 | `@deprecated subcommand` + internal delegation | [inferred] | The deprecation strikethrough appears on the library's own call sites inside the three new methods. Accepted in discovery |

## Done Criteria per Feature

| Feature | Done when |
|---------|-----------|
| Three per-type methods | AC-1, AC-2, AC-3, AC-4, AC-5, AC-6 |
| Compile-time enforcement | AC-7, AC-8 |
| Runtime behavior unchanged | AC-9, AC-10 |
| Deprecation signal | AC-11 |
| Docs + examples | AC-12, AC-13 |

## Risks

| Risk | Mitigation |
|------|------------|
| Inferring `S` from `output` while contextually typing `handler` in the same object literal could widen or fail | This is the same mechanism `subcommand` uses today (`O` inferred from `output`, handler typed `HandlerReturn<O>`). Gated by `bunx tsc --noEmit` plus positive fixtures that must compile clean |
| `@ts-expect-error` is satisfied by *any* error on the following line, so a typo in a fixture can mask the intended assertion and still go green | Keep each fixture minimal — only the missing field differs from an otherwise-valid call — and pair it with a positive fixture. TypeScript has no error-code-scoped form of the directive; this limitation is accepted, not solved |
| `@deprecated` on `subcommand` makes the library's own internal delegation show strikethrough | Accepted. If it becomes noisy, extract a private `register()` that both paths call. Not doing that in this issue |
| Removing `tool.subcommand` and the output helpers from the README leaves still-exported symbols with no documented reference | The `@deprecated` JSDoc carries the signal to consumers; note the documentation change in the CHANGELOG entry |
| `z.ZodRawShape & { classification: z.ZodTypeAny }` may not constrain cleanly in Zod v4 | The AC-7 `@ts-expect-error` fixture proves it. If the constraint does not hold, that fixture fails loudly rather than passing silently |
| Files generated at runtime that must not be committed | `.cothinker/` is already covered by `.gitignore:39`. No new ignore entry or `.gitkeep` needed |

## Test Strategy

**Runtime, black-box** — `tests/cli.test.ts`, spawning `tests/fixtures/dummy-tool.ts` as a subprocess:
- One assertion per new method: the subcommand emits the expected envelope with `ok: true`.
- The malformed handler registered through a per-type method emits `ok: false`,
  `error: "schema_violation"`, exit code 0.
- Add the new subcommand names to the exit-code-0 table at `tests/cli.test.ts:266-278`.

**Compile-time** — `bunx tsc --noEmit`, already run by CI (`.github/workflows/ci.yml:37`):
- `@ts-expect-error` fixture: `procedureSubcommand` handler without `instructions` (AC-8).
- `@ts-expect-error` fixture: `classificationSubcommand` with `output` missing `classification`
  (AC-7).
- Failure mode is `Unused '@ts-expect-error' directive` — that message *is* the test failing, and it
  surfaces in `bunx tsc --noEmit`, not in `bun test`.

**Schema equivalence** — `tests/index.test.ts` (AC-3, AC-4, AC-5):
- Compare the JSON Schema emitted for each per-type subcommand against the schema built by the
  standalone helper with the same inputs, going through the `schema` builtin so the private `subs` Map
  is never touched. Verify first whether `tool.invoke("schema")` dispatches builtins; if it does not,
  assert via `runTool("schema")` in `tests/cli.test.ts` instead.

**Chainability** — `expect(tool.dataSubcommand({ ... })).toBe(tool)` for each method (AC-1).

**Regression** — the full existing suite must stay green (AC-10), and the three commands documented at
`examples/changeset.ts:17-19` must emit byte-identical JSON before and after the rewrite.
