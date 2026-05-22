# @code-first-agents/tool

![CI](https://github.com/beogip/code-first-agents-tool/actions/workflows/ci.yml/badge.svg)

Code-first agent tool definitions with Zod schemas.

## Getting Started

**Prerequisites:** [Bun](https://bun.sh) >= 1.0

```bash
bun add @code-first-agents/tool
```

## Development

```bash
git clone https://github.com/beogip/code-first-agents-tool
cd code-first-agents-tool
bun install
```

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

## License

[MIT](LICENSE)
