/**
 * envelopes.ts — Typed error-envelope factories for the Tool base class.
 *
 * The four error codes (`unknown_subcommand`, `input_validation_error`,
 * `schema_violation`, `unexpected_error`) are modeled as a discriminated
 * union so extras (`subcommands`, `input_schema`, `detail`) stay type-safe
 * per-code. Each builder owns the exact message template for its code,
 * which previously lived inline in `Tool#run`.
 *
 * @module code-first-agents-tool/envelopes
 */

import type { z } from "zod";
import { buildHelpPayload, type HelpPayload } from "./introspection";
import { safeToJSONSchema } from "./json-schema";
import type { SubcommandSpec } from "./types";
import { stringifyError } from "./utils";

/**
 * Discriminated union of every error envelope the base class can emit.
 * Each variant is assignable to `ToolOutput` from `./utils.ts` via its
 * index signature, so `jsonOutput` consumes them without casts.
 *
 * The final variant (`error: string`) covers handler-emitted business
 * errors thrown via {@link ToolError} — the `error` code is whatever the
 * handler chose.
 */
export type ErrorEnvelope =
  | {
      ok: false;
      error: "unknown_subcommand";
      message: string;
      subcommands: HelpPayload;
    }
  | {
      ok: false;
      error: "input_validation_error";
      message: string;
      detail: string;
      input_schema: unknown;
    }
  | {
      ok: false;
      error: "schema_violation";
      message: string;
      detail: string;
    }
  | {
      ok: false;
      error: "non_object_return";
      message: string;
    }
  | {
      ok: false;
      error: "unexpected_error";
      message: string;
      detail?: string | Record<string, unknown>;
    }
  | {
      ok: false;
      error: string;
      message: string;
      detail?: string | Record<string, unknown>;
    };

/**
 * Error class a handler can throw to emit a structured error envelope with
 * a business-specific `error` code (e.g. `"path_not_found"`, `"rate_limited"`).
 * The base class catches instances of this class and produces the envelope
 * via {@link toolErrorEnvelope}; anything else thrown becomes an
 * `unexpected_error` envelope.
 *
 * @example
 * handler: ({ path }) => {
 *   if (!existsSync(path)) {
 *     throw new ToolError("path_not_found", `Path does not exist: ${path}`);
 *   }
 *   return { message: "ok", ... };
 * }
 */
export class ToolError extends Error {
  /** Machine-readable error code emitted in the envelope's `error` field. */
  public readonly code: string;
  /** Optional extra context included in the envelope's `detail` field. */
  public readonly detail?: string | Record<string, unknown>;

  /**
   * @param code - Machine-readable error code (emitted verbatim). Conventionally snake_case.
   * @param message - Human-readable message.
   * @param detail - Optional extra context (string or structured object).
   */
  constructor(code: string, message: string, detail?: string | Record<string, unknown>) {
    super(message);
    this.name = "ToolError";
    this.code = code;
    if (detail !== undefined) {
      this.detail = detail;
    }
  }
}

/**
 * Build the `unknown_subcommand` envelope. When `name === ""` (empty argv),
 * the message notes the absence; otherwise it names the unrecognized input.
 * Always includes the full `subcommands` listing so an LLM caller can
 * self-correct on retry.
 *
 * @param name - The unrecognized subcommand (or empty string for empty argv).
 * @param subs - The Tool's registered-subcommands map.
 * @returns A typed `unknown_subcommand` envelope.
 */
export function unknownSubcommandEnvelope(
  name: string,
  subs: ReadonlyMap<string, SubcommandSpec<z.ZodTypeAny, z.ZodTypeAny>>,
): ErrorEnvelope {
  const message =
    name === ""
      ? "No subcommand provided — see 'subcommands' for available options"
      : `Unknown subcommand '${name}' — see 'subcommands' for available options`;
  return {
    ok: false as const,
    error: "unknown_subcommand" as const,
    message,
    subcommands: buildHelpPayload(subs),
  };
}

/**
 * Build the `input_validation_error` envelope. Attaches the input JSON
 * Schema (or `$error` fallback) so the LLM can correct the flags and retry.
 *
 * @param name - The subcommand whose input failed validation.
 * @param zerr - The Zod error produced by `safeParse`.
 * @param inputSchema - The subcommand's declared input Zod schema.
 * @returns A typed `input_validation_error` envelope.
 */
export function inputValidationErrorEnvelope(
  name: string,
  zerr: z.ZodError,
  inputSchema: z.ZodTypeAny,
): ErrorEnvelope {
  const conv = safeToJSONSchema(inputSchema);
  const input_schema: unknown = conv.ok ? conv.schema : { $error: conv.$error };
  return {
    ok: false as const,
    error: "input_validation_error" as const,
    message: `Input validation failed for subcommand '${name}'`,
    detail: zerr.message,
    input_schema,
  };
}

/**
 * Build the `schema_violation` envelope. Fires when a handler returns a
 * value that fails the subcommand's output Zod schema.
 *
 * @param name - The subcommand whose handler return failed validation.
 * @param zerr - The Zod error produced by output `safeParse`.
 * @returns A typed `schema_violation` envelope.
 */
export function schemaViolationEnvelope(name: string, zerr: z.ZodError): ErrorEnvelope {
  return {
    ok: false as const,
    error: "schema_violation" as const,
    message: `Handler output failed schema validation for subcommand '${name}'`,
    detail: zerr.message,
  };
}

/**
 * Build the `unexpected_error` envelope. Catches anything the handler (or
 * the base class plumbing itself) throws that is NOT a {@link ToolError}.
 * The error's stack is included in `detail` when available.
 *
 * @param err - The thrown value (or rejected Promise reason).
 * @returns A typed `unexpected_error` envelope.
 */
export function unexpectedErrorEnvelope(err: unknown): ErrorEnvelope {
  const message = stringifyError(err);
  const stack = err instanceof Error ? err.stack : undefined;
  return stack !== undefined
    ? { ok: false as const, error: "unexpected_error" as const, message, detail: stack }
    : { ok: false as const, error: "unexpected_error" as const, message };
}

/**
 * Build a handler-emitted error envelope from a {@link ToolError}. Preserves
 * the custom `code`, `message`, and optional `detail` the handler declared,
 * so consumers see a business-specific error envelope instead of a generic
 * `unexpected_error`.
 *
 * @param err - The {@link ToolError} the handler threw.
 * @returns An envelope carrying the handler's custom `error` code.
 */
export function toolErrorEnvelope(err: ToolError): ErrorEnvelope {
  return err.detail !== undefined
    ? { ok: false as const, error: err.code, message: err.message, detail: err.detail }
    : { ok: false as const, error: err.code, message: err.message };
}

/**
 * Build the `non_object_return` envelope. Fires when a handler returns a
 * non-plain-object value (null, string, array, etc.) that cannot be spread
 * into the output envelope.
 *
 * @param name - The subcommand whose handler returned a non-object.
 * @param value - The actual value the handler returned (used to describe the type).
 * @returns A typed `non_object_return` envelope.
 */
export function nonObjectReturnEnvelope(name: string, value: unknown): ErrorEnvelope {
  const type = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
  return {
    ok: false as const,
    error: "non_object_return",
    message: `Handler for '${name}' must return a plain object, got ${type}`,
  };
}
