# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

`@code-first-agents/tool` — the TypeScript implementation of the **Code-First Agents** pattern. This library provides the `Tool` base class that enforces the tool contract from the spec: deterministic CLI tools with Zod input/output schemas, JSON envelope output, self-describing `schema`/`help` introspection, and always-exit-0 semantics.

**Spec:** https://github.com/beogip/code-first-agents/blob/main/specs/code-first-agents.md — the authoritative reference for the pattern. Key concepts this library implements:
- **Tool contract:** named input params, JSON-only output, no LLM calls inside tools, deterministic results, `--schema` for self-description, loud failure modes.
- **Output spectrum:** L1 (data — raw signals for LLM interpretation), L2 (classification — discrete categories with branching), L3 (instructions — complete procedures the LLM executes verbatim).
- **Separation principle:** deterministic work lives in code (Tools), the LLM orchestrates judgment (Skills). This repo is the Tool side.

When making design decisions about API surface, error handling, or output shapes, defer to the spec. If something in this codebase contradicts the spec, the spec wins.

Peer dependency: **Zod v4** (`^4.0.0`). Runtime: **Bun** (>= 1.0).

## Commands

```bash
bun install                  # install deps
bun test                     # run all tests
bun test tests/cli.test.ts   # run a single test file
bun run build                # compile to dist/ (bun build + tsc declarations)
bun run check                # lint + format via Biome (auto-fix)
bunx biome check .           # lint without auto-fix (what CI runs)
bunx tsc --noEmit            # type-check only
```

## Architecture

The library exports a single `Tool` class that acts as the orchestrator. A tool registers subcommands (each with Zod input + output schemas and a handler), then calls `.run(process.argv.slice(2))` for CLI dispatch or `.invoke(name, args)` for programmatic use.

**Dispatch pipeline (`tool-class.ts`):**
1. `parseArgs` (args.ts) — tokenizes argv into `{subcommand, flags, positional}`
2. Builtins — `schema` and `help` are auto-registered, never user-registerable
3. `validateInput` (args.ts) — runs `safeParse` on merged flags + positional (`_` key)
4. Handler execution — receives typed, validated input
5. Output stamping — framework adds `ok: true` to handler return before output validation
6. `jsonOutput` (utils.ts) — serializes envelope to stdout, `process.exit(0)`

**Output levels (`output-helpers.ts`):** `l1Output` (raw data), `l2Output` (classification enum), `l3Output` (instructions string). These compose the `{ok, message, ...}` envelope schema.

**Error envelopes (`envelopes.ts`):** All errors exit 0 with `ok: false`. Codes: `unknown_subcommand`, `input_validation_error`, `schema_violation`, `non_object_return`, `unexpected_error`. Handlers throw `ToolError` for business-specific error codes.

**JSON Schema (`json-schema.ts`):** Wraps `z.toJSONSchema` with fail-soft behavior — exotic Zod constructs get `{$error}` instead of crashing.

## Conventions

- **Conventional Commits** enforced by lefthook `commit-msg` hook. Types: `feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert`.
- **Biome** for linting and formatting. Key rules: no unused vars/imports (error), no console (warn), no explicit any (warn), double quotes, trailing commas, semicolons.
- **Strict TypeScript:** `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`.
- Tests use `bun:test`. Unit tests (`index.test.ts`, `args.test.ts`) use `Tool.invoke()`. Black-box CLI tests (`cli.test.ts`) spawn `tests/fixtures/dummy-tool.ts` as a subprocess.
- All CLI flags are `--key value` pairs. Positional args go under the `_` key. The `--` sentinel ends flag parsing (POSIX).
- Input schemas should use `.strict()` to reject unknown flags. Output schemas should use level helpers or include `ok: z.literal(true)` + `message: z.string()`.
- Handlers return the output shape **without** `ok` — the framework stamps it.
- Releases are automated via semantic-release on push to `main`. npm publishing uses `NODE_AUTH_TOKEN`.
