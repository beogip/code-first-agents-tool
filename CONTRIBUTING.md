# Contributing

Thanks for your interest in `@code-first-agents/tool`! This project implements the
[Code-First Agents](https://code-first-agents.com/patterns/deterministic-tools.html)
tool contract. Contributions are welcome — please read this guide first.

> This project is maintained in spare time. Reviews and responses are best-effort,
> so thank you for your patience.

## Issue-first workflow

Please **open an issue before sending a pull request**. This keeps the work
lightweight and avoids duplicated or unwanted effort:

1. Open an issue describing the bug or feature (use the issue forms).
2. Wait for a quick confirmation that the change is wanted and the approach is sound.
3. Fork, branch, and open a PR that links back to the issue.

Small, obvious fixes (typos, broken links) can skip straight to a PR.

## Development setup

**Prerequisites:** [Bun](https://bun.sh) >= 1.0

```bash
git clone https://github.com/beogip/code-first-agents-tool.git
cd code-first-agents-tool
bun install
```

`bun install` runs the `prepare` script, which installs the
[Lefthook](https://github.com/evilmartians/lefthook) git hooks (pre-commit Biome
checks and commit-message validation).

### Commands

| Command          | Description                       |
| ---------------- | --------------------------------- |
| `bun install`    | Install deps + install git hooks  |
| `bun run dev`    | Re-run `src/index.ts` on change (watch mode) |
| `bun run build`  | Compile to `dist/` (bun + tsc)    |
| `bun test`       | Run tests                         |
| `bun run lint`   | Lint (Biome)                      |
| `bun run format` | Format (Biome, auto-fix)          |
| `bun run check`  | Lint + format (Biome, auto-fix)   |

Before opening a PR, make sure the pipeline is green:

```bash
bun test
bunx biome check .
bunx tsc --noEmit
bun run build
```

## Commit messages

This repository enforces [Conventional Commits](https://www.conventionalcommits.org/)
via the `commit-msg` git hook. Each commit message must start with one of these types:

`feat` | `fix` | `docs` | `style` | `refactor` | `perf` | `test` | `build` | `ci` | `chore` | `revert`

Examples:

```
feat: add user authentication
fix(auth): handle token expiry
chore!: drop support for Node 16
```

A `!` (or a `BREAKING CHANGE:` footer) marks a breaking change. Releases are
automated via semantic-release, so commit types directly drive version bumps:
`feat` → minor, `fix` → patch, breaking → major.

## License

This project is licensed under the [MIT License](LICENSE). By contributing, you agree
that your contributions are licensed under the same terms (inbound = outbound).
