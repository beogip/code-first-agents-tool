---
issue_number: 7
issue_title: "[#1] chore: configure build + publish pipeline"
repo: "beogip/code-first-agents-tool"
labels: [enhancement]
plan_level: "full"
depth: "medium"
branch_name: "feat/7-configure-build-publish-pipeline"
created_at: "2026-05-23T18:50:00-03:00"
---

# Implementation Plan: #7 — [#1] chore: configure build + publish pipeline

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | modify | `package.json` | Rename to `@code-first-agents/tool`, add main/types/exports/files, update build script |
| 2 | modify | `tsconfig.json` | Add `declaration` + `declarationMap` for `.d.ts` output |
| 3 | modify | `src/index.ts` | Remove `console.log` side effect |
| 4 | modify | `.releaserc.json` | Enable `npmPublish` |
| 5 | modify | `.github/workflows/ci.yml` | Enable semantic-release job with Node setup + NPM_TOKEN |
| 6 | modify | `README.md` | Rewrite with package name, installation, usage example, spec link |

## Codebase Context

- `biome.json`: linter/formatter config with strict rules (indent: 2 spaces, LF, double quotes, trailing commas, semicolons) — respect formatting conventions in all files
- `lefthook.yml`: conventional commit enforcement — commit messages must match `^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?(!)?: .{1,100}`
- `.releaserc.json`: semantic-release already configured with commit-analyzer, release-notes-generator, changelog, npm, git, and github plugins
- CI already runs: `biome check`, `tsc --noEmit`, `bun test`, `bun run build` — keep these steps intact
- `tsconfig.json` `outDir` already set to `dist/`, exclude already has `dist/`
- `.gitignore` already ignores `dist/`, `node_modules/`, `coverage/`, `.env`

## Steps

1. **Update `package.json`** — rename package, add entry points, exports map, files whitelist, update scripts
   - Rename `name` from `bun-ts-template` to `@code-first-agents/tool`
   - Add `"main": "./dist/index.js"`
   - Add `"types": "./dist/index.d.ts"`
   - Add `"exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }`
   - Add `"files": ["dist"]`
   - Add `"repository": { "type": "git", "url": "https://github.com/beogip/code-first-agents-tool.git" }`
   - Update `"build"` script from `bun build src/index.ts --outdir dist --target bun` to `rm -rf dist && tsc`
   - Add `"prepublishOnly": "bun run build"`
   - **Done when:** `package.json` has name `@code-first-agents/tool`, `main`/`types`/`exports`/`files` fields set correctly

2. **Update `tsconfig.json`** — add declaration options
   - Add `"declaration": true` to `compilerOptions`
   - Add `"declarationMap": true` to `compilerOptions`
   - **Done when:** `tsc` produces `.js` + `.d.ts` + `.d.ts.map` files in `dist/`

3. **Remove side effect from `src/index.ts`**
   - Remove `console.log(greet("world"))` at the bottom of the file
   - Keep only the `greet` function export
   - **Done when:** `src/index.ts` has no top-level `console.log`

4. **Update `.releaserc.json`** — enable npm publish
   - Change `"npmPublish": false` to `"npmPublish": true` in the `@semantic-release/npm` plugin config
   - **Done when:** `@semantic-release/npm` config has `npmPublish: true`

