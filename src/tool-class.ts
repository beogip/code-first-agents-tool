/**
 * tool-class.ts — The `Tool` orchestrator for code-first-agents deterministic tools.
 *
 * Implements the tool contract defined in the code-first agents pattern:
 * - Subcommand dispatch with typed input/output Zod schemas
 * - Validated JSON output (the shape IS the validator)
 * - Self-describing `schema` subcommand (auto-registered)
 * - `help` subcommand + unknown-subcommand fallback that exposes input schemas
 *   so LLM callers can self-correct
 * - Always exits with code 0; errors communicated via `ok: false` envelope
 *
 * Spec: https://code-first-agents.com/patterns/deterministic-tools.html
 *
 * ## Usage
 *
 * ```ts
 * import { z } from "zod";
 * import { Tool, l2Output } from "@code-first-agents/tool";
 *
 * new Tool({ name: "level-classifier", description: "..." })
 *   .subcommand({
 *     name: "classify",
 *     description: "Classify a SKILL.md by code-first level",
 *     input: z.object({ path: z.string() }).strict(),
 *     output: l2Output(z.enum(["L1", "L2", "L3"])),
 *     // Handler returns message + data. `ok: true` is framework-added.
 *     handler: ({ path }) => ({
 *       message: `classified ${path}`,
 *       classification: "L2",
 *     }),
 *   })
 *   .run(process.argv.slice(2));
 * ```
 *
 * ## Output envelope contract
 *
 * Handlers return the output shape **without `ok`** — the base class stamps
 * `ok: true` onto the handler's result before validating against the output
 * schema. This keeps handlers focused on `message` + business data and avoids
 * TypeScript widening `ok: true` to `boolean` in object-literal returns.
 *
 * Use the level helpers (`l1Output`, `l2Output`, `l3Output` from
 * `./output-helpers.ts`) to get the envelope + level-specific required
 * fields baked in; fall back to raw `z.object({...})` when the tool's shape
 * doesn't fit a level (remember to include `ok: z.literal(true)` and
 * `message: z.string()` in the raw schema so validation covers the whole
 * envelope).
 *
 * Error envelopes (`schema_violation`, `input_validation_error`,
 * `unknown_subcommand`, `unexpected_error`) are class-authored — see
 * `./envelopes.ts`.
 *
 * @module code-first-agents-tool/tool-class
 */

import { z } from "zod";
import { parseArgs, RESERVED_SUBCOMMANDS, validateInput } from "./args.ts";
import {
  inputValidationErrorEnvelope,
  nonObjectReturnEnvelope,
  schemaViolationEnvelope,
  ToolError,
  toolErrorEnvelope,
  unexpectedErrorEnvelope,
  unknownSubcommandEnvelope,
} from "./envelopes.ts";
import { buildHelpPayload, buildSchemaOutput } from "./introspection.ts";
import type { ParsedArgs, SubcommandSpec, ToolMeta } from "./types.ts";
import { jsonOutput, type ToolOutput } from "./utils.ts";

/** Internal alias for the type-erased spec stored in the registry. */
type AnySpec = SubcommandSpec<z.ZodTypeAny, z.ZodTypeAny>;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Orchestrator for a code-first deterministic tool. Register subcommands via
 * {@link Tool.subcommand}, then call {@link Tool.run} with `process.argv.slice(2)`.
 *
 * The class always terminates the process with exit code 0 via `jsonOutput`;
 * errors are communicated through the JSON envelope's `ok: false` + `error`
 * fields.
 *
 * Reserved subcommand names `schema` and `help` are auto-registered by the
 * class — attempting to register them manually throws `RangeError`.
 */
export class Tool {
  private readonly meta: ToolMeta;
  private readonly subs: Map<string, AnySpec> = new Map();

  /**
   * @param meta - Tool metadata (name + description).
   */
  constructor(meta: ToolMeta) {
    this.meta = meta;
  }

