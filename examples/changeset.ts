#!/usr/bin/env bun
/**
 * changeset.ts — a complete, runnable Code-First Agents tool.
 *
 * It analyzes the shape of a changeset (files touched + lines added/removed)
 * and demonstrates all three output levels from the spec with one tool:
 *
 *   stats        L1 — raw signals for the LLM to interpret
 *   size         L2 — a discrete size class the skill can branch on
 *   review-plan  L3 — a verbatim review procedure the LLM executes
 *
 * The work is fully deterministic: same input flags → same JSON. No LLM
 * calls happen inside the tool — that's the whole point of the pattern.
 *
 * Run it (from the repo root):
 *
 *   bun run examples/changeset.ts stats       --files 12 --additions 340 --deletions 50
 *   bun run examples/changeset.ts size        --files 12 --additions 340 --deletions 50
 *   bun run examples/changeset.ts review-plan --files 12 --additions 340 --deletions 50
 *   bun run examples/changeset.ts help
 *   bun run examples/changeset.ts schema
 *
 * NOTE: this file imports from "../src/index.ts" so it runs against the
 * source in this repo with no build step. In your own project you would
 * install the package and import from "@code-first-agents/tool" instead:
 *
 *   import { Tool, l1Output, l2Output, l3Output } from "@code-first-agents/tool";
 */

import { z } from "zod";
import { l1Output, l2Output, l3Output, Tool } from "../src/index.ts";

/** Shared input: the raw shape of a changeset, supplied as CLI flags. */
const changesetInput = z
  .object({
    files: z.coerce.number().int().nonnegative(),
    additions: z.coerce.number().int().nonnegative(),
    deletions: z.coerce.number().int().nonnegative(),
  })
  .strict();

const SizeClass = z.enum(["xs", "small", "medium", "large", "x-large"]);
type SizeClass = z.infer<typeof SizeClass>;

/** Deterministic size classification from total churn + files touched. */
function classifySize(files: number, additions: number, deletions: number): SizeClass {
  const churn = additions + deletions;
  if (churn <= 10 && files <= 1) return "xs";
  if (churn <= 50 && files <= 5) return "small";
  if (churn <= 200 && files <= 15) return "medium";
  if (churn <= 500 && files <= 40) return "large";
  return "x-large";
}

/** A verbatim review procedure tuned to the changeset size. */
function reviewPlan(size: SizeClass): string {
  const plans: Record<SizeClass, string> = {
    xs: "## Review plan (xs)\n1. Read the diff in full.\n2. Approve if it is a trivial, correct change.",
    small:
      "## Review plan (small)\n1. Read the full diff.\n2. Check tests cover the change.\n3. Approve or request specific fixes.",
    medium:
      "## Review plan (medium)\n1. Read the diff file by file.\n2. Verify tests for each behavioral change.\n3. Check edge cases and error handling.\n4. Summarize risks before approving.",
    large:
      "## Review plan (large)\n1. Ask for a written summary of the approach.\n2. Review module by module, highest-risk first.\n3. Require tests for each new code path.\n4. Run the suite locally before approving.",
    "x-large":
      "## Review plan (x-large)\n1. Push back: request the change be split into reviewable PRs.\n2. If it cannot be split, schedule a synchronous walkthrough.\n3. Review incrementally; do not approve in one pass.",
  };
  return plans[size];
}

const tool = new Tool({
  name: "changeset",
  description: "Analyze the shape of a changeset and prepare it for review",
});

// L1 — Data: raw signals, no interpretation. The LLM decides what they mean.
tool.subcommand({
  name: "stats",
  description: "Emit raw changeset signals (L1 — data)",
  input: changesetInput,
  output: l1Output({
    files: z.number(),
    additions: z.number(),
    deletions: z.number(),
    total_lines: z.number(),
  }),
  handler: ({ files, additions, deletions }) => ({
    message: "changeset stats computed",
    files,
    additions,
    deletions,
    total_lines: additions + deletions,
  }),
});

// L2 — Classification: a discrete category the calling skill can branch on.
tool.subcommand({
  name: "size",
  description: "Classify the changeset size (L2 — classification)",
  input: changesetInput,
  output: l2Output(SizeClass, { total_lines: z.number() }),
  handler: ({ files, additions, deletions }) => {
    const classification = classifySize(files, additions, deletions);
    return {
      message: `changeset classified as ${classification}`,
      classification,
      total_lines: additions + deletions,
    };
  },
});

// L3 — Instructions: a complete procedure for the LLM to execute verbatim.
tool.subcommand({
  name: "review-plan",
  description: "Emit a verbatim review procedure for the changeset (L3 — instructions)",
  input: changesetInput,
  output: l3Output({ size: SizeClass }),
  handler: ({ files, additions, deletions }) => {
    const size = classifySize(files, additions, deletions);
    return {
      message: `review plan generated for ${size} changeset`,
      instructions: reviewPlan(size),
      size,
    };
  },
});

tool.run(process.argv.slice(2));
