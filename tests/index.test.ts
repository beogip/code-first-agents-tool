import { describe, expect, it } from "bun:test";
import { z } from "zod";
import type { HelpPayload, ToolMeta } from "../src/index.ts";
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
    expect((result as Record<string, unknown>).error).toBe("unknown_subcommand");
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
    expect((result as Record<string, unknown>).schemas).toBeDefined();
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

  it("catches unexpected errors", async () => {
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
    expect((result as Record<string, unknown>).error).toBe("unexpected_error");
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
});
