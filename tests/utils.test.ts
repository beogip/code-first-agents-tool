import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { jsonOutput, stringifyError, type ToolOutput } from "../src/index.ts";

describe("stringifyError", () => {
  it("extracts message from Error instance", () => {
    expect(stringifyError(new Error("boom"))).toBe("boom");
  });

  it("returns string values as-is", () => {
    expect(stringifyError("raw string")).toBe("raw string");
  });

  it("coerces null to 'null'", () => {
    expect(stringifyError(null)).toBe("null");
  });

  it("coerces undefined to 'undefined'", () => {
    expect(stringifyError(undefined)).toBe("undefined");
  });

  it("coerces number to string", () => {
    expect(stringifyError(42)).toBe("42");
  });

  it("coerces plain object to '[object Object]'", () => {
    expect(stringifyError({ key: "val" })).toBe("[object Object]");
  });

  it("uses custom toString when available", () => {
    const obj = { toString: () => "custom" };
    expect(stringifyError(obj)).toBe("custom");
  });
});

describe("jsonOutput", () => {
  const originalExit = process.exit;
  // biome-ignore lint/suspicious/noConsole: mocking console.log to capture jsonOutput
  const originalLog = console.log;

  let captured: string;
  let exitCode: number | undefined;

  beforeEach(() => {
    captured = "";
    exitCode = undefined;
    console.log = mock((...args: unknown[]) => {
      captured = String(args[0]);
    });
    process.exit = mock((code?: number) => {
      exitCode = code;
      throw new Error("__exit__");
    }) as never;
  });

  afterEach(() => {
    process.exit = originalExit;
    console.log = originalLog;
  });

  it("serializes ToolOutput as JSON to stdout and exits with 0", () => {
    const data: ToolOutput = { ok: true, message: "done" };

    expect(() => jsonOutput(data)).toThrow("__exit__");
    expect(exitCode).toBe(0);
    expect(captured).not.toBe("");
    expect(JSON.parse(captured)).toEqual({ ok: true, message: "done" });
  });

  it("includes extra fields in the envelope", () => {
    const data: ToolOutput = {
      ok: false,
      message: "fail",
      error: "bad_input",
      detail: "missing field",
    };

    expect(() => jsonOutput(data)).toThrow("__exit__");
    expect(exitCode).toBe(0);
    expect(captured).not.toBe("");
    const parsed = JSON.parse(captured);
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toBe("bad_input");
    expect(parsed.detail).toBe("missing field");
  });
});