5. **Update `.github/workflows/ci.yml`** — enable release job
   - Uncomment the `permissions` block (contents, issues, pull-requests: write)
   - Uncomment `setup-node@v4` step (node-version: 22, registry-url: https://registry.npmjs.org)
   - Uncomment the `semantic-release` step
   - Add `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` to semantic-release env
   - Add `GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}` to semantic-release env
   - Make semantic-release conditional: only on push to main (not PRs)
   - **Done when:** CI has lint+typecheck+test+build on all pushes/PRs, and semantic-release on main push only with NPM_TOKEN

6. **Rewrite `README.md`**
   - Update title to `@code-first-agents/tool`
   - Update CI badge URL to `beogip/code-first-agents-tool`
   - Add npm version badge
   - Add installation instructions (`bun add @code-first-agents/tool` / `npm install @code-first-agents/tool`)
   - Add usage example with import and function call
   - Add link to Code-First Agents spec
   - Keep development section updated with new commands
   - **Done when:** README has install command, code usage example, and spec link

7. **Verify build** — run `tsc` and check output
   - Run `bun run build` (which runs `rm -rf dist && tsc`)
   - List `dist/` contents
   - **Done when:** `dist/` contains `.js` and `.d.ts` files matching `src/` structure

8. **Verify pack** — run `npm pack --dry-run`
   - Run `npm pack --dry-run` and inspect file list
   - **Done when:** output shows only `dist/`, `package.json`, `README.md`, `LICENSE`

## Interfaces

- **PackageExports**: `{ ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } }` — conditional exports map following Node.js package exports spec. Types-first ordering for TypeScript resolution.

## Function Design

No new functions — this issue is configuration-only. The only code change is removing a side effect from `src/index.ts`.

## Acceptance Criteria (EARS)

- **AC-1**: The build step SHALL produce `.js` and `.d.ts` files in `dist/` for every source file in `src/`.
- **AC-2**: `package.json` SHALL have correct `main`, `types`, and `exports` fields pointing to `dist/` output.
- **AC-3**: When `npm pack` is run, it SHALL include only `dist/`, `package.json`, `README.md`, and `LICENSE`.
- **AC-4**: When a push or PR targets `main`, CI SHALL run lint + type-check + test + build.
- **AC-5**: When a push to `main` triggers a new semantic-release version, CI SHALL publish the package to npm.
- **AC-6**: `README.md` SHALL contain installation instructions, a usage example, and a link to the Code-First Agents spec.

## Out of Scope

- Dual CJS/ESM output — package is ESM-only (`"type": "module"`)
- Changing `moduleResolution` from `bundler` to `node16`/`nodenext`
- Actual library API implementation (handled by issues #2–#6)

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | npm scope `@code-first-agents` doesn't exist | [from issue] | External: user creates org on npmjs.com before first publish |
| 2 | Publish format decision: .ts vs .js+.d.ts | [from issue] | Built .js + .d.ts chosen per ACs for broader compatibility |
| 3 | `src/index.ts` has top-level `console.log` side effect | [inferred] | Remove it — side effects on import break library consumers |
| 4 | `.releaserc.json` has `npmPublish: false` | [inferred] | Flip to `true` for publish pipeline |
| 5 | CI semantic-release step is commented out | [inferred] | Uncomment and wire with GITHUB_TOKEN + NPM_TOKEN |
| 6 | `NPM_TOKEN` not configured as GitHub secret | [inferred] | External: user adds secret in repo Settings > Secrets > Actions |
| 7 | Package name is still `bun-ts-template` | [inferred] | Rename to `@code-first-agents/tool` |
| 8 | `bun build` does NOT emit `.d.ts` files | [inferred] | Replace build script with `tsc` which emits both `.js` and `.d.ts` |
| 9 | `tsconfig.json` missing `declaration: true` | [inferred] | Add `declaration` and `declarationMap` compiler options |
| 10 | README badge URL points to wrong repo | [inferred] | Update to `beogip/code-first-agents-tool` |

## Done Criteria per Feature

| Feature | Done when |
|---------|-----------|
| Build pipeline | AC-1, AC-2 |
| Package contents | AC-3 |
| CI/CD | AC-4, AC-5 |
| Documentation | AC-6 |

## Risks

| Risk | Mitigation |
|------|------------|
| npm scope `@code-first-agents` unavailable | User must create the org on npmjs.com before first publish attempt |
| `NPM_TOKEN` not set as GitHub secret | CI publish step will fail; user must add the secret in repo settings |
| `bun-types` in tsconfig `types` array | Generated `.d.ts` may reference Bun types; consumers without `bun-types` get type errors if library uses Bun-specific APIs in its public surface |

## Test Strategy

- **Build verification**: Run `tsc` and verify `dist/` output contains `.js` + `.d.ts` for each source file
- **Pack verification**: Run `npm pack --dry-run` and verify only expected files are included (no `src/`, `tests/`, config files)
- **Regression**: Run `bun test` to confirm existing tests still pass
- **Lint**: Run `biome check` to confirm no lint/format regressions
- **CI review**: Manual review of `.github/workflows/ci.yml` for correct job structure, conditional execution, and secret references

## External Steps (user must perform)

1. **Create npm org**: Go to https://www.npmjs.com/org/create and create the `@code-first-agents` organization
2. **Generate npm token**: Go to npmjs.com > Account > Access Tokens > Generate New Token (select "Automation" type for CI use)
3. **Add GitHub secret**: Go to repo Settings > Secrets and variables > Actions > New repository secret > Name: `NPM_TOKEN`, Value: the token from step 2
4. **Verify GitHub Actions permissions**: Go to repo Settings > Actions > General > Workflow permissions > Select "Read and write permissions"
