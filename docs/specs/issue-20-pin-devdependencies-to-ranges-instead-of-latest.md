---
issue_number: 20
issue_title: "Pin devDependencies to ranges instead of latest"
repo: "beogip/code-first-agents-tool"
labels: [claude]
plan_level: "lean"
depth: "medium"
branch_name: "claude/issue-20-20260608-0304"
created_at: "2026-06-08T03:05:42Z"
---

# Implementation Plan: #20 — Pin devDependencies to ranges instead of latest

## Files
| Action | Path | Purpose |
|---|---|---|
| modify | `package.json` | Replace `latest` in `devDependencies` with caret ranges pinned to the versions currently resolved in `bun.lock` |

## Codebase Context
- `package.json` `devDependencies` (lines 53–66) currently set 10 of 11 entries to `latest`; `zod` already uses `^4.0.0`.
- `bun.lock` holds the resolved versions; `bun install --frozen-lockfile` in CI guarantees reproducibility today. The risk is a future lockfile regeneration silently pulling a new major into the build/release path.
- Conventions (`CLAUDE.md`): Conventional Commits enforced by lefthook `commit-msg`; Biome for lint/format; releases automated by semantic-release on push to `main`.

## Steps
1. Replace each `latest` devDependency with a caret range matching the version in `bun.lock`.
   **Done when:** `package.json` contains no `"latest"` value under `devDependencies` and every entry uses a `^x.y.z` range matching `bun.lock`.
2. Run `bun install --frozen-lockfile` to confirm the new ranges are satisfied by the existing lockfile (no lockfile churn).
   **Done when:** `bun install --frozen-lockfile` exits 0 with no changes to `bun.lock`.
3. Verify the toolchain: `bunx biome check .`, `bunx tsc --noEmit`, `bun test`.
   **Done when:** lint, type-check, and the full test suite all pass.

## Interfaces
N/A — configuration-only change; no code interfaces introduced.

## Function Design
N/A — no functions added or modified.

## Acceptance Criteria (EARS)
- AC-1. The `devDependencies` block in `package.json` shall not contain the value `"latest"` for any entry.
- AC-2. Each pinned devDependency shall use a caret range (`^x.y.z`) whose base version matches the version resolved in `bun.lock`.
- AC-3. When `bun install --frozen-lockfile` is run, the command shall succeed without modifying `bun.lock`.
- AC-4. When the existing test, lint, and type-check commands are run, they shall continue to pass.

## Out of Scope
- Upgrading any dependency to a newer version (ranges are pinned to currently-resolved versions, not bumped).
- Changing `peerDependencies` (`zod`) or runtime dependencies.
- Introducing exact pins (`x.y.z` without caret) or a Renovate/Dependabot configuration.

## Edge Cases + Error Handling
| # | Scenario | Source | Handling |
|---|---|---|---|
| 1 | A caret range does not match the lockfile-resolved version | [inferred] | Versions are read directly from `bun.lock`, so `^resolved` always satisfies the lockfile; verified by `--frozen-lockfile`. |
| 2 | `bun install --frozen-lockfile` regenerates the lockfile | [inferred] | Treated as failure — caret of the resolved version must not force a re-resolve. |
| 3 | `typescript@^6.0.2` looks unusual | [inferred] | Range is taken verbatim from the resolved `bun.lock` entry; not second-guessed. |

## Done Criteria per Feature
| Feature | Done when |
|---|---|
| Pinned devDependencies | AC-1, AC-2, AC-3, AC-4 all pass |

## Risks
- A caret range still allows minor/patch updates on a fresh `bun install` without `--frozen-lockfile`. Acceptable per the issue (it explicitly asks for caret ranges, not exact pins). Mitigation: CI already uses `--frozen-lockfile`.
- No runtime files are generated; nothing new to gitignore.

## Test Strategy
- No new tests — configuration change.
- Regression gate: `bun install --frozen-lockfile` (no lockfile churn), `bunx biome check .`, `bunx tsc --noEmit`, `bun test` must all pass.
