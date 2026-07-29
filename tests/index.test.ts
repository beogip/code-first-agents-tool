import { describe, expect, it } from "bun:test";
import { z } from "zod";
import type { ToolMeta } from "../src/index";
import {
  classificationTypeOutput,
  dataTypeOutput,
  l1Output,
  l2Output,
  l3Output,
  procedureTypeOutput,
  Tool,
  ToolError,
} from "../src/index";
import type { HelpPayload, HelpPayloadEntry, SchemaOutputEntry } from "../src/introspection";

describe("Tool", () => {
  const meta: ToolMeta = { name: "test-tool", description: "A test tool" };

  it("constructs without error", () => {
    const tool = new Tool(meta);
    expect(tool).toBeInstanceOf(Tool);
  });

  it("registers a subcommand and chains", () => {
    const tool = new Tool(meta).subcommand({
      name: "ping",
      description: "Ping",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => ({ message: "pong" }),
    });
    expect(tool).toBeInstanceOf(Tool);
  });

  it("rejects reserved subcommand name 'schema'", () => {
    expect(() =>
      new Tool(meta).subcommand({
        name: "schema",
        description: "bad",
        input: z.object({}).strict(),
        output: dataTypeOutput({}),
        handler: () => ({ message: "nope" }),
      }),
    ).toThrow(RangeError);
  });

  it("rejects reserved subcommand name 'help'", () => {
    expect(() =>
      new Tool(meta).subcommand({
        name: "help",
        description: "bad",
        input: z.object({}).strict(),
        output: dataTypeOutput({}),
        handler: () => ({ message: "nope" }),
      }),
    ).toThrow(RangeError);
  });

  it("rejects duplicate subcommand name", () => {
    expect(() =>
      new Tool(meta)
        .subcommand({
          name: "dup",
          description: "first",
          input: z.object({}).strict(),
          output: dataTypeOutput({}),
          handler: () => ({ message: "first" }),
        })
        .subcommand({
          name: "dup",
          description: "second",
          input: z.object({}).strict(),
          output: dataTypeOutput({}),
          handler: () => ({ message: "second" }),
        }),
    ).toThrow(RangeError);
  });

  it("throws TypeError when input schema is missing", () => {
    expect(() =>
      new Tool(meta).subcommand({
        name: "no-input",
        description: "Missing input",
        input: undefined as unknown as z.ZodTypeAny,
        output: dataTypeOutput({}),
        handler: () => ({ message: "nope" }),
      }),
    ).toThrow(TypeError);
  });

  it("throws TypeError when output schema is missing", () => {
    expect(() =>
      new Tool(meta).subcommand({
        name: "no-output",
        description: "Missing output",
        input: z.object({}).strict(),
        output: undefined as unknown as z.ZodTypeAny,
        handler: () => ({ message: "nope" }),
      }),
    ).toThrow(TypeError);
  });
});

