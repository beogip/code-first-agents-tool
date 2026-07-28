---
issue_number: 48
issue_title: "feat: align output helpers with Data/Classification/Procedure"
repo: "beogip/code-first-agents-tool"
labels: [documentation, enhancement, api]
plan_level: "full"
depth: "medium"
branch_name: "beogip/issue-48-align-output-helpers"
created_at: "2026-07-28T23:24:23Z"
---

# Implementation Plan: #48 — feat: align output helpers with Data/Classification/Procedure

Rename the output-spectrum helpers to the spec's canonical tool type vocabulary, keeping the old
names as `@deprecated` aliases, and sweep the L1/L2/L3 vocabulary out of every live surface.

Canonical names (decided during planning — these **supersede** the `dataOutput` /
`classificationOutput` / `procedureOutput` names written in the issue body):

| Canonical | Replaces (kept as `@deprecated` alias) |
| --- | --- |
| `dataTypeOutput` | `l1Output` |
| `classificationTypeOutput` | `l2Output` |
| `procedureTypeOutput` | `l3Output` |

Upstream is settled: `beogip/code-first-agents#8` is CLOSED, PR #9 merged 2026-07-28 13:10 and
PR #10 merged 2026-07-28 15:51. The vocabulary will not shift again mid-change.

## Files

| # | Action | Path | Purpose |
|---|---|---|---|
| 1 | modify | `src/output-helpers.ts` | Rename the three helpers to canonical names; rewrite module header + JSDoc to Data/Classification/Procedure; add the three `@deprecated` alias declarations; add the type-change policy note to each canonical helper's JSDoc |
| 2 | modify | `src/index.ts` | Export all six names; update the JSDoc usage example on line 7 |
| 3 | modify | `src/tool-class.ts` | JSDoc worked example (18-33), "level helpers" prose (42-47), and the two runtime strings (172, 314) |
| 4 | modify | `src/types.ts` | JSDoc on `SubcommandSpec.output` (75-76) |
| 5 | modify | `README.md` | 9 code samples (32,46,70,76,87,95,106,112,139), API table rows 191-193 (+ deprecated rows), headings/prose 63,65,67,84,103,177 |
| 6 | modify | `examples/README.md` | Parent heading (19), section headings (23,33,43), prose (21,53) |
| 7 | modify | `examples/changeset.ts` | Import (31), doc-comment (27), calls (81,101,117), spectrum comments (6,8-10,76,79,96,99,112,115) |
| 8 | modify | `CLAUDE.md` | Vocabulary at lines 11, 42, 55 |
| 9 | modify | `tests/index.test.ts` | Migrate import (4) + ~20 call sites + the 10 helper tests (469-528) to canonical; add the deprecated-alias describe block |
| 10 | modify | `tests/fixtures/dummy-tool.ts` | Migrate import (3) + 10 call sites + description string (93) |
| 11 | modify | `tests/cli.test.ts` | Rename the `describe("CLI — l3Output through full pipeline")` block (145) |
| 12 | modify | `.gitignore` | Add `.cothinker/` — currently untracked and would be committed |

## Codebase Context

- All three helpers compose one shared envelope base `{ ok: z.literal(true), message: z.string(),
  ...extra }`, with `classification` / `instructions` injected before the spread. Preserve that
  single base — do not fork it per helper.
- `l2Output` carries two overloads (lines 54, 59) and `l3Output` two (82, 86), each with a
  deliberate comment explaining why the no-arg overload omits `& T`. Keep both overload sets and
  both comments on the renamed functions.
- `src/index.ts:16` uses a named re-export (`export { l1Output, l2Output, l3Output } from
  "./output-helpers";`). Biome `organizeImports: on` will re-sort that line once six names land.
- Test layout: `tests/index.test.ts` and `tests/args.test.ts` test in-process via `Tool.invoke()`;
  `tests/cli.test.ts` is black-box via `spawnSync("bun", [FIXTURE, ...args])` against
  `tests/fixtures/dummy-tool.ts`.
