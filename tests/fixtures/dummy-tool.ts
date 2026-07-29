#!/usr/bin/env bun
import { z } from "zod";
import {
  classificationTypeOutput,
  dataTypeOutput,
  procedureTypeOutput,
  Tool,
  ToolError,
} from "../../src/index";

const tool = new Tool({
  name: "dummy-tool",
  description: "Fixture tool exercising Tool base class behaviors",
});

tool.subcommand({
  name: "greet",
  description: "Greet someone by name",
  input: z.object({ name: z.string() }).strict(),
  output: dataTypeOutput({ greeting: z.string() }),
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
  output: dataTypeOutput({ product: z.number() }),
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
  output: classificationTypeOutput(z.enum(["info", "debug"])),
  handler: ({ level }) => ({
    message: `report generated (level=${level})`,
    classification: level,
  }),
});

tool.subcommand({
  name: "throws",
  description: "Always throws",
  input: z.object({}).strict(),
  output: dataTypeOutput({}),
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
  output: dataTypeOutput({}),
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
  description: "Emit a verbatim instruction set via procedureTypeOutput",
  input: z.object({}).strict(),
  output: procedureTypeOutput({ topic: z.string() }),
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
  output: dataTypeOutput({}),
  handler: () => {
    process.stderr.write("HANDLER_CALLED\n");
    return { message: "side effect executed" };
  },
});

tool.subcommand({
  name: "echoArgs",
  description: "Echo positional args (input schema declares the reserved _ key)",
  input: z.object({ _: z.array(z.string()).optional() }).strict(),
  output: dataTypeOutput({ args: z.array(z.string()) }),
  handler: ({ _ }) => ({
    message: "echoed positional args",
    args: _ ?? [],
  }),
});

// --- Per-type registration methods -----------------------------------------

tool.dataSubcommand({
  name: "typedGreet",
  description: "Greet someone via dataSubcommand",
  input: z.object({ name: z.string() }).strict(),
  output: { greeting: z.string() },
  handler: ({ name }) => ({
    message: `greeted ${name}`,
    greeting: `hello ${name}`,
  }),
});

tool.classificationSubcommand({
  name: "typedReport",
  description: "Emit a report classified by log level via classificationSubcommand",
  input: z
    .object({
      level: z.enum(["info", "debug"]).default("info"),
    })
    .strict(),
  output: { classification: z.enum(["info", "debug"]), verbose: z.boolean() },
  handler: ({ level }) => ({
    message: `report generated (level=${level})`,
    classification: level,
    verbose: level === "debug",
  }),
});

tool.procedureSubcommand({
  name: "typedInstruct",
  description: "Emit a verbatim instruction set via procedureSubcommand",
  input: z.object({}).strict(),
  output: { topic: z.string() },
  handler: () => ({
    message: "instructions generated",
    instructions: "## Step 1\nDo the thing.",
    topic: "setup",
  }),
});

// `output` omitted entirely — `instructions` is still composed into the schema.
tool.procedureSubcommand({
  name: "bareInstruct",
  description: "Emit instructions with no extras (output omitted)",
  input: z.object({}).strict(),
  handler: () => ({
    message: "bare instructions generated",
    instructions: "## Step 1\nJust this.",
  }),
});

// Malformed handler behind a per-type method: proves the composed schema is
// enforced at runtime by the same pipeline as a hand-built one.
// `@ts-expect-error` is an *enabler* here, mirroring `badShape` above.
tool.dataSubcommand({
  name: "badTypedShape",
  description: "Per-type registration whose handler violates the composed schema",
  input: z.object({}).strict(),
  output: { count: z.number() },
  // @ts-expect-error — intentional wrong shape
  handler: () => ({ message: "bad", count: "not-a-number" }),
});

// --- Compile-time assertions ------------------------------------------------
//
// Below, `@ts-expect-error` IS the assertion: the code must NOT compile. If the
// type layer stops enforcing these, `bunx tsc --noEmit` fails with
// `Unused '@ts-expect-error' directive` — that message is the test failing.
// These specs are passed to a throwaway Tool so they never reach the registry.

const typeAssertions = new Tool({ name: "type-assertions", description: "Never dispatched" });

// A procedure handler that omits the required `instructions` field.
typeAssertions.procedureSubcommand({
  name: "missingInstructions",
  description: "Handler omits the composed `instructions` field",
  input: z.object({}).strict(),
  // @ts-expect-error — `instructions` is required by the composed schema
  handler: () => ({ message: "no instructions here" }),
});

// A classification `output` that omits the required `classification` key.
typeAssertions.classificationSubcommand({
  name: "missingClassification",
  description: "Output shape omits the required `classification` key",
  input: z.object({}).strict(),
  // @ts-expect-error — `output` must declare a `classification` key
  output: { score: z.number() },
  handler: () => ({ message: "no classification here", score: 1 }),
});

tool.run(process.argv.slice(2));
