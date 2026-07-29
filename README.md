# @code-first-agents/tool

![CI](https://github.com/beogip/code-first-agents-tool/actions/workflows/ci.yml/badge.svg)
[![npm](https://img.shields.io/npm/v/@code-first-agents/tool)](https://www.npmjs.com/package/@code-first-agents/tool)

TypeScript implementation of the [Code-First Agents](https://code-first-agents.com/patterns/deterministic-tools.html) pattern. Provides a `Tool` base class that enforces the tool contract: deterministic CLI tools with Zod input/output schemas, JSON envelope output, self-describing introspection (`--schema`, `--help`), and always-exit-0 semantics.

**Key idea:** deterministic work lives in code (Tools), the LLM orchestrates judgment (Skills). This library is the Tool side.

> ℹ️ This project is maintained in spare time. Issues and pull requests are very
> welcome — please bear with best-effort response times.

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
import { Tool } from "@code-first-agents/tool";

const tool = new Tool({
  name: "math",
  description: "Basic math operations",
});

tool.dataSubcommand({
  name: "multiply",
  description: "Multiply two numbers",
  input: z.object({
    a: z.coerce.number(),
    b: z.coerce.number(),
  }).strict(),
  output: { product: z.number() },
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

### Output types

Every tool output is one of the three tool types the spec defines, so there is one registration method per type. In each of them, `output` declares **only the fields your tool returns** — the `{ ok, message }` envelope is composed for you, and TypeScript infers the handler's return type from it.

**Data** (raw facts for the LLM to interpret):

```ts
tool.dataSubcommand({
  name: "greet",
  description: "Greet someone by name",
  input: z.object({ name: z.string() }).strict(),
  output: { greeting: z.string() },
  handler: ({ name }) => ({
    message: `greeted ${name}`,
    greeting: `hello ${name}`,
  }),
});
```

**Classification** (a discrete category the skill can branch on):

```ts
tool.classificationSubcommand({
  name: "report",
  description: "Emit a report classified by log level",
  input: z.object({
    level: z.enum(["info", "debug"]).default("info"),
  }).strict(),
  output: { classification: z.enum(["info", "debug"]) },
  handler: ({ level }) => ({
    message: `report generated (level=${level})`,
    classification: level,
  }),
});
```

`output` **must** declare a `classification` key — the enum is yours to choose, so omitting it is a compile error. Extra fields sit alongside it.

**Procedure** (a verbatim procedure for the LLM to execute):

```ts
tool.procedureSubcommand({
  name: "instruct",
  description: "Emit a verbatim instruction set",
  input: z.object({}).strict(),
  output: { topic: z.string() },
  handler: () => ({
    message: "instructions generated",
    instructions: "## Step 1\nDo the thing.",
    topic: "setup",
  }),
});
```

`instructions` is always a required string, so it is composed for you rather than declared — pass `output` only for extras, and omit it entirely when there are none.

### Handler contract

- Handlers return the output shape **without `ok`** — the framework stamps `ok: true` automatically.
- Handlers always return a `message: string` describing what happened.
- The fields fixed by the tool type (`ok`, `message`, `instructions`) are never declared in `output`; the ones you choose (`classification`, your own data) always are.
- Input schemas should use `.strict()` to reject unknown flags.
- Handlers can be sync or async.

### Error handling

All errors exit with code 0 and return `{ ok: false, error: "...", ... }`. Throw `ToolError` for domain-specific errors:

```ts
import { ToolError } from "@code-first-agents/tool";

tool.dataSubcommand({
  name: "validate",
  description: "Validate a config file",
  input: z.object({ path: z.string() }).strict(),
  output: {},
  handler: ({ path }) => {
    throw new ToolError("validation_failed", `Config at '${path}' is invalid`);
  },
});
```

The framework also handles: `unknown_subcommand`, `input_validation_error`, `schema_violation`, `non_object_return`, and `unexpected_error`.

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

## Examples

A complete, clonable tool lives in [`examples/`](examples/) — run it and compare the JSON, no build step required:

```bash
bun run examples/changeset.ts size --files 12 --additions 340 --deletions 50
# → {"ok":true,"message":"changeset classified as large","classification":"large","total_lines":390}
```

`examples/changeset.ts` is one tool that demonstrates all three tool types (data, classification, procedure). See [`examples/README.md`](examples/README.md) for the full walkthrough.

## API Reference

All exports come from the package root (`@code-first-agents/tool`). See the
[spec](https://code-first-agents.com/patterns/deterministic-tools.html) for the
contract these implement.

| Export                       | Kind     | Purpose                                                                                  |
| ---------------------------- | -------- | ---------------------------------------------------------------------------------------- |
| `Tool`                       | class    | The orchestrator. Construct with `{ name, description }`, register subcommands, dispatch. |
| `tool.dataSubcommand(spec)` | method | Register a **data** subcommand — raw signals for the LLM to interpret. `output` is a Zod shape of your own fields; pass `{}` for envelope-only output. |
| `tool.classificationSubcommand(spec)` | method | Register a **classification** subcommand — a discrete category to branch on. `output` must declare a `classification` key (commonly `z.enum(...)`), plus any extras. |
| `tool.procedureSubcommand(spec)` | method | Register a **procedure** subcommand — a verbatim procedure for the LLM. `instructions` is composed for you; `output` is optional and carries extras only. |
| `tool.run(argv)`             | method   | Parse CLI args, dispatch, print the JSON envelope, and `process.exit(0)`.                 |
| `tool.invoke(name, args)`    | method   | Call a subcommand in-process; returns the envelope object (useful in tests).             |
| `ToolError`                  | class    | Throw inside a handler for domain-specific errors: `new ToolError(code, message, detail?)`. Optional `detail` (string or object) is included in the error envelope's `detail` field. |
| `schema` (builtin)           | command  | Auto-registered. Emits JSON Schema for every subcommand. Not user-overridable.           |
| `help` (builtin)             | command  | Auto-registered. Emits a human-readable subcommand listing. Not user-overridable.        |

Each registration method takes a spec of `{ name, description, input, output, handler }`.
The matching spec types (`DataTypeSubcommandSpec`, `ClassificationTypeSubcommandSpec`,
`ProcedureTypeSubcommandSpec`) and composed-schema types (`DataTypeSchema`,
`ClassificationTypeSchema`, `ProcedureTypeSchema`, `ClassificationShape`) are exported for
consumers who need to name them.

Every successful result is the envelope `{ ok: true, message, ... }`; every error is
`{ ok: false, error, ... }` with exit code `0`.

## Development

**Prerequisites:** [Bun](https://bun.sh) >= 1.0

```bash
git clone https://github.com/beogip/code-first-agents-tool.git
cd code-first-agents-tool
bun install
```

| Command          | Description                     |
| ---------------- | ------------------------------- |
| `bun run dev`    | Re-run `src/index.ts` on change (watch) |
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

This library implements the tool contract from the [Code-First Agents spec](https://code-first-agents.com/patterns/deterministic-tools.html). The spec defines a separation principle:

- **Tools** (this library) — deterministic, no LLM calls, Zod-validated I/O, JSON envelope output.
- **Skills** — LLM-powered orchestrators that call tools and apply judgment.

If you're new to the pattern, start with the [spec repo](https://github.com/beogip/code-first-agents) for the full picture of how tools, skills, and agents compose together.

## Contributing

Contributions are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) for the
issue-first workflow, development setup, and commit conventions, and please review
the [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for the release history, generated automatically
by semantic-release.

## License

[MIT](LICENSE)

