---
issue_number: 18
issue_title: "Published declarations contain .ts extension specifiers"
repo: "beogip/code-first-agents-tool"
labels: [claude]
plan_level: "lean"
depth: "medium"
branch_name: "claude/issue-18-20260607-1604"
created_at: "2026-06-07T16:06:47Z"
---

# Implementation Plan: #18 — Published declarations contain .ts extension specifiers

## Files

| File | Change |
|------|--------|
| `src/index.ts` | Drop `.ts` from all barrel re-export specifiers |
| `src/args.ts` | Drop `.ts` from import specifier |
| `src/envelopes.ts` | Drop `.ts` from import specifiers |
| `src/introspection.ts` | Drop `.ts` from import specifiers |
| `src/tool-class.ts` | Drop `.ts` from import specifiers |
| `tests/fixtures/dummy-tool.ts` | Drop `.ts` from `../../src/index` import |
| `tests/utils.test.ts` | Drop `.ts` from `../src/index` import |
| `tests/index.test.ts` | Drop `.ts` from `../src/index` imports |
| `tests/args.test.ts` | Drop `.ts` from `../src/index` import |
| `tsconfig.json` | Remove `allowImportingTsExtensions: true` (now a regression guard) |
| `tsconfig.build.json` | **Removed** — replaced by bundled-declaration emit |
| `package.json` | Bundle declarations via `dts-bundle-generator`; add `@arethetypeswrong/cli` + `attw` guard (ignore intentional ESM-only `cjs-resolves-to-esm`); gate `prepublishOnly` |

## Implementation note (diverged from initial plan)

Dropping `.ts` alone only satisfies **bundler** resolution; **nodenext** still fails because the
per-file declarations re-export siblings (`./args`) that have no matching `.js` (runtime is a single
bundled `index.js`). The aligned fix — matching the repo's "bun build (bundle) + declarations" design —
is to **bundle the declarations into a single `dist/index.d.ts`** (via `dts-bundle-generator`, inlining
all types, zero relative specifiers). Published `dist/` is now just `index.js` + `index.d.ts`, and
`attw --pack` reports 🟢 across node10 / node16-cjs / node16-esm / bundler.

## Codebase Context

- `bun run build` (package.json:27) bundles runtime into a single `dist/index.js` (already `.ts`-free) and runs `tsc -p tsconfig.build.json` to emit per-file `.d.ts`. Only the declarations carry the bug.
- `tsconfig.build.json` extends `tsconfig.json` (inheriting `allowImportingTsExtensions`) and `emitDeclarationOnly`. `tsc` copies import specifiers verbatim, so `./args.ts` lands in `dist/index.d.ts` while the tarball ships `args.d.ts`.
- `moduleResolution: "bundler"` resolves extensionless imports for `tsc`; Bun's resolver resolves extensionless imports at runtime/build — so dropping `.ts` is safe across all three (tsc, bun build, bun test).
- Conventions (CLAUDE.md): Conventional Commits, Biome formatting, strict TS, Bun runtime.

## Steps

1. Strip the `.ts` extension from every relative import/export specifier in `src/*.ts`.
   **Done when:** `rg 'from "\./.*\.ts"' src/` returns no matches.
2. Strip the `.ts` extension from every `../src/index.ts` import in `tests/`.
   **Done when:** `rg 'src/index\.ts"' tests/` returns no matches.
3. Remove `allowImportingTsExtensions: true` from `tsconfig.json` so any re-introduced `.ts` specifier fails `tsc --noEmit`.
   **Done when:** `tsconfig.json` no longer contains the key and `bunx tsc --noEmit` passes.
4. Add `@arethetypeswrong/cli` devDependency, an `attw` script (`attw --pack`), and gate `prepublishOnly` on it.
   **Done when:** `bun run build && bunx attw --pack` reports no resolution errors.
5. Rebuild and confirm emitted declarations are extension-free.
   **Done when:** `rg '\.ts"' dist/*.d.ts` returns no matches and `bun test` + `bunx biome check .` + `bunx tsc --noEmit` all pass.

## Interfaces

No public API surface changes. Exported names, types, and runtime behavior are identical; only module-specifier strings in declarations change.

## Function Design

No function-level changes — this is a build/specifier hygiene fix.

## Acceptance Criteria (EARS)

- **AC-1** (ubiquitous): The published `dist/index.d.ts` SHALL reference sibling modules without a file extension (e.g. `from "./args"`).
- **AC-2** (ubiquitous): Every emitted `dist/*.d.ts` SHALL be free of literal `.ts` import/export specifiers.
- **AC-3** (event-driven): WHEN `attw --pack` runs against the built package, the system SHALL report no false/broken type-resolution errors.
- **AC-4** (unwanted behavior): IF a `.ts` extension specifier is reintroduced into a compiled source file, THEN `bunx tsc --noEmit` SHALL fail.
- **AC-5** (ubiquitous): The existing test suite, Biome check, and type-check SHALL continue to pass unchanged.

## Out of Scope

- Editing `.github/workflows/ci.yml` to add the `attw` CI step — GitHub App permissions forbid workflow edits; the step is documented in the PR for a maintainer to add. The `prepublishOnly` gate still blocks broken publishes locally/in release.
- Changing `declarationMap`/`.d.ts.map` emission (maps point at non-shipped `src/` — a separate concern not raised by the issue).

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | Bun runtime resolution of extensionless imports | [inferred] | `moduleResolution: bundler` + Bun resolver both resolve extensionless; verified by `bun test` |
| 2 | A future `.ts` specifier sneaks back in | [inferred] | Removing `allowImportingTsExtensions` makes `tsc --noEmit` error — hard guard |
| 3 | `attw` unavailable / network restricted in publish env | [inferred] | Script is additive; gate only runs on `prepublishOnly`, build itself is unaffected |
| 4 | Tests reference `src/index.ts` directly | [from issue context] | Updated in lockstep so type-check stays green after flag removal |

## Done Criteria per Feature

| Feature | ACs |
|---------|-----|
| Extension-free declarations | AC-1, AC-2 |
| Regression guard (tsconfig) | AC-4 |
| Publish-time guard (attw) | AC-3 |
| No behavior regression | AC-5 |

## Risks

- **Low:** Extensionless imports failing under some resolver — mitigated by `bun test` (runtime) + `tsc --noEmit` (types) + `attw` (published shape).
- **Low:** `@arethetypeswrong/cli` install requires network; additive only, does not block the core fix.

## Test Strategy

Lean on existing suites plus build verification:
- `bun test` — runtime resolution of extensionless imports.
- `bunx tsc --noEmit` — type resolution + regression guard (flag removed).
- `bunx biome check .` — formatting/lint.
- `bun run build` then `rg '\.ts"' dist/*.d.ts` — declarations are extension-free.
- `bunx attw --pack` — published type shape resolves under bundler/nodenext.