  /**
   * Register a subcommand. Chainable (returns `this`).
   *
   * Throws synchronously on:
   * - reserved name collision (`schema`, `help`) → `RangeError`
   * - duplicate name → `RangeError`
   * - missing `input` schema → `TypeError`
   * - missing `output` schema → `TypeError`
   *
   * @param spec - {@link SubcommandSpec} carrying name, description, input/output Zod schemas, and handler.
   * @returns This tool instance, for chaining.
   */
  subcommand<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(spec: SubcommandSpec<I, O>): this {
    this.validateRegistration(spec);
    this.subs.set(spec.name, spec as unknown as AnySpec);
    return this;
  }

  /**
   * Dispatch a subcommand from parsed `argv`. Always terminates the process
   * via `jsonOutput` with exit code 0.
   *
   * Pure dispatch — each branch delegates to a single-responsibility helper:
   * 1. {@link Tool.dispatchBuiltin} handles `schema` / `help`.
   * 2. {@link Tool.rejectUnknown} handles empty or unregistered subcommands.
   * 3. {@link Tool.runSubcommand} runs the validate → handler → validate pipeline.
   * 4. Outer try/catch: {@link ToolError} → handler-emitted envelope with the
   *    custom code; anything else → `unexpected_error`.
   *
   * @param argv - CLI tokens, typically `process.argv.slice(2)`.
   * @returns Never — the process exits via `jsonOutput`.
   */
  async run(argv: string[]): Promise<never> {
    try {
      const { subcommand, parsed } = parseArgs(argv);
      const builtin = this.dispatchBuiltin(subcommand);
      if (builtin) return jsonOutput(builtin);
      const miss = this.rejectUnknown(subcommand);
      if (miss) return jsonOutput(miss);
      return jsonOutput(await this.runSubcommand(subcommand, parsed));
    } catch (err) {
      if (err instanceof ToolError) return jsonOutput(toolErrorEnvelope(err));
      return jsonOutput(unexpectedErrorEnvelope(err));
    }
  }

