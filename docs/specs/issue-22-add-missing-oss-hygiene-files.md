---
issue_number: 22
issue_title: "Add missing OSS hygiene files"
repo: "beogip/code-first-agents-tool"
labels: [P1, pre-launch]
plan_level: "lean"
depth: "medium"
branch_name: "chore/22-oss-hygiene-files"
created_at: "2026-06-07T16:41:42Z"
updated_at: "2026-06-07T17:05:00Z"
---

# Implementation Plan: #22 — Add missing OSS hygiene files

> Refined via a grill-me interview (8 sequential decisions). Scope was expanded beyond the
> literal issue to include CODE_OF_CONDUCT.md and PULL_REQUEST_TEMPLATE.md per maintainer choice.

## Decisions (grill-me)
| # | Decision | Choice |
|---|----------|--------|
| 1 | Scope | Issue's 6 items **+ CODE_OF_CONDUCT.md + PULL_REQUEST_TEMPLATE.md** |
| 2 | CI concurrency | Job-level on `ci`; `cancel-in-progress: ${{ github.event_name == 'pull_request' }}` (cancel on PRs, never on main → never skips a release) |
| 3 | Dependabot | Group **everything incl. majors**, weekly, `npm` + `github-actions`, target `main`, label `chore`, `commit-message.prefix: chore`, `open-pull-requests-limit: 5` |
| 4 | SECURITY channel | **Enable** GitHub private vulnerability reporting via `gh api`, cite it as primary + beogip@gmail.com fallback; Supported Versions = latest release only |
| 5 | Issue forms | bug → title `[Bug]: ` + label `bug`; feature → `[Feature]: ` + label `enhancement`; `config.yml` `blank_issues_enabled: false` + contact_link to spec (Discussions are disabled) |
| 6 | CONTRIBUTING | Issue-first (lightweight), Conventional Commits, bun commands, `bun install` installs lefthook, inbound=outbound MIT |
| 7 | README | Maintenance note near the intro; concise `## API Reference` after Usage (export signatures + one-liner + spec link) |
| 8 | Delivery | One PR on `chore/22-oss-hygiene-files`, multiple commits grouped by area (`docs:`, `ci:`, `chore:`) — all non-release types, so semantic-release does not bump |

## Files
| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | create | `SECURITY.md` | Disclosure policy. Supported Versions = only the latest published release. Report via GitHub private vulnerability reporting (primary) + beogip@gmail.com (fallback). |
| 2 | create | `CONTRIBUTING.md` | Issue-first flow, full Conventional Commit type list (from `lefthook.yml`), bun dev commands (`install/dev/build/test/lint/format/check`), note that `bun install` installs lefthook hooks, inbound=outbound MIT. |
| 3 | create | `CODE_OF_CONDUCT.md` | Contributor Covenant v2.1, enforcement contact = beogip@gmail.com. |
| 4 | create | `.github/ISSUE_TEMPLATE/config.yml` | `blank_issues_enabled: false` + contact_link to https://code-first-agents.com. |
| 5 | create | `.github/ISSUE_TEMPLATE/bug_report.yml` | YAML form, `title: "[Bug]: "`, `labels: [bug]`, fields id'd, ≥1 required (version, repro, expected/actual, environment). |
| 6 | create | `.github/ISSUE_TEMPLATE/feature_request.yml` | YAML form, `title: "[Feature]: "`, `labels: [enhancement]`, fields id'd, ≥1 required (problem, proposal, alternatives, spec alignment). |
| 7 | create | `.github/PULL_REQUEST_TEMPLATE.md` | Short checklist: linked issue, Conventional Commit title, tests/lint/build green, scope of change. |
| 8 | create | `.github/dependabot.yml` | v2; `npm` + `github-actions`, weekly, `groups` covering all update types incl. major, `open-pull-requests-limit: 5`, `commit-message.prefix: chore`, `labels: [chore]`. |
| 9 | modify | `.github/workflows/ci.yml` | Add `permissions: contents: read` to the `ci` job; add **job-level** `concurrency` under `jobs.ci` (group `ci-${{ github.ref }}`, `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`). Release job byte-identical. |
| 10 | modify | `README.md` | Add a "maintained in spare time" note near the intro + `## API Reference` after Usage (`Tool`, `.run`/`.invoke`, `l1/l2/l3Output`, `ToolError`, `schema`/`help` builtins, link to spec). |

**Non-file action (implementation phase):** enable GitHub private vulnerability reporting —
`gh api -X PUT repos/beogip/code-first-agents-tool/private-vulnerability-reporting` — before SECURITY.md cites it. Outward repo-settings change, authorized by maintainer (grill 4).