describe("Tool.invoke", () => {
  const meta: ToolMeta = { name: "test-tool", description: "A test tool" };

  it("dispatches a valid subcommand", async () => {
    const tool = new Tool(meta).subcommand({
      name: "greet",
      description: "Greet someone",
      input: z.object({ name: z.string() }).strict(),
      output: dataTypeOutput({ greeting: z.string() }),
      handler: ({ name }) => ({ message: "ok", greeting: `Hello, ${name}!` }),
    });

    const result = await tool.invoke("greet", { name: "World" });
    expect(result.ok).toBe(true);
    expect((result as Record<string, unknown>).greeting).toBe("Hello, World!");
  });

  it("returns unknown_subcommand for missing subcommand", async () => {
    const tool = new Tool(meta);
    const result = await tool.invoke("nonexistent");
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("unknown_subcommand");
    expect(err.message).toContain("nonexistent");
    expect(Array.isArray(err.subcommands)).toBe(true);
  });

  it("returns input_validation_error for bad input", async () => {
    const tool = new Tool(meta).subcommand({
      name: "strict",
      description: "Strict input",
      input: z.object({ required_field: z.string() }).strict(),
      output: dataTypeOutput({}),
      handler: () => ({ message: "ok" }),
    });

    const result = await tool.invoke("strict", {});
    expect(result.ok).toBe(false);
    expect((result as Record<string, unknown>).error).toBe("input_validation_error");
  });

  it("returns help envelope", async () => {
    const tool = new Tool(meta).subcommand({
      name: "ping",
      description: "Ping pong",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => ({ message: "pong" }),
    });

    const result = await tool.invoke("help");
    expect(result.ok).toBe(true);
    const subcommands = (result as Record<string, unknown>).subcommands as HelpPayload;
    expect(subcommands).toHaveLength(1);
    expect(subcommands[0]?.name).toBe("ping");
  });

  it("returns schema envelope", async () => {
    const tool = new Tool(meta).subcommand({
      name: "ping",
      description: "Ping pong",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => ({ message: "pong" }),
    });

    const result = await tool.invoke("schema");
    expect(result.ok).toBe(true);
    const schemas = (result as Record<string, unknown>).schemas as Record<string, unknown>;
    expect(schemas).toBeDefined();
    expect(typeof schemas.ping).toBe("object");
    expect(schemas.ping).not.toHaveProperty("$error");
  });

  it("catches ToolError and returns business envelope", async () => {
    const tool = new Tool(meta).subcommand({
      name: "fail",
      description: "Always fails",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => {
        throw new ToolError("custom_error", "Something broke", { key: "val" });
      },
    });

    const result = await tool.invoke("fail", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("custom_error");
    expect(err.message).toBe("Something broke");
    expect(err.detail).toEqual({ key: "val" });
  });

  it("catches unexpected errors from Error instances", async () => {
    const tool = new Tool(meta).subcommand({
      name: "boom",
      description: "Throws raw error",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => {
        throw new Error("kaboom");
      },
    });

    const result = await tool.invoke("boom", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("unexpected_error");
    expect(err.message).toBe("kaboom");
    expect(err.detail === undefined || typeof err.detail === "string").toBe(true);
  });

  it("catches unexpected non-Error throws without detail", async () => {
    const tool = new Tool(meta).subcommand({
      name: "boom",
      description: "Throws raw string",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => {
        throw "raw string error";
      },
    });

    const result = await tool.invoke("boom", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("unexpected_error");
    expect(err.message).toBe("raw string error");
    expect("detail" in err).toBe(false);
  });

  it("returns unknown_subcommand for empty string", async () => {
    const tool = new Tool(meta).subcommand({
      name: "ping",
      description: "Ping",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => ({ message: "pong" }),
    });

    const result = await tool.invoke("");
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("unknown_subcommand");
    expect(err.message).toContain("No subcommand provided");
  });

  it("returns non_object_return when handler returns null", async () => {
    const tool = new Tool(meta).subcommand({
      name: "bad",
      description: "Returns null",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => null as unknown as { message: string },
    });

    const result = await tool.invoke("bad", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("non_object_return");
    expect(err.message).toContain("null");
  });

  it("returns non_object_return when handler returns an array", async () => {
    const tool = new Tool(meta).subcommand({
      name: "bad",
      description: "Returns array",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => [] as unknown as { message: string },
    });

    const result = await tool.invoke("bad", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("non_object_return");
    expect(err.message).toContain("array");
  });

  it("returns non_object_return when handler returns a string", async () => {
    const tool = new Tool(meta).subcommand({
      name: "bad",
      description: "Returns string",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => "nope" as unknown as { message: string },
    });

    const result = await tool.invoke("bad", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("non_object_return");
    expect(err.message).toContain("string");
  });

  it("returns schema_violation when handler returns wrong shape", async () => {
    const tool = new Tool(meta).subcommand({
      name: "bad",
      description: "Returns wrong shape",
      input: z.object({}).strict(),
      output: dataTypeOutput({ required_field: z.string() }),
      handler: () => ({ message: "ok" }) as unknown as { message: string; required_field: string },
    });

    const result = await tool.invoke("bad", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("schema_violation");
    expect(err.message).toContain("bad");
    expect(typeof err.detail).toBe("string");
  });

  it("returns ToolError envelope without detail when detail is omitted", async () => {
    const tool = new Tool(meta).subcommand({
      name: "fail",
      description: "Fails without detail",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => {
        throw new ToolError("no_detail_error", "Error without detail");
      },
    });

    const result = await tool.invoke("fail", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("no_detail_error");
    expect(err.message).toBe("Error without detail");
    expect("detail" in err).toBe(false);
  });

  it("returns input_validation_error envelope with correct structure", async () => {
    const tool = new Tool(meta).subcommand({
      name: "check-input",
      description: "Validates input structure",
      input: z.object({ required: z.string() }).strict(),
      output: dataTypeOutput({}),
      handler: () => ({ message: "ok" }),
    });

    const result = await tool.invoke("check-input", { wrong: "field" });
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("input_validation_error");
    expect(err.message).toContain("Input validation failed for subcommand");
    expect(err.message).toContain("check-input");
    expect(typeof err.detail).toBe("string");
    expect(err.input_schema).toBeDefined();
  });
});

describe("Tool.invoke — async handlers", () => {
  const meta: ToolMeta = { name: "test-tool", description: "A test tool" };

  it("dispatches an async handler that returns a value", async () => {
    const tool = new Tool(meta).subcommand({
      name: "async-greet",
      description: "Async greet",
      input: z.object({ name: z.string() }).strict(),
      output: dataTypeOutput({ greeting: z.string() }),
      handler: async ({ name }) => ({ message: "ok", greeting: `Hi, ${name}!` }),
    });

    const result = await tool.invoke("async-greet", { name: "World" });
    expect(result.ok).toBe(true);
    expect((result as Record<string, unknown>).greeting).toBe("Hi, World!");
  });

  it("catches ToolError thrown from async handler", async () => {
    const tool = new Tool(meta).subcommand({
      name: "async-fail",
      description: "Async ToolError",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: async () => {
        throw new ToolError("async_error", "Async failure");
      },
    });

    const result = await tool.invoke("async-fail", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("async_error");
    expect(err.message).toBe("Async failure");
  });

  it("catches unexpected error from async handler", async () => {
    const tool = new Tool(meta).subcommand({
      name: "async-boom",
      description: "Async unexpected error",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: async () => {
        throw new Error("async kaboom");
      },
    });

    const result = await tool.invoke("async-boom", {});
    expect(result.ok).toBe(false);
    const err = result as Record<string, unknown>;
    expect(err.error).toBe("unexpected_error");
    expect(err.message).toBe("async kaboom");
  });
});

describe("Tool.invoke — schema subcommand depth", () => {
  const meta: ToolMeta = { name: "test-tool", description: "A test tool" };

  it("returns input and output JSON Schema per registered subcommand", async () => {
    const tool = new Tool(meta).subcommand({
      name: "ping",
      description: "Ping pong",
      input: z.object({ target: z.string() }).strict(),
      output: dataTypeOutput({ pong: z.boolean() }),
      handler: ({ target }) => ({ message: `pinged ${target}`, pong: true }),
    });

    const result = await tool.invoke("schema");
    expect(result.ok).toBe(true);
    const schemas = (result as Record<string, unknown>).schemas as Record<
      string,
      SchemaOutputEntry
    >;
    expect(schemas.ping).toBeDefined();
    const entry = schemas.ping as {
      input: Record<string, unknown>;
      output: Record<string, unknown>;
    };
    expect(entry.input).toHaveProperty("type");
    expect(entry.input).toHaveProperty("properties");
    expect(entry.output).toHaveProperty("type");
    expect(entry.output).toHaveProperty("properties");
  });

  it("returns message about no subcommands when none are registered", async () => {
    const tool = new Tool(meta);
    const result = await tool.invoke("schema");
    expect(result.ok).toBe(true);
    expect(result.message).toContain("no subcommands");
    expect((result as Record<string, unknown>).schemas).toEqual({});
  });
});

describe("Tool.invoke — help subcommand depth", () => {
  const meta: ToolMeta = { name: "test-tool", description: "A test tool" };

  it("returns name, description, and input_schema per subcommand", async () => {
    const tool = new Tool(meta).subcommand({
      name: "greet",
      description: "Say hello",
      input: z.object({ name: z.string() }).strict(),
      output: dataTypeOutput({}),
      handler: () => ({ message: "hello" }),
    });

    const result = await tool.invoke("help");
    expect(result.ok).toBe(true);
    const subcommands = (result as Record<string, unknown>).subcommands as HelpPayload;
    expect(subcommands).toHaveLength(1);
    const entry = subcommands[0] as HelpPayloadEntry;
    expect(entry.name).toBe("greet");
    expect(entry.description).toBe("Say hello");
    expect(entry.input_schema).toBeDefined();
  });

  it("includes tool name in help output", async () => {
    const tool = new Tool(meta);
    const result = await tool.invoke("help");
    expect(result.ok).toBe(true);
    const toolInfo = (result as Record<string, unknown>).tool as Record<string, unknown>;
    expect(toolInfo.name).toBe("test-tool");
  });
});

describe("output helpers", () => {
  it("dataTypeOutput includes ok and message", () => {
    const schema = dataTypeOutput({ count: z.number() });
    const result = schema.safeParse({ ok: true, message: "ok", count: 42 });
    expect(result.success).toBe(true);
  });

  it("classificationTypeOutput includes classification", () => {
    const schema = classificationTypeOutput(z.enum(["a", "b"]));
    const result = schema.safeParse({ ok: true, message: "ok", classification: "a" });
    expect(result.success).toBe(true);
  });

  it("procedureTypeOutput includes instructions", () => {
    const schema = procedureTypeOutput();
    const result = schema.safeParse({ ok: true, message: "ok", instructions: "do this" });
    expect(result.success).toBe(true);
  });

  it("dataTypeOutput rejects when ok is missing", () => {
    const schema = dataTypeOutput({ count: z.number() });
    const result = schema.safeParse({ message: "ok", count: 42 });
    expect(result.success).toBe(false);
  });

  it("dataTypeOutput rejects when message is missing", () => {
    const schema = dataTypeOutput({});
    const result = schema.safeParse({ ok: true });
    expect(result.success).toBe(false);
  });

  it("classificationTypeOutput rejects when classification is missing", () => {
    const schema = classificationTypeOutput(z.enum(["a", "b"]));
    const result = schema.safeParse({ ok: true, message: "ok" });
    expect(result.success).toBe(false);
  });

  it("classificationTypeOutput accepts with extra fields", () => {
    const schema = classificationTypeOutput(z.enum(["a", "b"]), { score: z.number() });
    const result = schema.safeParse({ ok: true, message: "ok", classification: "a", score: 5 });
    expect(result.success).toBe(true);
  });

  it("procedureTypeOutput rejects when instructions is missing", () => {
    const schema = procedureTypeOutput();
    const result = schema.safeParse({ ok: true, message: "ok" });
    expect(result.success).toBe(false);
  });

  it("procedureTypeOutput accepts with extra fields", () => {
    const schema = procedureTypeOutput({ level: z.string() });
    const result = schema.safeParse({
      ok: true,
      message: "ok",
      instructions: "do it",
      level: "high",
    });
    expect(result.success).toBe(true);
  });
});

/**
 * Equivalence coverage for the per-type registration methods. Each asserts that
 * registering through a method produces the *same* output schema as registering
 * through `subcommand` with the matching standalone helper — read through the
 * public `schema` builtin, so the private `subs` Map is never touched.
 *
 * Compared as serialized JSON rather than with `toEqual`, so key order is part
 * of the assertion: the classification path normalizes it deliberately.
 */
describe("per-type registration — schema equivalence", () => {
  const meta: ToolMeta = { name: "test-tool", description: "A test tool" };

  async function outputSchema(tool: Tool, name: string): Promise<string> {
    const result = await tool.invoke("schema");
    const schemas = (result as Record<string, unknown>).schemas as Record<
      string,
      SchemaOutputEntry
    >;
    const entry = schemas[name] as { output: Record<string, unknown> };
    return JSON.stringify(entry.output);
  }

  it("dataSubcommand matches dataTypeOutput(shape)", async () => {
    const viaMethod = new Tool(meta).dataSubcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: { count: z.number(), label: z.string() },
      handler: () => ({ message: "ok", count: 1, label: "a" }),
    });
    const viaHelper = new Tool(meta).subcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: dataTypeOutput({ count: z.number(), label: z.string() }),
      handler: () => ({ message: "ok", count: 1, label: "a" }),
    });

    expect(await outputSchema(viaMethod, "x")).toBe(await outputSchema(viaHelper, "x"));
  });

  it("dataSubcommand accepts an empty output shape", async () => {
    const viaMethod = new Tool(meta).dataSubcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: {},
      handler: () => ({ message: "ok" }),
    });
    const viaHelper = new Tool(meta).subcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: dataTypeOutput({}),
      handler: () => ({ message: "ok" }),
    });

    expect(await outputSchema(viaMethod, "x")).toBe(await outputSchema(viaHelper, "x"));
    expect(await viaMethod.invoke("x", {})).toEqual({ ok: true, message: "ok" });
  });

  it("classificationSubcommand matches classificationTypeOutput(enum, extras)", async () => {
    const Size = z.enum(["small", "large"]);
    const viaMethod = new Tool(meta).classificationSubcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: { classification: Size, score: z.number() },
      handler: () => ({ message: "ok", classification: "small" as const, score: 1 }),
    });
    const viaHelper = new Tool(meta).subcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: classificationTypeOutput(Size, { score: z.number() }),
      handler: () => ({ message: "ok", classification: "small" as const, score: 1 }),
    });

    expect(await outputSchema(viaMethod, "x")).toBe(await outputSchema(viaHelper, "x"));
  });

  it("classificationSubcommand normalizes key order when extras precede classification", async () => {
    const Size = z.enum(["small", "large"]);
    const extrasFirst = new Tool(meta).classificationSubcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      // Author wrote `score` before `classification` — the method still emits
      // `ok, message, classification, ...extras`.
      output: { score: z.number(), classification: Size },
      handler: () => ({ message: "ok", classification: "large" as const, score: 2 }),
    });
    const viaHelper = new Tool(meta).subcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: classificationTypeOutput(Size, { score: z.number() }),
      handler: () => ({ message: "ok", classification: "large" as const, score: 2 }),
    });

    expect(await outputSchema(extrasFirst, "x")).toBe(await outputSchema(viaHelper, "x"));
  });

  it("classificationSubcommand matches the no-extras helper overload", async () => {
    const Size = z.enum(["small", "large"]);
    const viaMethod = new Tool(meta).classificationSubcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: { classification: Size },
      handler: () => ({ message: "ok", classification: "small" as const }),
    });
    const viaHelper = new Tool(meta).subcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: classificationTypeOutput(Size),
      handler: () => ({ message: "ok", classification: "small" as const }),
    });

    expect(await outputSchema(viaMethod, "x")).toBe(await outputSchema(viaHelper, "x"));
  });

  it("procedureSubcommand matches procedureTypeOutput(extras)", async () => {
    const viaMethod = new Tool(meta).procedureSubcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: { topic: z.string() },
      handler: () => ({ message: "ok", instructions: "do it", topic: "setup" }),
    });
    const viaHelper = new Tool(meta).subcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: procedureTypeOutput({ topic: z.string() }),
      handler: () => ({ message: "ok", instructions: "do it", topic: "setup" }),
    });

    expect(await outputSchema(viaMethod, "x")).toBe(await outputSchema(viaHelper, "x"));
  });

  it("procedureSubcommand with output omitted matches procedureTypeOutput()", async () => {
    const viaMethod = new Tool(meta).procedureSubcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      handler: () => ({ message: "ok", instructions: "do it" }),
    });
    const viaHelper = new Tool(meta).subcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: procedureTypeOutput(),
      handler: () => ({ message: "ok", instructions: "do it" }),
    });

    expect(await outputSchema(viaMethod, "x")).toBe(await outputSchema(viaHelper, "x"));
  });

  it("procedureSubcommand with an empty output shape matches the no-arg overload", async () => {
    const emptyShape = new Tool(meta).procedureSubcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: {},
      handler: () => ({ message: "ok", instructions: "do it" }),
    });
    const viaHelper = new Tool(meta).subcommand({
      name: "x",
      description: "d",
      input: z.object({}).strict(),
      output: procedureTypeOutput(),
      handler: () => ({ message: "ok", instructions: "do it" }),
    });

    expect(await outputSchema(emptyShape, "x")).toBe(await outputSchema(viaHelper, "x"));
  });
});