  /**
   * Pre-flight checks for a subcommand registration. Called by
   * {@link Tool.subcommand}; throws synchronously on any violation.
   *
   * @param spec - The {@link SubcommandSpec} to validate.
   * @throws `RangeError` for reserved-name collision or duplicate registration.
   * @throws `TypeError` when `input` is missing.
   */
  private validateRegistration<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
    spec: SubcommandSpec<I, O>,
  ): void {
    if (RESERVED_SUBCOMMANDS.has(spec.name)) {
      throw new RangeError(
        `Subcommand name "${spec.name}" is reserved — the base class auto-registers 'schema' and 'help'`,
      );
    }
    if (this.subs.has(spec.name)) {
      throw new RangeError(`Subcommand "${spec.name}" is already registered`);
    }
    if (spec.input === undefined || spec.input === null) {
      throw new TypeError(
        `Subcommand "${spec.name}" is missing required 'input' Zod schema (use z.object({}).strict() for argless subs)`,
      );
    }
    if (spec.output === undefined || spec.output === null) {
      throw new TypeError(
        `Subcommand "${spec.name}" is missing required 'output' Zod schema (use l1Output({}) for minimal output)`,
      );
    }
  }

  /**
   * Handle the auto-registered `schema` and `help` subcommands. Returns the
   * success envelope for those names, or `null` to signal the caller should
   * fall through to user-registered dispatch.
   *
   * @param name - The parsed subcommand name.
   * @returns A success envelope for `schema`/`help`, or `null` otherwise.
   */
  private dispatchBuiltin(name: string): ToolOutput | null {
    if (name === "schema") {
      return {
        ok: true,
        message:
          this.subs.size === 0
            ? `Tool "${this.meta.name}" has no subcommands registered`
            : `JSON Schemas for ${this.subs.size} subcommand(s)`,
        schemas: buildSchemaOutput(this.subs),
      };
    }
    if (name === "help") {
      return {
        ok: true,
        message: this.meta.description || `Help for ${this.meta.name}`,
        tool: { name: this.meta.name },
        subcommands: buildHelpPayload(this.subs),
      };
    }
    return null;
  }

  /**
   * Handle empty argv and unregistered-subcommand cases. Returns the
   * `unknown_subcommand` envelope (carrying the help listing for LLM
   * self-correction) when applicable, or `null` when the subcommand is
   * registered and should proceed.
   *
   * @param name - The parsed subcommand name.
   * @returns An `unknown_subcommand` envelope, or `null` if the name is registered.
   */
  private rejectUnknown(name: string): ToolOutput | null {
    if (name === "" || !this.subs.has(name)) {
      return unknownSubcommandEnvelope(name, this.subs);
    }
    return null;
  }

  /**
   * Execute a registered subcommand: validate input → `await` handler →
   * stamp `ok: true` → validate output. Returns whichever envelope the
   * pipeline produced (success or one of the validation errors).
   *
   * Preconditions: `name` must be a registered subcommand name. Callers
   * should run {@link Tool.rejectUnknown} first.
   *
   * @param name - The subcommand to execute.
   * @param parsed - Raw parsed args from {@link parseArgs}.
   * @returns A success envelope or a typed error envelope.
   */
  private async runSubcommand(name: string, parsed: ParsedArgs): Promise<ToolOutput> {
    const spec = this.subs.get(name);
    if (!spec) {
      // Unreachable: rejectUnknown would have caught this. Kept as a type guard.
      return unexpectedErrorEnvelope(
        new Error(`Subcommand '${name}' vanished between rejectUnknown and runSubcommand`),
      );
    }

    const inputResult = validateInput(parsed, spec.input);
    if (!inputResult.success) {
      return inputValidationErrorEnvelope(name, inputResult.error, spec.input);
    }

    const handlerResult = await spec.handler(inputResult.data);
    return this.validateOutput(name, handlerResult, spec);
  }

  /**
   * Programmatic entry point — runs a subcommand in-process without CLI
   * arg parsing or `process.exit`. Identical validation pipeline to
   * {@link Tool.run}, but accepts a plain object instead of argv tokens.
   *
   * @param subcommand - The subcommand name to dispatch.
   * @param args - Input data as a plain object (bypasses CLI parsing).
   * @returns The output envelope (success or error).
   *
   * Unlike `run()`, this method does NOT promote global flags (e.g. `--path`)
   * into subcommand args. Callers must pass the full args object directly.
   * Also, stderr output from handlers is not capturable — spawn the tool
   * as a subprocess in tests that need to assert on stderr content.
   */
  async invoke(subcommand: string, args: Record<string, unknown> = {}): Promise<ToolOutput> {
    try {
      const builtin = this.dispatchBuiltin(subcommand);
      if (builtin) return builtin;
      const miss = this.rejectUnknown(subcommand);
      if (miss) return miss;

      const spec = this.subs.get(subcommand);
      if (!spec) {
        return unexpectedErrorEnvelope(
          new Error(`Subcommand '${subcommand}' vanished between rejectUnknown and invoke`),
        );
      }

      const inputResult = spec.input.safeParse(args);
      if (!inputResult.success) {
        return inputValidationErrorEnvelope(subcommand, inputResult.error, spec.input);
      }

      const handlerResult = await spec.handler(inputResult.data);
      return this.validateOutput(subcommand, handlerResult, spec);
    } catch (err) {
      if (err instanceof ToolError) return toolErrorEnvelope(err);
      return unexpectedErrorEnvelope(err);
    }
  }

  private validateOutput(name: string, handlerResult: unknown, spec: AnySpec): ToolOutput {
    if (!isPlainObject(handlerResult)) {
      return nonObjectReturnEnvelope(name, handlerResult);
    }

    const fullResult = { ...handlerResult, ok: true as const };
    const outputResult = spec.output.safeParse(fullResult);
    if (!outputResult.success) {
      return schemaViolationEnvelope(name, outputResult.error);
    }

    const data = outputResult.data as Record<string, unknown>;
    if (!("ok" in data)) {
      return schemaViolationEnvelope(
        name,
        new z.ZodError([
          {
            code: "custom",
            path: ["ok"],
            message:
              "Output schema is missing 'ok' field — add ok: z.literal(true) or use l1Output/l2Output/l3Output helpers",
          },
        ]),
      );
    }

    return data as ToolOutput;
  }
}
