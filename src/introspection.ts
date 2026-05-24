/**
 * introspection.ts — Builders for the auto-registered `schema` and `help`
 * subcommand payloads, plus the help listing carried inside the
 * `unknown_subcommand` error envelope.
 *
 * Both builders delegate to `safeToJSONSchema` so exotic Zod constructs
 * fail soft (one subcommand emits `{$error}` instead of crashing the whole
 * response).
 *
 * @module code-first-agents-tool/introspection
 */

import type { z } from "zod";
import { safeToJSONSchema } from "./json-schema.ts";
import type { SubcommandSpec } from "./types.ts";

/** One entry in the `subcommands` help listing. */
export interface HelpPayloadEntry {
  /** Subcommand name as registered. */
  name: string;
  /** One-line description from the spec. */
  description: string;
  /** Input JSON Schema (draft-2020-12) or `{$error}` fallback. */
  input_schema: unknown;
}

/** The shape returned by {@link buildHelpPayload} — an array of entries. */
export type HelpPayload = HelpPayloadEntry[];

/** One entry in the `schemas` map emitted by the `schema` subcommand. */
export type SchemaOutputEntry = { input: unknown; output: unknown } | { $error: string };

/**
 * Convert a registered subcommand map into a `{name: {input, output}}`
 * record of JSON Schemas (draft-2020-12). Per-subcommand conversion is
 * fail-soft via {@link safeToJSONSchema}: a failing sub gets a `$error`
 * entry instead of crashing the whole `schema` response.
 *
 * @param subs - Map from subcommand name to its spec.
 * @returns Record keyed by subcommand name, each value either `{input, output}` or `{$error}`.
 */
export function buildSchemaOutput(
  subs: ReadonlyMap<string, SubcommandSpec<z.ZodTypeAny, z.ZodTypeAny>>,
): Record<string, SchemaOutputEntry> {
  const result: Record<string, SchemaOutputEntry> = {};
  for (const [name, spec] of subs) {
    const inputResult = safeToJSONSchema(spec.input);
    const outputResult = safeToJSONSchema(spec.output);
    if (!inputResult.ok) {
      result[name] = { $error: inputResult.$error };
    } else if (!outputResult.ok) {
      result[name] = { $error: outputResult.$error };
    } else {
      result[name] = { input: inputResult.schema, output: outputResult.schema };
    }
  }
  return result;
}

/**
 * Build the `subcommands` array used by `help` output and the
 * `unknown_subcommand` error envelope. Each entry carries the input JSON
 * Schema so an LLM caller can discover which flags a subcommand expects.
 *
 * @param subs - Map from subcommand name to its spec.
 * @returns Array of `{name, description, input_schema}` entries.
 */
export function buildHelpPayload(
  subs: ReadonlyMap<string, SubcommandSpec<z.ZodTypeAny, z.ZodTypeAny>>,
): HelpPayload {
  const result: HelpPayload = [];
  for (const [name, spec] of subs) {
    const conv = safeToJSONSchema(spec.input);
    const input_schema: unknown = conv.ok ? conv.schema : { $error: conv.$error };
    result.push({ name, description: spec.description, input_schema });
  }
  return result;
}
