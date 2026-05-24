import { describe, expect, it } from "bun:test";
import { z } from "zod";
import type { HelpPayload, HelpPayloadEntry, SchemaOutputEntry, ToolMeta } from "../src/index.ts";
import { l1Output, l2Output, l3Output, Tool, ToolError } from "../src/index.ts";

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
      output: l1Output({}),
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
        output: l1Output({}),
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
        output: l1Output({}),
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
          output: l1Output({}),
          handler: () => ({ message: "first" }),
        })
        .subcommand({
          name: "dup",
          description: "second",
          input: z.object({}).strict(),
          output: l1Output({}),
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
        output: l1Output({}),
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
      output: l1Output({ greeting: z.string() }),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({ required_field: z.string() }),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({ greeting: z.string() }),
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
      output: l1Output({}),
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
      output: l1Output({}),
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
      output: l1Output({ pong: z.boolean() }),
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
      output: l1Output({}),
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
  it("l1Output includes ok and message", () => {
    const schema = l1Output({ count: z.number() });
    const result = schema.safeParse({ ok: true, message: "ok", count: 42 });
    expect(result.success).toBe(true);
  });

  it("l2Output includes classification", () => {
    const schema = l2Output(z.enum(["a", "b"]));
    const result = schema.safeParse({ ok: true, message: "ok", classification: "a" });
    expect(result.success).toBe(true);
  });

  it("l3Output includes instructions", () => {
    const schema = l3Output();
    const result = schema.safeParse({ ok: true, message: "ok", instructions: "do this" });
    expect(result.success).toBe(true);
  });

  it("l1Output rejects when ok is missing", () => {
    const schema = l1Output({ count: z.number() });
    const result = schema.safeParse({ message: "ok", count: 42 });
    expect(result.success).toBe(false);
  });

  it("l1Output rejects when message is missing", () => {
    const schema = l1Output({});
    const result = schema.safeParse({ ok: true });
    expect(result.success).toBe(false);
  });

  it("l2Output rejects when classification is missing", () => {
    const schema = l2Output(z.enum(["a", "b"]));
    const result = schema.safeParse({ ok: true, message: "ok" });
    expect(result.success).toBe(false);
  });

  it("l2Output accepts with extra fields", () => {
    const schema = l2Output(z.enum(["a", "b"]), { score: z.number() });
    const result = schema.safeParse({ ok: true, message: "ok", classification: "a", score: 5 });
    expect(result.success).toBe(true);
  });

  it("l3Output rejects when instructions is missing", () => {
    const schema = l3Output();
    const result = schema.safeParse({ ok: true, message: "ok" });
    expect(result.success).toBe(false);
  });

  it("l3Output accepts with extra fields", () => {
    const schema = l3Output({ level: z.string() });
    const result = schema.safeParse({
      ok: true,
      message: "ok",
      instructions: "do it",
      level: "high",
    });
    expect(result.success).toBe(true);
  });
});
