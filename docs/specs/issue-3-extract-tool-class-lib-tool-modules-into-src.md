---
issue_number: 3
issue_title: "[#1] feat: extract Tool class + lib/tool/ modules into src/"
repo: "beogip/code-first-agents-tool"
labels: [enhancement]
plan_level: "lean"
depth: "medium"
branch_name: "feat/3-extract-tool-class-modules"
created_at: "2026-05-21T00:00:00Z"
---

# Implementation Plan: #3 — [#1] feat: extract Tool class + lib/tool/ modules into src/

## Files

| # | Action | Path | Purpose |
|---|--------|------|---------|
| 1 | create | src/types.ts | Tool type definitions (ToolMeta, ParsedArgs, HandlerReturn, SubcommandSpec) |
| 2 | create | src/args.ts | CLI argv parsing and input validation |
| 3 | create | src/json-schema.ts | Safe Zod-to-JSON-Schema converter |
| 4 | create | src/output-helpers.ts | L1/L2/L3 output schema composers |
| 5 | create | src/introspection.ts | Schema/help subcommand payload builders |
| 6 | create | src/envelopes.ts | Error envelope factories (import adjusted to ./utils.ts) |
| 7 | create | src/tool-class.ts | Tool orchestrator class (import adjusted to ./utils.ts) |
| 8 | create | src/utils.ts | Extracted utility functions: ToolOutput, jsonOutput, stringifyError |
| 9 | modify | src/index.ts | Replace placeholder with barrel re-exports |
| 10 | modify | package.json | Add zod as production dependency |

## Codebase Context

- **Source**: beogip/kael.factory main branch, `lib/tool/` directory (7 files) + `lib/utils.ts` (3 needed symbols)
- **Runtime**: Bun (ESNext target, bundler module resolution, strict TypeScript)
- **Linter**: Biome 2.4.10 (double quotes, 2-space indent, 100 line width, trailing commas, semicolons)
- **Barrel pattern**: kael.factory's `lib/Tool.ts` re-exports public API from `lib/tool/*.ts` — `src/index.ts` mirrors this pattern
- **Dependency**: `zod` v4 required (for `z.toJSONSchema` in `json-schema.ts`) — currently absent from `package.json`
- **External import**: `envelopes.ts` and `tool-class.ts` import from `../utils.ts` in kael.factory — must be redirected to local `./utils.ts`

## Steps

1. **Add zod as production dependency** → `package.json`
   **Done when:** `bun install` succeeds and `zod` is listed in `dependencies`

2. **Create `src/utils.ts`** with only the symbols needed by tool modules: `ToolOutput` type, `jsonOutput` function, `stringifyError` function
   **Done when:** file exists and exports exactly those 3 symbols with no kael.factory references

3. **Copy `types.ts` verbatim** from kael.factory `lib/tool/` → `src/types.ts`
   **Done when:** file exists with content matching GitHub main

4. **Copy `args.ts` verbatim** from kael.factory `lib/tool/` → `src/args.ts`
   **Done when:** file exists with content matching GitHub main

5. **Copy `json-schema.ts` verbatim** from kael.factory `lib/tool/` → `src/json-schema.ts`
   **Done when:** file exists with content matching GitHub main

6. **Copy `output-helpers.ts` verbatim** from kael.factory `lib/tool/` → `src/output-helpers.ts`
   **Done when:** file exists with content matching GitHub main

7. **Copy `introspection.ts` verbatim** from kael.factory `lib/tool/` → `src/introspection.ts`
   **Done when:** file exists with content matching GitHub main

8. **Copy `envelopes.ts`**, adjust `import { stringifyError } from "../utils.ts"` → `import { stringifyError } from "./utils.ts"` → `src/envelopes.ts`
   **Done when:** file imports from `./utils.ts`, not `../utils.ts`

9. **Copy `tool-class.ts`**, adjust `import { jsonOutput, type ToolOutput } from "../utils.ts"` → `import { jsonOutput, type ToolOutput } from "./utils.ts"` → `src/tool-class.ts`
   **Done when:** file imports from `./utils.ts`, not `../utils.ts`

10. **Replace `src/index.ts`** with barrel re-exports mirroring kael.factory's `lib/Tool.ts`
    **Done when:** exports Tool, ToolError, l1Output, l2Output, l3Output, buildHelpPayload, buildSchemaOutput, and all public types

11. **Run `bunx tsc --noEmit`** to verify TypeScript compilation
    **Done when:** zero TypeScript errors

## Interfaces