## Codebase Context
- **Conventional Commit types** from the `commit-msg` regex in `lefthook.yml`: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`. CONTRIBUTING.md must mirror this exactly.
- **Dev scripts** (`package.json`): `dev, build, test, lint, format, check`; `prepare` runs `lefthook install` on `bun install`.
- **Existing labels**: `bug`, `enhancement`, `documentation`, `chore`, `api`, `packaging`, `P0/P1/P2`, `pre-launch` exist. There is **no** `dependencies` label → Dependabot uses `chore`.
- **Discussions disabled** → `config.yml` contact_link points to the spec site, not Discussions.
- `.github/workflows/ci.yml`: jobs `ci` (no permissions/concurrency today) and `release` (`semantic-release` on push to `main`, `needs: ci`, full permissions). Concurrency scoped to `ci` so a fast second push to main never cancels a release.
- `.github/workflows/claude.yml` already uses concurrency (reference only; its group is per-issue).
- **Dependabot ecosystems**: `npm` (`package.json` + `bun.lock`) and `github-actions` (`ci.yml`, `claude.yml`).
- **Public exports** (CLAUDE.md): `Tool` class with `.run()`/`.invoke()`, `l1Output`/`l2Output`/`l3Output`, `ToolError`, builtins `schema`/`help`.
- **Package**: `@code-first-agents/tool` v0.1.3, MIT © 2026 Juan Gipponi, homepage code-first-agents.com, runtime Bun, peer dep Zod v4.

## Steps
1. **Enable private vulnerability reporting** via `gh api -X PUT repos/beogip/code-first-agents-tool/private-vulnerability-reporting`. **Done when:** the API call returns success (or already-enabled), confirmed by `gh api repos/beogip/code-first-agents-tool/private-vulnerability-reporting`.
2. **Create SECURITY.md.** **Done when:** has "Reporting a Vulnerability" (GitHub private reporting primary + email fallback) and "Supported Versions" stating only the latest published release is supported.
3. **Create CONTRIBUTING.md.** **Done when:** lists every Conventional type matching `lefthook.yml`, the bun dev commands, the issue-first flow, the lefthook-via-`bun install` note, and an inbound=outbound MIT statement.
4. **Create CODE_OF_CONDUCT.md.** **Done when:** Contributor Covenant text present with beogip@gmail.com as the enforcement contact.
5. **Create the 3 ISSUE_TEMPLATE files.** **Done when:** all parse as YAML; `config.yml` has `blank_issues_enabled: false` + a contact_link; each form has `name`/`description`/`title`/`labels`/`body`, every body field has an `id`, ≥1 has `validations.required: true`; bug uses `[Bug]: `+`bug`, feature uses `[Feature]: `+`enhancement`.
6. **Create .github/PULL_REQUEST_TEMPLATE.md.** **Done when:** contains a checklist covering linked issue, Conventional Commit title, and tests/lint/build green.
7. **Create .github/dependabot.yml.** **Done when:** `version: 2`, two `updates` (`npm` + `github-actions`) weekly, each with a `groups` block matching all `update-types` (incl. major), `open-pull-requests-limit: 5`, `commit-message.prefix: chore`, `labels: [chore]`, `target-branch: main`.
8. **Modify .github/workflows/ci.yml.** **Done when:** `jobs.ci` has `permissions: contents: read` and a nested `concurrency` block with `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`; no top-level `concurrency` key; `release` job byte-identical; file parses as valid YAML.
9. **Modify README.md.** **Done when:** a "maintained in spare time" note exists near the intro and a `## API Reference` section after Usage documents the public exports with one-line purposes + a spec link.

## Interfaces
N/A — all artifacts are Markdown/YAML. No TypeScript data structures introduced.

## Function Design
N/A — no functions added or modified; documentation/configuration only. No `src/` changes.

## Acceptance Criteria (EARS)
- **AC-1.** The repository shall contain a root `SECURITY.md` describing vulnerability reporting (GitHub private reporting + email) and supported versions.
- **AC-2.** The repository shall contain `CONTRIBUTING.md` documenting the Conventional Commit types, the bun dev/test/build commands, the issue-first flow, and the inbound=outbound license.
- **AC-3.** The repository shall contain `CODE_OF_CONDUCT.md` with a reachable enforcement contact.
- **AC-4.** The repository shall contain `.github/ISSUE_TEMPLATE/` with a bug report and a feature request as YAML issue forms (with auto-labels and title prefixes) plus a `config.yml` that disables blank issues.
- **AC-5.** The repository shall contain `.github/PULL_REQUEST_TEMPLATE.md` with a contributor checklist.
- **AC-6.** The repository shall contain `.github/dependabot.yml` covering the `npm` and `github-actions` ecosystems weekly, grouping all update types, with `commit-message.prefix: chore`.
- **AC-7.** When the ci workflow runs, the `ci` job shall declare `permissions: contents: read`.
- **AC-8.** When a new ci run starts for the same ref on a **pull_request**, the workflow shall cancel the superseded ci run; when the event is a **push to main**, it shall NOT cancel the in-progress ci run (so `release` is never skipped).
- **AC-9.** The README shall include an API Reference section and a "maintained in spare time" note near the intro.
- **AC-10.** GitHub private vulnerability reporting shall be enabled for the repository.

