# @code-first-agents/tool

![CI](https://github.com/beogip/code-first-agents-tool/actions/workflows/ci.yml/badge.svg)
[![npm](https://img.shields.io/npm/v/@code-first-agents/tool)](https://www.npmjs.com/package/@code-first-agents/tool)

TypeScript toolkit for the [Code-First Agents](https://github.com/beogip/code-first-agents-tool) specification.

## Installation

```bash
bun add @code-first-agents/tool
# or
npm install @code-first-agents/tool
```

## Usage

```ts
import { greet } from "@code-first-agents/tool";

console.log(greet("world")); // "Hello, world!"
```

## Development

**Prerequisites:** [Bun](https://bun.sh) >= 1.0

```bash
git clone https://github.com/beogip/code-first-agents-tool.git
cd code-first-agents-tool
bun install
```

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `bun run dev`    | Run with file watcher           |
| `bun run build`  | Compile to `dist/` (tsc)        |
| `bun test`       | Run tests                       |
| `bun run check`  | Lint + format (Biome, auto-fix) |
| `bun run lint`   | Lint only                       |
| `bun run format` | Format only                     |

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

The CI workflow handles changelog generation, npm publishing, GitHub releases, and version bumping automatically.

## License

[Apache-2.0](LICENSE)