- **ToolMeta**: `{ name: string; description: string }` — metadata describing the tool itself
- **ParsedArgs**: `{ flags: Record<string, string | true>; positional: string[] }` — raw CLI args after parsing
- **HandlerReturn\<O\>**: `Omit<z.infer<O>, "ok">` — what a handler returns (base class stamps `ok: true`)
- **SubcommandSpec\<I, O\>**: `{ name, description, input: I, output: O, handler }` — a registered subcommand
- **ToolOutput**: `{ ok: boolean; message: string; [key: string]: unknown }` — standard JSON envelope for tool stdout

## Function Design

- **utils.ts**: `jsonOutput(data: ToolOutput): never` — serialize to JSON, print to stdout, exit(0)
- **utils.ts**: `stringifyError(err: unknown): string` — Error → string coercion for catch blocks
- **args.ts**: `parseArgs(argv: string[]): { subcommand, parsed: ParsedArgs }` — argv tokenizer
- **args.ts**: `validateInput(parsed, inputSchema): SafeParseResult` — Zod validation of parsed args
- **json-schema.ts**: `safeToJSONSchema(schema): JSONSchemaResult` — Zod → JSON Schema (fail-soft, never throws)
- **output-helpers.ts**: `l1Output`, `l2Output`, `l3Output` — level-specific output schema composers
- **envelopes.ts**: 7 error envelope factories (`unknownSubcommand`, `inputValidationError`, `schemaViolation`, `nonObjectReturn`, `unexpectedError`, `toolError`) + `ToolError` class
- **introspection.ts**: `buildSchemaOutput` (full JSON Schemas per subcommand), `buildHelpPayload` (help listing)
- **tool-class.ts**: `Tool` class — `subcommand()` (register), `run()` (CLI dispatch), `invoke()` (programmatic entry point)

## Acceptance Criteria (EARS)

- **AC-1.** [ubiquitous] The package shall contain all 7 modules (tool-class.ts, args.ts, envelopes.ts, introspection.ts, json-schema.ts, output-helpers.ts, types.ts) in `src/`.
- **AC-2.** [ubiquitous] Internal imports between modules shall resolve correctly using relative paths within `src/`.
- **AC-3.** [ubiquitous] TypeScript shall compile (`bunx tsc --noEmit`) with zero errors.
- **AC-4.** [unwanted-behavior] If any import references `../lib/utils.ts` or any kael.factory-specific path, then the build shall fail — no such references shall exist.
- **AC-5.** [inferred] The package shall include `zod` as a production dependency to satisfy type and runtime imports.

## Out of Scope

- Unit/integration tests for the Tool class (separate issue)
- Updating existing `tests/index.test.ts` (will break — handled in a separate issue)
- Any runtime behavior changes to the Tool class logic

## Edge Cases + Error Handling

| # | Scenario | Source | Handling |
|---|----------|--------|---------|
| 1 | Bun-only APIs in source files | [from issue] | Checked — none found. `process.argv` and `process.exit` are available in both Node and Bun |
| 2 | `../utils.ts` import in envelopes.ts and tool-class.ts | [from issue] | Adjust to `./utils.ts` pointing to local lean utils |
| 3 | `console.log` in `jsonOutput` triggers biome `noConsole` warning | [inferred] | Keep — `jsonOutput` is the designated output channel for tools. Biome rule is `warn`, not `error` |
| 4 | Zod v4 required for `z.toJSONSchema` | [inferred] | Add `zod@^4.0.0` to `package.json` dependencies |
| 5 | Existing `src/index.ts` placeholder will be overwritten | [inferred] | Expected — replace with barrel exports |
| 6 | Existing `tests/index.test.ts` will break | [inferred] | Out of scope — test updates are a separate concern |

## Done Criteria per Feature

| Feature | Done when |
|---------|-----------|
| Module extraction | AC-1, AC-2, AC-4 |
| TypeScript compilation | AC-3, AC-5 |
| Clean imports | AC-2, AC-4 |

## Risks

| Risk | Mitigation |
|------|------------|
| Zod v4 version compatibility | Pin to `^4.0.0` which the source was written against |
| Existing test breakage | Out of scope — documented as expected consequence |

## Test Strategy

- **Compile check (AC-3):** `bunx tsc --noEmit` — must produce zero errors
- **No kael.factory paths (AC-4):** `grep -r '../lib/' src/` — must return zero matches
- **All files exist (AC-1):** `ls src/` — must list all 7 modules + utils.ts + index.ts
