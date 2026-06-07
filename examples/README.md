# Examples

Runnable [Code-First Agents](https://github.com/beogip/code-first-agents/blob/main/specs/code-first-agents.md) tools you can clone and execute. This isn't theory — clone the repo, run the commands below, and compare the JSON output.

## Prerequisites

[Bun](https://bun.sh) >= 1.0. From the repo root:

```bash
bun install
```

The examples import from `../src/index.ts`, so they run against the source with **no build step**. In your own project you'd install the package and import from `@code-first-agents/tool` instead:

```ts
import { Tool, l1Output, l2Output, l3Output } from "@code-first-agents/tool";
```

## `changeset.ts` — one tool, all three output levels

`changeset` analyzes the shape of a changeset (files touched, lines added/removed) and prepares it for review. The work is fully deterministic — same input flags, same JSON, no LLM calls inside the tool. It exposes one subcommand per output level from the spec.

### L1 — Data (raw signals for the LLM to interpret)

```bash
bun run examples/changeset.ts stats --files 12 --additions 340 --deletions 50
```

```json
{"ok":true,"message":"changeset stats computed","files":12,"additions":340,"deletions":50,"total_lines":390}
```

### L2 — Classification (a discrete category the skill can branch on)

```bash
bun run examples/changeset.ts size --files 12 --additions 340 --deletions 50
```

```json
{"ok":true,"message":"changeset classified as large","classification":"large","total_lines":390}
```

### L3 — Instructions (a verbatim procedure the LLM executes)

```bash
bun run examples/changeset.ts review-plan --files 12 --additions 340 --deletions 50
```

```json
{"ok":true,"message":"review plan generated for large changeset","instructions":"## Review plan (large)\n1. Ask for a written summary of the approach.\n2. Review module by module, highest-risk first.\n3. Require tests for each new code path.\n4. Run the suite locally before approving.","size":"large"}
```

The `instructions` string is what an L3 tool hands back: a complete procedure the LLM follows verbatim, chosen deterministically from the changeset size.

## Built-in introspection

Every tool gets `help` and `schema` for free:

```bash
bun run examples/changeset.ts help     # human-readable subcommand listing
bun run examples/changeset.ts schema    # JSON Schema for every subcommand
```

## Always exit 0 — failures are loud, not fatal

Errors return an `ok: false` envelope and still exit `0`, so a calling skill can read the failure as data instead of catching a crash.

Missing required input:

```bash
bun run examples/changeset.ts size --files 12
```

```json
{"ok":false,"error":"input_validation_error","message":"Input validation failed for subcommand 'size'", ...}
```

Unknown subcommand (the envelope lists what's available):

```bash
bun run examples/changeset.ts bogus
```

```json
{"ok":false,"error":"unknown_subcommand","message":"Unknown subcommand 'bogus' — see 'subcommands' for available options", ...}
```

## Try other inputs

The classification is deterministic, so small inputs land in different size classes:

```bash
bun run examples/changeset.ts size --files 2 --additions 8 --deletions 2
# → {"ok":true,"message":"changeset classified as small","classification":"small","total_lines":10}
```