describe("per-type registration — chainability and registration errors", () => {
  const meta: ToolMeta = { name: "test-tool", description: "A test tool" };

  it("dataSubcommand returns the same instance", () => {
    const tool = new Tool(meta);
    expect(
      tool.dataSubcommand({
        name: "a",
        description: "d",
        input: z.object({}).strict(),
        output: {},
        handler: () => ({ message: "ok" }),
      }),
    ).toBe(tool);
  });

  it("classificationSubcommand returns the same instance", () => {
    const tool = new Tool(meta);
    expect(
      tool.classificationSubcommand({
        name: "a",
        description: "d",
        input: z.object({}).strict(),
        output: { classification: z.enum(["a", "b"]) },
        handler: () => ({ message: "ok", classification: "a" as const }),
      }),
    ).toBe(tool);
  });

  it("procedureSubcommand returns the same instance", () => {
    const tool = new Tool(meta);
    expect(
      tool.procedureSubcommand({
        name: "a",
        description: "d",
        input: z.object({}).strict(),
        handler: () => ({ message: "ok", instructions: "do it" }),
      }),
    ).toBe(tool);
  });

  it("the three methods chain together on one instance", () => {
    const tool = new Tool(meta)
      .dataSubcommand({
        name: "a",
        description: "d",
        input: z.object({}).strict(),
        output: { n: z.number() },
        handler: () => ({ message: "ok", n: 1 }),
      })
      .classificationSubcommand({
        name: "b",
        description: "d",
        input: z.object({}).strict(),
        output: { classification: z.enum(["x", "y"]) },
        handler: () => ({ message: "ok", classification: "x" as const }),
      })
      .procedureSubcommand({
        name: "c",
        description: "d",
        input: z.object({}).strict(),
        handler: () => ({ message: "ok", instructions: "do it" }),
      });

    expect(tool).toBeInstanceOf(Tool);
  });

  it("rejects a reserved name passed to a per-type method", () => {
    expect(() =>
      new Tool(meta).dataSubcommand({
        name: "schema",
        description: "d",
        input: z.object({}).strict(),
        output: {},
        handler: () => ({ message: "nope" }),
      }),
    ).toThrow(RangeError);
  });

  it("rejects a name already registered through subcommand", () => {
    expect(() =>
      new Tool(meta)
        .subcommand({
          name: "dup",
          description: "first",
          input: z.object({}).strict(),
          output: dataTypeOutput({}),
          handler: () => ({ message: "first" }),
        })
        .procedureSubcommand({
          name: "dup",
          description: "second",
          input: z.object({}).strict(),
          handler: () => ({ message: "second", instructions: "do it" }),
        }),
    ).toThrow(RangeError);
  });
});

