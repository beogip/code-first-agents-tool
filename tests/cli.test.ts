import { describe, expect, it } from "bun:test";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const FIXTURE = join(import.meta.dirname, "fixtures", "dummy-tool.ts");

function runTool(...args: string[]): { stdout: string; stderr: string; exitCode: number } {
  const result = spawnSync("bun", [FIXTURE, ...args], {
    encoding: "utf-8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  if (result.error) {
    throw new Error(`Failed to spawn bun: ${result.error.message}`);
  }
  return {
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
    exitCode: result.status ?? 1,
  };
}

function parseOutput(stdout: string): Record<string, unknown> {
  if (!stdout) {
    throw new Error("parseOutput: stdout is empty — tool produced no output");
  }
  try {
    return JSON.parse(stdout);
  } catch (e) {
    throw new Error(`parseOutput: invalid JSON — ${(e as Error).message}\nstdout was: ${stdout}`);
  }
}

describe("CLI — dispatch sync handler", () => {
  it("greet returns validated typed output", () => {
    const { stdout, exitCode } = runTool("greet", "--name", "world");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r).toEqual({ ok: true, message: "greeted world", greeting: "hello world" });
  });
});

describe("CLI — dispatch async handler", () => {
  it("multiply awaits and returns product", () => {
    const { stdout, exitCode } = runTool("multiply", "--a", "6", "--b", "7");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(r.product).toBe(42);
  });
});

describe("CLI — defaults applied", () => {
  it("report without --level applies the 'info' default", () => {
    const { stdout, exitCode } = runTool("report");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(r.classification).toBe("info");
  });

  it("explicit --level debug overrides the default", () => {
    const { stdout, exitCode } = runTool("report", "--level", "debug");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.classification).toBe("debug");
  });
});

describe("CLI — handler non-invocation on input validation failure", () => {
  it("sideEffect handler does not run when input is invalid (no stderr marker)", () => {
    const { stdout, stderr, exitCode } = runTool("sideEffect");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("input_validation_error");
    expect(stderr).not.toContain("HANDLER_CALLED");
  });

  it("sideEffect handler DOES run when input is valid (stderr marker present)", () => {
    const { stdout, stderr, exitCode } = runTool("sideEffect", "--required", "x");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(stderr).toContain("HANDLER_CALLED");
  });
});

describe("CLI — handler throws unexpected error", () => {
  it("emits ok:false with error:'unexpected_error' and message from thrown Error", () => {
    const { stdout, exitCode } = runTool("throws");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("unexpected_error");
    expect(r.message).toBe("dummy-tool: intentional failure");
    expect(typeof r.detail).toBe("string");
  });
});

describe("CLI — handler throws ToolError", () => {
  it("emits custom error code and message verbatim", () => {
    const { stdout, exitCode } = runTool("businessError", "--code", "path_not_found");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("path_not_found");
    expect(r.message).toBe("Business failure with code 'path_not_found'");
  });

  it("includes detail when provided", () => {
    const { stdout, exitCode } = runTool(
      "businessError",
      "--code",
      "rate_limited",
      "--detail",
      "retry after 60s",
    );
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.error).toBe("rate_limited");
    expect(r.detail).toBe("retry after 60s");
  });

  it("omits detail when not provided", () => {
    const { stdout, exitCode } = runTool("businessError", "--code", "invalid_config");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.error).toBe("invalid_config");
    expect("detail" in r).toBe(false);
  });
});

describe("CLI — handler returns wrong shape", () => {
  it("emits ok:false with error:'schema_violation'", () => {
    const { stdout, exitCode } = runTool("badShape");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("schema_violation");
    expect(typeof r.detail).toBe("string");
    expect(r.detail as string).toMatch(/count/);
  });
});

describe("CLI — l3Output through full pipeline", () => {
  it("instruct subcommand returns instructions field via l3Output", () => {
    const { stdout, exitCode } = runTool("instruct");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(r.instructions).toBe("## Step 1\nDo the thing.");
    expect(r.topic).toBe("setup");
  });
});