- No schema-identity assertion pattern exists anywhere in the suite, and by decision this change
  does **not** introduce one — the alias tests are behavioral.
- `verbatimModuleSyntax` is on: the helpers are values, so they stay plain `export`, never
  `export type`.
- Conventional Commits are enforced by the lefthook `commit-msg` hook.
- Biome runs `noUnusedVariables` / `noUnusedImports` as **error**; CI runs the non-fixing
  `bunx biome check .`, while `bun run check` autofixes.

## Steps

1. **Rename the canonical helpers.** In `src/output-helpers.ts`, rename `l1Output` →
   `dataTypeOutput`, `l2Output` → `classificationTypeOutput`, `l3Output` → `procedureTypeOutput`,
   rewriting the module header (lines 2, 7, 8) and all three JSDoc blocks (20, 40, 72) to
   Data/Classification/Procedure, and add the type-change policy note to each canonical JSDoc.
   **Done when:** `rg 'L1|L2|L3|level' src/output-helpers.ts` returns only the deprecation notices,
   and both overload sets survive with their explanatory comments intact.

2. **Add the deprecated aliases.** Three declaration aliases in `src/output-helpers.ts`, each with
   `@deprecated` JSDoc naming its replacement — e.g.
   `/** @deprecated Use dataTypeOutput. */ export const l1Output = dataTypeOutput;`
   **Done when:** `bunx tsc --noEmit` exits 0 and each alias resolves to the same function object as
   its canonical (no second implementation, no wrapper).

3. **Export all six.** Update `src/index.ts` line 16 and the line-7 JSDoc usage example.
   **Done when:** importing all six from `../src/index` type-checks and `bunx biome check .` reports
   no `organizeImports` diff.

4. **Update `src/tool-class.ts`.** The JSDoc worked example (18-33) — subcommand name
   `level-classifier`, `output: l2Output(z.enum(["L1","L2","L3"]))`, and the handler's returned
   `classification: "L2"`; the "level helpers" prose (42-47); and both runtime strings:
   line 172 (`TypeError` for a subcommand missing `output`) and line 314 (`schema_violation`
   envelope message).
   **Done when:** `rg 'l1Output|l2Output|l3Output|L1|L2|L3' src/tool-class.ts` returns nothing.

5. **Update `src/types.ts`.** JSDoc on `SubcommandSpec.output` (75-76).
   **Done when:** `rg 'level helpers|l1Output|l2Output|l3Output' src/types.ts` returns nothing.

6. **Migrate the repo's own test call sites.** `tests/index.test.ts` (import + ~20 call sites + the
   10 helper test titles at 469-528), `tests/fixtures/dummy-tool.ts` (import + 10 call sites +
   description string at 93), `tests/cli.test.ts` (the `describe` name at 145).
   **Done when:** `bun test` passes and the only deprecated-name occurrences under `tests/` are
   inside the new alias block from step 7.

7. **Add the deprecated-alias test block.** A `describe("deprecated output helper aliases")` block in
   `tests/index.test.ts` that registers subcommands whose `output` uses each deprecated helper and
   invokes them via `Tool.invoke()`, asserting the resulting envelope structure — including both
   overloads of `l2Output` and both of `l3Output`.
   **Done when:** the block has at least 5 cases, all pass, and removing an alias from
   `src/output-helpers.ts` makes it fail.

8. **Sweep the docs and examples.** `README.md`, `examples/README.md`, `examples/changeset.ts` and
   `CLAUDE.md` (lines 11, 42, 55).
   **Done when:** `rg 'L1|L2|L3' src/ README.md examples/ CLAUDE.md` returns no occurrences outside
   deprecation notices, and all three `changeset.ts` subcommands (`stats`, `size`, `review-plan`)
   exit 0.

9. **Hygiene + full gate.** Add `.cothinker/` to `.gitignore`, then run the verification gate.
   **Done when:** `git status --short` shows no untracked `.cothinker/`, and `bun test`,
   `bunx tsc --noEmit` and `bunx biome check .` all exit 0.

## Interfaces

