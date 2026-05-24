#!/usr/bin/env bun
import { z } from "zod";
import { l1Output, l2Output, l3Output, Tool, ToolError } from "../../src/index.ts";

const tool = new Tool({
  name: "dummy-tool",
  description: "Fixture tool exercising Tool base class behaviors",
});

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

tool.subcommand({
  name: "multiply",
  description: "Multiply two numbers",
  input: z
    .object({
      a: z.coerce.number(),
      b: z.coerce.number(),
    })
    .strict(),
  output: l1Output({ product: z.number() }),
  handler: async ({ a, b }) => {
    await Promise.resolve();
    return { message: "multiplied", product: a * b };
  },
});

tool.subcommand({
  name: "report",
  description: "Emit a report classified by log level",
  input: z
    .object({
      level: z.enum(["info", "debug"]).default("info"),
    })
    .strict(),
  output: l2Output(z.enum(["info", "debug"])),
  handler: ({ level }) => ({
    message: `report generated (level=${level})`,
    classification: level,
  }),
});

tool.subcommand({
  name: "throws",
  description: "Always throws",
  input: z.object({}).strict(),
  output: l1Output({}),
  handler: () => {
    throw new Error("dummy-tool: intentional failure");
  },
});

tool.subcommand({
  name: "businessError",
  description: "Throws a ToolError with caller-supplied code",
  input: z
    .object({
      code: z.string(),
      detail: z.string().optional(),
    })
    .strict(),
  output: l1Output({}),
  handler: ({ code, detail }) => {
    throw new ToolError(code, `Business failure with code '${code}'`, detail);
  },
});

tool.subcommand({
  name: "badShape",
  description: "Returns an object that fails output validation",
  input: z.object({}).strict(),
  output: z.object({
    ok: z.literal(true),
    message: z.string(),
    count: z.number(),
  }),
  handler: () =>
    // @ts-expect-error — intentional wrong shape
    ({ message: "bad", count: "not-a-number" }),
});

tool.subcommand({
  name: "instruct",
  description: "Emit a verbatim instruction set via l3Output",
  input: z.object({}).strict(),
  output: l3Output({ topic: z.string() }),
  handler: () => ({
    message: "instructions generated",
    instructions: "## Step 1\nDo the thing.",
    topic: "setup",
  }),
});

tool.subcommand({
  name: "sideEffect",
  description: "Writes a marker to stderr when handler runs",
  input: z.object({ required: z.string() }).strict(),
  output: l1Output({}),
  handler: () => {
    process.stderr.write("HANDLER_CALLED\n");
    return { message: "side effect executed" };
  },
});

tool.run(process.argv.slice(2));