## Out of Scope
- `FUNDING.yml` — not requested.
- Top-level `permissions: read-all` workflow default — issue scopes hardening to the `ci` job; release job keeps its explicit block.
- Pinning ci.yml actions to commit SHAs or pinning `bun-version` — Dependabot (github-actions) will surface action updates.
- Any source-code or test-code changes under `src/` or `tests/`.

## Edge Cases + Error Handling
| # | Scenario | Source | Handling |
|---|----------|--------|----------|
| 1 | Fast second push to main cancels the `ci` of an earlier commit → its `release` never runs | [from issue] / [inferred] | `cancel-in-progress` gated to `pull_request` only; main pushes never cancel (AC-8). |
| 2 | Dependabot commits must satisfy Conventional Commits | [inferred] | `commit-message.prefix: chore` → `chore(deps): …`. lefthook runs locally only, so Dependabot/CI unaffected regardless. |
| 3 | Grouping majors can bundle a breaking bump into the weekly PR | [inferred] | Accepted by maintainer (grill 3); the grouped PR is reviewed before merge, and CI must pass first. |
| 4 | Invalid YAML breaks GitHub features silently | [inferred] | Parse-validate every new/modified YAML file. |
| 5 | SECURITY.md cites private reporting while the toggle is off | [inferred] | Step 1 enables it via `gh api` before the doc cites it (AC-10). |
| 6 | Discussions disabled → a contact_link to Discussions would 404 | [inferred] | config.yml contact_link points to the spec site instead. |
| 7 | `contents: read` too restrictive for checkout `fetch-depth: 0` | [inferred] | Sufficient for read-only checkout; future write-needing steps must elevate; release job unaffected. |
| 8 | CONTRIBUTING type list drifts from the hook | [inferred] | Cross-check against `lefthook.yml`; grep-verify every type string present. |
| 9 | Issue forms parse as YAML but fail GitHub's form schema | [inferred] | Structural-validate: each body field has `id`, ≥1 `validations.required: true`, top-level `name`/`description`/`body` present. |

## Done Criteria per Feature
| Feature | Done when |
|---------|-----------|
| SECURITY.md + private reporting | AC-1, AC-10 |
| CONTRIBUTING.md | AC-2 |
| CODE_OF_CONDUCT.md | AC-3 |
| Issue templates | AC-4 |
| PR template | AC-5 |
| Dependabot | AC-6 |
| CI hardening | AC-7, AC-8 |
| README | AC-9 |

## Risks
- **Concurrency cancels a release** → gated to PRs only (Edge 1 / AC-8); assert no top-level `concurrency`.
- **Grouped major bump breaks the weekly PR** → CI gates the PR; review before merge (Edge 3).
- **YAML syntax/schema errors** → parse + structural validation (Edge 4, 9).
- **Security contact goes stale** → email is fallback; repo-tied private reporting is primary (enabled in Step 1).
- **`gh api` private-reporting call fails** (permissions) → surface the error; SECURITY.md still ships with email fallback, re-run the toggle later.

## Test Strategy
- No unit tests (docs/config only). Verify the pipeline stays green: `bun test`, `bunx biome check .`, `bunx tsc --noEmit`, `bun run build`.
- Parse-validate every new/modified YAML file (issue forms, dependabot.yml, ci.yml).
- Structural-validate issue forms: top-level `name`/`description`/`body`; each field has `id`; ≥1 `validations.required: true`; correct `title` prefix + `labels`.
- Assert ci.yml `jobs.ci.concurrency` present, root `concurrency` absent, `release` job unchanged (scoped `git diff`).
- grep-verify: CONTRIBUTING.md contains every Conventional type; dependabot.yml `commit-message.prefix` is `chore`.
- Confirm private vulnerability reporting is enabled via `gh api`.
- Manual (best-effort, post-merge): GitHub renders the issue forms; ci job shows read-only permission.