No new data structures. The public function signatures **are** the interface:

- `dataTypeOutput<T extends z.ZodRawShape>(fields: T): z.ZodObject<{ ok: z.ZodLiteral<true>;
  message: z.ZodString } & T>` — single signature.
- `classificationTypeOutput<C extends z.ZodTypeAny, T extends z.ZodRawShape>(classification: C,
  fields: T)` → envelope + `classification: C` `& T`; and `<C extends z.ZodTypeAny>(classification:
  C)` → envelope + `classification: C` (no `& T`, deliberately).
- `procedureTypeOutput<T extends z.ZodRawShape>(fields: T)` → envelope + `instructions: z.ZodString`
  `& T`; and `()` → envelope + `instructions: z.ZodString` (no `& T`, deliberately).
- `l1Output` / `l2Output` / `l3Output` — `@deprecated` declaration aliases bound to the three above.
  Their signatures **track** the canonical (they are the same function object), so they are not
  frozen; see the policy note below.

**Type-change policy note** (lives in the JSDoc of each *canonical* helper, because that is what
someone editing the types actually reads): changing a canonical helper's type is a breaking change,
and at that point the deprecated names stop being supported and are removed rather than adapted.

## Function Design

`src/output-helpers.ts` carries exactly two concerns:

- **Canonical helpers** (`dataTypeOutput`, `classificationTypeOutput`, `procedureTypeOutput`) —
  single concern: compose the shared envelope plus the fields the tool type requires.
- **Deprecated aliases** (`l1Output`, `l2Output`, `l3Output`) — single concern: name compatibility.
  No logic, no wrapping, no delegation, no second implementation.

No function in this change combines orchestration with lifecycle management.

## Acceptance Criteria (EARS)

- **AC-1** The package shall export `dataTypeOutput`, `classificationTypeOutput` and
  `procedureTypeOutput` from the barrel, typed identically to the helpers they replace.
- **AC-2** The package shall continue to export `l1Output`, `l2Output` and `l3Output` from the barrel.
- **AC-3** When a consumer references a deprecated name in an editor, the tooling shall report it as
  deprecated and name its canonical replacement.
- **AC-4** Each deprecated name shall be a declaration alias bound to the canonical function object,
  not a second implementation.
- **AC-5** If a deprecated name stops producing the same output envelope structure, then the test
  suite shall fail.
- **AC-6** The JSDoc of each canonical helper shall state that changing its type is a breaking change
  that ends support for the deprecated names.
- **AC-7** No stdout or stderr output shall change for a consumer using the deprecated names.
- **AC-8** When `rg 'L1|L2|L3' src/ README.md examples/ CLAUDE.md` runs, it shall return no
  occurrences outside the deprecation notices.
- **AC-9** Both `src/tool-class.ts` error messages — the missing-`output` `TypeError` and the
  `schema_violation` envelope — shall name the canonical helpers.
- **AC-10** The repo's own call sites in `tests/` and `examples/` shall use the canonical names,
  except the tests dedicated to the deprecated aliases.
- **AC-11** When `bun test`, `bunx tsc --noEmit` and `bunx biome check .` run, all three shall pass.
- **AC-12** When every subcommand of `examples/changeset.ts` runs, it shall exit 0 and its
  description shall name the tool type, not a level.
- **AC-13** The commit shall be typed `feat` so semantic-release cuts a MINOR, not a MAJOR.
- **AC-14** `.gitignore` shall exclude `.cothinker/`.

## Out of Scope

- `CHANGELOG.md` — historical record of what shipped, not live documentation.
- `docs/specs/*` — frozen plan records; their `plan_level:` frontmatter is unrelated tooling
  metadata, not spectrum vocabulary.
