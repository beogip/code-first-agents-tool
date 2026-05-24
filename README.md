# @code-first-agents/tool

![CI](https://github.com/beogip/code-first-agents-tool/actions/workflows/ci.yml/badge.svg)
[![npm](https://img.shields.io/npm/v/@code-first-agents/tool)](https://www.npmjs.com/package/@code-first-agents/tool)

TypeScript implementation of the [Code-First Agents](https://github.com/beogip/code-first-agents/blob/main/specs/code-first-agents.md) pattern. Provides a `Tool` base class that enforces the tool contract: deterministic CLI tools with Zod input/output schemas, JSON envelope output, self-describing introspection (`--schema`, `--help`), and always-exit-0 semantics.

**Key idea:** deterministic work lives in code (Tools), the LLM orchestrates judgment (Skills). This library is the Tool side.

## Installation

```bash
bun add @code-first-agents/tool zod@^4
# or
npm install @code-first-agents/tool zod@^4
```

Peer dependency: **Zod v4** (`^4.0.0`).

## Usage

A `Tool` registers subcommands — each with a Zod input schema, an output schema, and a handler — then dispatches via CLI args or programmatic invocation.

### Minimal example

```ts
#!/usr/bin/env bun
import { z } from "zod";
import { Tool, l1Output } from "@code-first-agents/tool";

const tool = new Tool({
  name: "math",
  description: "Basic math operations",
});

tool.subcommand({
  name: "multiply",
  description: "Multiply two numbers",
  input: z.object({
    a: z.coerce.number(),
    b: z.coerce.number(),
  }).strict(),
  output: l1Output({ product: z.number() }),
  handler: ({ a, b }) => ({
    message: "multiplied",
    product: a * b,
  }),
});

tool.run(process.argv.slice(2));
```

Run it from the CLI:

```bash
bun run math.ts multiply --a 6 --b 7
# → {"ok":true,"message":"multiplied","product":42}
```

### Output levels

The spec defines three output levels. Use the corresponding helper to build the output schema:

**L1 — Data** (raw facts for the LLM to interpret):

```ts
import { l1Output } from "@code-first-agents/tool";

tool.subcommand({
  name: "greet",
  description: "Greet someone by name",
  input: z.object({ name: z.string() }).strict(),
  output: l1Output({ greeting: z.string() }),
  handler: ({ name }) => ({
    message: `greeted ${name}`,
    greeting: `hello ${name}`,
  }),
});
```

**L2 — Classification** (a discrete category the skill can branch on):

```ts
import { l2Output } from "@code-first-agents/tool";

tool.subcommand({
  name: "report",
  description: "Emit a report classified by log level",
  input: z.object({
    level: z.enum(["info", "debug"]).default("info"),
  }).strict(),
  output: l2Output(z.enum(["info", "debug"])),
  handler: ({ level }) => ({
    message: `report generated (level=${level})`,
    classification: level,
  }),
});
```

**L3 — Instructions** (a verbatim procedure for the LLM to execute):

```ts
import { l3Output } from "@code-first-agents/tool";

tool.subcommand({
  name: "instruct",
  description: "Emit a verbatim instruction set",
  input: z.object({}).strict(),
  output: l3Output({ topic: z.string() }),
  handler: () => ({
    message: "instructions generated",
    instructions: "## Step 1\nDo the thing.",
    topic: "setup",
  }),
});
```

### Handler contract

- Handlers return the output shape **without `ok`** — the framework stamps `ok: true` automatically.
- Handlers always return a `message: string` describing what happened.
- Input schemas should use `.strict()` to reject unknown flags.
- Handlers can be sync or async.

### Error handling

All errors exit with code 0 and return `{ ok: false, error: "...", ... }`. Throw `ToolError` for domain-specific errors:

```ts
import { ToolError } from "@code-first-agents/tool";

tool.subcommand({
  name: "validate",
  description: "Validate a config file",
  input: z.object({ code: z.string() }).strict(),
  output: l1Output({}),
  handler: ({ code }) => {
    throw new ToolError(code, `Validation failed with code '${code}'`);
  },
});
```

The framework also handles: `unknown_subcommand`, `input_validation_error`, `schema_violation`, and `unexpected_error`.

### Built-in subcommands

Every tool gets `schema` and `help` for free:

```bash
bun run math.ts schema   # JSON Schema for all subcommands
bun run math.ts help     # Human-readable subcommand listing
```

These are auto-registered — you cannot override them.

### Programmatic invocation

Use `.invoke()` to call a subcommand in-process (useful in tests):

```ts
const result = await tool.invoke("multiply", { a: 6, b: 7 });
// → { ok: true, message: "multiplied", product: 42 }
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
| `bun run build`  | Compile to `dist/` (bun + tsc)  |
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

## The Code-First Agents Pattern

This library implements the tool contract from the [Code-First Agents spec](https://github.com/beogip/code-first-agents/blob/main/specs/code-first-agents.md). The spec defines a separation principle:

- **Tools** (this library) — deterministic, no LLM calls, Zod-validated I/O, JSON envelope output.
- **Skills** — LLM-powered orchestrators that call tools and apply judgment.

If you're new to the pattern, start with the [spec repo](https://github.com/beogip/code-first-agents) for the full picture of how tools, skills, and agents compose together.

## License

[MIT](LICENSE)