describe("CLI — --subcommand normalization", () => {
  it("--help produces identical output to help", () => {
    const bare = parseOutput(runTool("help").stdout);
    const dashed = parseOutput(runTool("--help").stdout);
    expect(dashed).toEqual(bare);
  });

  it("--schema produces identical output to schema", () => {
    const bare = parseOutput(runTool("schema").stdout);
    const dashed = parseOutput(runTool("--schema").stdout);
    expect(dashed).toEqual(bare);
  });

  it("--greet --name world works like greet --name world", () => {
    const bare = parseOutput(runTool("greet", "--name", "world").stdout);
    const dashed = parseOutput(runTool("--greet", "--name", "world").stdout);
    expect(dashed).toEqual(bare);
  });

  it("bare -- as argv[0] yields no-subcommand-provided", () => {
    const { stdout } = runTool("--");
    const r = parseOutput(stdout);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("unknown_subcommand");
    expect(r.message).toMatch(/No subcommand provided/);
  });

  it("---help (triple dash) normalizes to -help, rejected as unknown", () => {
    const { stdout } = runTool("---help");
    const r = parseOutput(stdout);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("unknown_subcommand");
    expect(r.message).toMatch(/-help/);
  });

  it("-help (single dash) is not normalized, rejected as unknown", () => {
    const { stdout } = runTool("-help");
    const r = parseOutput(stdout);
    expect(r.ok).toBe(false);
    expect(r.error).toBe("unknown_subcommand");
    expect(r.message).toMatch(/-help/);
  });
});

describe("CLI — global --help / --schema flag override", () => {
  it("greet --help promotes to help instead of running greet", () => {
    const { stdout } = runTool("greet", "--help");
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(r.subcommands).toBeDefined();
    expect(r.tool).toMatchObject({ name: "dummy-tool" });
  });

  it("greet --schema promotes to schema instead of running greet", () => {
    const { stdout } = runTool("greet", "--schema");
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(r.schemas).toBeDefined();
  });

  it("schema --help is NOT overridden (explicit builtin)", () => {
    const { stdout } = runTool("schema", "--help");
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(r.schemas).toBeDefined();
    expect(r.subcommands).toBeUndefined();
  });

  it("help --schema is NOT overridden (explicit builtin)", () => {
    const { stdout } = runTool("help", "--schema");
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(r.subcommands).toBeDefined();
    expect(r.schemas).toBeUndefined();
  });
});

describe("CLI — reserved _ key collision", () => {
  it("warns on stderr and positionals win when both --_ and positionals are passed", () => {
    const { stdout, stderr, exitCode } = runTool("echoArgs", "--_", "explicit", "pos1", "pos2");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.ok).toBe(true);
    expect(r.args).toEqual(["pos1", "pos2"]);
    expect(stderr).toContain('"_" is reserved');
  });

  it("does not warn when only positionals are passed (no --_ flag)", () => {
    const { stdout, stderr, exitCode } = runTool("echoArgs", "pos1", "pos2");
    expect(exitCode).toBe(0);
    const r = parseOutput(stdout);
    expect(r.args).toEqual(["pos1", "pos2"]);
    expect(stderr).not.toContain("reserved");
  });
});

describe("CLI — exit code is always 0", () => {
  it.each([
    ["greet", ["--name", "x"]],
    ["multiply", ["--a", "2", "--b", "3"]],
    ["report", []],
    ["report", ["--level", "debug"]],
    ["report", ["--bogus", "x"]],
    ["greet", []],
    ["throws", []],
    ["businessError", ["--code", "x"]],
    ["businessError", ["--code", "x", "--detail", "d"]],
    ["instruct", []],
    ["sideEffect", ["--required", "x"]],
    ["sideEffect", []],
    ["badShape", []],
    ["bogus", []],
    ["schema", []],
    ["help", []],
    ["--schema", []],
    ["--help", []],
    ["--greet", ["--name", "x"]],
    ["--", []],
  ])("sub=%s args=%j exits with 0", (sub, args) => {
    const argv = sub === "" ? [] : [sub, ...args];
    const { exitCode } = runTool(...argv);
    expect(exitCode).toBe(0);
  });

  it("empty argv exits with 0", () => {
    const { exitCode } = runTool();
    expect(exitCode).toBe(0);
  });
});