- Removing the deprecated aliases — deferred to the next real breaking change.
- Runtime deprecation warnings (stderr/stdout) — JSDoc `@deprecated` only, by decision.

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|---|---|---|
| 1 | A blanket find-and-replace would falsify `CHANGELOG.md` and `docs/specs/*` | [from issue] | Sweep scoped to `src/`, `README.md`, `examples/`, `CLAUDE.md`; the `rg` acceptance check uses the same scope |
| 2 | `--level` flag with `info`/`debug` values in `README.md:91-98`, `tests/fixtures/dummy-tool.ts:39-49`, `tests/cli.test.ts:53-65` | [from issue] | Left untouched — unrelated to the output spectrum; `bun test` still covering those cases proves it |
| 3 | `tests/index.test.ts:519` passes a fixture field literally named `level` | [from issue] | Field untouched; only the surrounding helper call migrates |
| 4 | `CODE_OF_CONDUCT.md:5` says "level of experience" | [from issue] | Outside the sweep scope, untouched |
| 5 | The JSDoc worked example's enum *values* are the level names, not just a mention | [from issue] | Enum becomes `z.enum(["Data","Classification","Procedure"])`; the subcommand name and the handler's returned `classification` value move with it |
| 6 | `@deprecated` on a re-export specifier may not surface in a consumer's editor | [inferred] | Aliases are declarations carrying their own JSDoc, never `export { canonical as old }` |
| 7 | Biome `noUnusedImports` is an error, so a half-migrated import breaks CI | [from issue] | Migrate each file's imports and call sites in the same edit; run `bun run check` before committing |
| 8 | The `.cothinker/` session artifact is untracked and would be committed | [inferred] | `.gitignore` entry added in step 9 |

## Done Criteria per Feature

| Feature | Done when |
|---|---|
| Canonical helpers | AC-1, AC-11 |
| Deprecation window | AC-2, AC-3, AC-4, AC-5, AC-7 |
| Type-change policy recorded | AC-6 |
| Vocabulary sweep | AC-8, AC-9, AC-10, AC-12 |
| Release + hygiene | AC-11, AC-13, AC-14 |

## Risks

- **Biome unused-import/variable errors** during a partial migration → migrate imports and call
  sites in the same edit per file; run `bun run check` before commit.
- **`organizeImports` re-sorts the barrel export line** once six names land, and CI's
  `bunx biome check .` does not autofix → run `bun run check` locally so CI sees the sorted form.
- **Wrong release cut**: a `fix:` type or a stray `BREAKING CHANGE:` footer would produce a PATCH or
  a MAJOR → commit as `feat:`, with no breaking-change footer (AC-13).
- **Over-broad sweep** silently rewriting the `--level` fixtures, `CODE_OF_CONDUCT.md` or
  `CHANGELOG.md` → the `rg` acceptance check is scoped, and edge cases 2-4 are guarded by `bun test`
  continuing to pass on the `--level` cases.
- **Runtime-generated files committed by accident**: the `.cothinker/` session artifact is produced
  at plan time and is not currently ignored → `.gitignore` entry in step 9. No `.gitkeep` is needed
  (the directory is not required in the repo).

## Test Strategy

- **Migrate the existing coverage.** The 10 cases in the `describe("output helpers")` block at
  `tests/index.test.ts:469-528` move to the canonical names, titles included — they are the repo's
  own teaching call sites and should show the current form.
- **Add a dedicated deprecated-alias block.** It exercises the old names **behaviorally**, through
  `Tool.invoke()`, asserting the resulting envelope structure. The bar set during planning: a user on
  an old name must not break *because the structure changed*. Explicitly **not** a schema-object
  identity assertion. Cover both `l2Output` overloads and both `l3Output` overloads.
- **Keep the black-box CLI path.** `tests/fixtures/dummy-tool.ts` migrates to the canonical names, so
  `tests/cli.test.ts` continues to cover the full argv → validate → handler → envelope → exit-0
  pipeline under the new names.
- **Preserve the false-positive coverage.** The `--level` flag cases in `tests/cli.test.ts:53-65` must
  keep passing unmodified; they are the regression guard for an over-broad sweep.
- **Verification gate.** `bun test`, `bunx tsc --noEmit`, `bunx biome check .`, plus running all three
  `examples/changeset.ts` subcommands and confirming each exits 0.
