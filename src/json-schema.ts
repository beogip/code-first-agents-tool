/**
 * json-schema.ts — Safe wrapper around `z.toJSONSchema`.
 *
 * `z.toJSONSchema` throws on exotic Zod constructs (e.g. `.transform()`).
 * This helper centralizes the try/catch and the target version
 * (`draft-2020-12`) so the three call sites — `buildSchemaOutput`,
 * `buildHelpPayload`, and the `input_validation_error` envelope builder —
 * share a single fail-soft path.
 *
 * **Known limitation:** Zod v4's `toJSONSchema` emits `required` for fields
 * that have `.default(...)`. The emitted JSON Schema says the field is
 * mandatory even though Zod's runtime validation accepts its absence and
 * fills the default. This can mislead LLM callers reading `input_schema`
 * for self-correction (they may conclude a defaulted flag is required).
 * No workaround applied — consumers should test with the actual tool, not
 * rely on the schema's `required` array for defaulted fields.
 *
 * @module code-first-agents-tool/json-schema
 */

import { z } from "zod";

/** Result of converting a Zod schema to JSON Schema — success carries the schema; failure carries a message. */
export type JSONSchemaResult = { ok: true; schema: unknown } | { ok: false; $error: string };

/**
 * Convert a Zod schema to JSON Schema (draft-2020-12) without throwing.
 * On success returns `{ ok: true, schema }`; on failure returns
 * `{ ok: false, $error }` carrying the thrown message.
 *
 * @param schema - Any Zod schema.
 * @returns A discriminated result — never throws.
 */
export function safeToJSONSchema(schema: z.ZodTypeAny): JSONSchemaResult {
  try {
    return { ok: true, schema: z.toJSONSchema(schema, { target: "draft-2020-12" }) };
  } catch (err) {
    return { ok: false, $error: err instanceof Error ? err.message : String(err) };
  }
}
