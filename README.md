# bun-ts-template

![CI](https://github.com/beogip/bun-ts-template/actions/workflows/ci.yml/badge.svg)

Minimal TypeScript starter for [Bun](https://bun.sh). Includes Biome for linting/formatting, Lefthook for git hooks, and semantic-release for automated versioning.

## Getting Started

**Prerequisites:** [Bun](https://bun.sh) >= 1.0

```bash
# Use this template on GitHub, then:
git clone https://github.com/<your-username>/<your-repo>
cd <your-repo>
bun install
```

## Development

| Command          | Description                    |
| ---------------- | ------------------------------ |
| `bun run dev`    | Run with file watcher          |
| `bun run build`  | Compile to `dist/`             |
| `bun test`       | Run tests                      |
| `bun run check`  | Lint + format (Biome, auto-fix)|
| `bun run lint`   | Lint only                      |
| `bun run format` | Format only                    |

## Project Structure

```
src/          # Source code
tests/        # Test files (*.test.ts)
dist/         # Build output (git-ignored)
```

## Git Hooks

[Lefthook](https://github.com/evilmartians/lefthook) runs automatically after `bun install` (via the `prepare` script):

- **pre-commit** — Biome checks and auto-fixes staged files
- **commit-msg** — Validates [Conventional Commits](https://www.conventionalcommits.org/) format

## Releases

Releases are automated via [semantic-release](https://semantic-release.gitbook.io/) on every push to `main`:

- `feat:` → minor release
- `fix:` → patch release
- `feat!:` or `BREAKING CHANGE:` → major release

The CI workflow handles changelog generation, GitHub releases, and version bumping automatically.