/**
 * Behavioral coverage for the deprecated names. These assert the envelope a
 * consumer still on an old name gets back — not schema-object identity — so
 * the suite fails if the structure they depend on ever changes.
 */
describe("deprecated output helper aliases", () => {
  const meta: ToolMeta = { name: "legacy-tool", description: "Uses deprecated helpers" };

  it("l1Output produces the data envelope through invoke", async () => {
    const tool = new Tool(meta).subcommand({
      name: "stats",
      description: "Raw signals",
      input: z.object({}).strict(),
      output: l1Output({ count: z.number() }),
      handler: () => ({ message: "counted", count: 42 }),
    });

    const result = await tool.invoke("stats", {});
    expect(result).toEqual({ ok: true, message: "counted", count: 42 });
  });

  it("l2Output with only a classification produces the classification envelope", async () => {
    const tool = new Tool(meta).subcommand({
      name: "size",
      description: "Classify size",
      input: z.object({}).strict(),
      output: l2Output(z.enum(["small", "large"])),
      handler: () => ({ message: "classified", classification: "large" as const }),
    });

    const result = await tool.invoke("size", {});
    expect(result).toEqual({ ok: true, message: "classified", classification: "large" });
  });

  it("l2Output with extra fields keeps them in the envelope", async () => {
    const tool = new Tool(meta).subcommand({
      name: "size-scored",
      description: "Classify size with a score",
      input: z.object({}).strict(),
      output: l2Output(z.enum(["small", "large"]), { score: z.number() }),
      handler: () => ({ message: "classified", classification: "small" as const, score: 3 }),
    });

    const result = await tool.invoke("size-scored", {});
    expect(result).toEqual({
      ok: true,
      message: "classified",
      classification: "small",
      score: 3,
    });
  });

  it("l3Output with no arguments produces the instructions envelope", async () => {
    const tool = new Tool(meta).subcommand({
      name: "instruct",
      description: "Emit a procedure",
      input: z.object({}).strict(),
      output: l3Output(),
      handler: () => ({ message: "generated", instructions: "## Step 1\nDo the thing." }),
    });

    const result = await tool.invoke("instruct", {});
    expect(result).toEqual({
      ok: true,
      message: "generated",
      instructions: "## Step 1\nDo the thing.",
    });
  });

  it("l3Output with extra fields keeps them in the envelope", async () => {
    const tool = new Tool(meta).subcommand({
      name: "instruct-topic",
      description: "Emit a procedure with a topic",
      input: z.object({}).strict(),
      output: l3Output({ topic: z.string() }),
      handler: () => ({ message: "generated", instructions: "do it", topic: "setup" }),
    });

    const result = await tool.invoke("instruct-topic", {});
    expect(result).toEqual({
      ok: true,
      message: "generated",
      instructions: "do it",
      topic: "setup",
    });
  });

  it("l1Output still rejects a handler result that violates the envelope", async () => {
    const tool = new Tool(meta).subcommand({
      name: "bad",
      description: "Returns the wrong shape",
      input: z.object({}).strict(),
      output: l1Output({ required_field: z.string() }),
      handler: () => ({ message: "ok" }) as unknown as { message: string; required_field: string },
    });

    const result = await tool.invoke("bad", {});
    expect(result.ok).toBe(false);
    expect((result as Record<string, unknown>).error).toBe("schema_violation");
  });
});
