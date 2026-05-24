import { describe, expect, it } from "bun:test";
import { z } from "zod";
import { parseArgs, validateInput } from "../src/index.ts";

describe("parseArgs", () => {
  it("extracts the subcommand from argv[0]", () => {
    const { subcommand } = parseArgs(["run"]);
    expect(subcommand).toBe("run");
  });

  it("returns empty subcommand for empty argv", () => {
    const { subcommand } = parseArgs([]);
    expect(subcommand).toBe("");
  });

  it("returns empty subcommand for bare -- sentinel", () => {
    const { subcommand } = parseArgs(["--"]);
    expect(subcommand).toBe("");
  });

  it("normalizes --help to help", () => {
    const { subcommand } = parseArgs(["--help"]);
    expect(subcommand).toBe("help");
  });

  it("normalizes --schema to schema", () => {
    const { subcommand } = parseArgs(["--schema"]);
    expect(subcommand).toBe("schema");
  });

  it("does not strip double -- from ---help (only one prefix)", () => {
    const { subcommand } = parseArgs(["---help"]);
    expect(subcommand).toBe("-help");
  });

  it("parses --flag value pairs", () => {
    const { parsed } = parseArgs(["run", "--name", "alice"]);
    expect(parsed.flags).toEqual({ name: "alice" });
  });

  it("resolves bare --flag (no following value) to true", () => {
    const { parsed } = parseArgs(["run", "--verbose"]);
    expect(parsed.flags).toEqual({ verbose: true });
  });

  it("resolves --flag followed by another --flag to true", () => {
    const { parsed } = parseArgs(["run", "--verbose", "--debug"]);
    expect(parsed.flags).toEqual({ verbose: true, debug: true });
  });

  it("last-one-wins for repeated flags", () => {
    const { parsed } = parseArgs(["run", "--env", "dev", "--env", "prod"]);
    expect(parsed.flags).toEqual({ env: "prod" });
  });

  it("collects positional args", () => {
    const { parsed } = parseArgs(["run", "foo", "bar"]);
    expect(parsed.positional).toEqual(["foo", "bar"]);
  });

  it("treats all tokens after -- sentinel as positional", () => {
    const { parsed } = parseArgs(["run", "--", "--not-a-flag", "value"]);
    expect(parsed.positional).toEqual(["--not-a-flag", "value"]);
    expect(parsed.flags).toEqual({});
  });

  it("mixes flags and positional args", () => {
    const { parsed } = parseArgs(["run", "pos1", "--key", "val", "pos2"]);
    expect(parsed.flags).toEqual({ key: "val" });
    expect(parsed.positional).toEqual(["pos1", "pos2"]);
  });

  it("promotes --help in tail to subcommand (global-flag override)", () => {
    const { subcommand } = parseArgs(["run", "--help"]);
    expect(subcommand).toBe("help");
  });

  it("promotes --schema in tail to subcommand (global-flag override)", () => {
    const { subcommand } = parseArgs(["run", "--schema"]);
    expect(subcommand).toBe("schema");
  });

  it("does not promote --help when argv[0] is already a reserved builtin", () => {
    const { subcommand, parsed } = parseArgs(["schema", "--help"]);
    expect(subcommand).toBe("schema");
    expect(parsed.flags).toEqual({ help: true });
  });

  it("does not promote --schema when argv[0] is already help", () => {
    const { subcommand, parsed } = parseArgs(["help", "--schema"]);
    expect(subcommand).toBe("help");
    expect(parsed.flags).toEqual({ schema: true });
  });
});

describe("validateInput", () => {
  it("returns success for valid input", () => {
    const schema = z.object({ name: z.string() }).strict();
    const result = validateInput({ flags: { name: "alice" }, positional: [] }, schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: "alice" });
    }
  });

  it("returns failure for invalid input", () => {
    const schema = z.object({ name: z.string() }).strict();
    const result = validateInput({ flags: {}, positional: [] }, schema);
    expect(result.success).toBe(false);
  });

  it("attaches positional args under _ key when present", () => {
    const schema = z.object({ _: z.array(z.string()) }).strict();
    const result = validateInput({ flags: {}, positional: ["a", "b"] }, schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._).toEqual(["a", "b"]);
    }
  });

  it("does not attach _ key when no positional args", () => {
    const schema = z.object({ name: z.string() }).strict();
    const result = validateInput({ flags: { name: "alice" }, positional: [] }, schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("_");
    }
  });

  it("rejects unknown flags when schema is strict", () => {
    const schema = z.object({}).strict();
    const result = validateInput({ flags: { unknown: "val" }, positional: [] }, schema);
    expect(result.success).toBe(false);
  });

  it("positional args overwrite explicit _ flag", () => {
    const schema = z.object({ _: z.array(z.string()) });
    const result = validateInput(
      { flags: { _: "explicit" as unknown as string | true }, positional: ["a", "b"] },
      schema,
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data._).toEqual(["a", "b"]);
    }
  });
});
