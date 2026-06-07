/**
 * output-helpers.ts — Level-specific output-schema composers for the
 * code-first-agents Tool contract.
 *
 * Every tool output includes the `ok: z.literal(true)` + `message: z.string()`
 * envelope. These helpers bake that in and add the fields the spec requires
 * for each level (none for L1; required `classification` enum for L2;
 * required `instructions` string for L3), so the caller can't forget them
 * and VS Code shows a fully-resolved handler return type.
 *
 * Opt-in: tools with shapes that don't fit a level may pass a raw
 * `z.object({...})` to `output`. The base class doesn't require a helper.
 *
 * @module code-first-agents-tool/output-helpers
 */

import { z } from "zod";

/**
 * Compose an **L1 (data)** output schema: envelope + arbitrary raw fields.
 * Use when the tool returns facts for the LLM to interpret.
 *
 * @example
 * const schema = l1Output({ checkboxes: z.number(), file_paths: z.number() });
 *
 * @param fields - Raw data fields to include alongside the envelope.
 * @returns A `z.object` carrying `ok`, `message`, and the caller's fields.
 */
export function l1Output<T extends z.ZodRawShape>(
  fields: T,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString } & T> {
  return z.object({
    ok: z.literal(true),
    message: z.string(),
    ...fields,
  });
}

/**
 * Compose an **L2 (classification)** output schema: envelope + a required
 * `classification` enum + optional extras. Use when the tool returns a
 * discrete category the skill can branch on.
 *
 * @example
 * const schema = l2Output(
 *   z.enum(["lean", "standard", "full"]),
 *   { score: z.number(), signals: z.object({ checkboxes: z.number() }) },
 * );
 *
 * @param classification - Zod enum describing the discrete classification result.
 * @param fields - Optional extras (e.g. score, raw signals) merged into the output.
 * @returns A `z.object` carrying `ok`, `message`, `classification`, and extras.
 */
export function l2Output<C extends z.ZodTypeAny, T extends z.ZodRawShape>(
  classification: C,
  fields: T,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; classification: C } & T>;
// No-arg overload intentionally omits `& T` — the base shape is the full type when no extras are passed.
export function l2Output<C extends z.ZodTypeAny>(
  classification: C,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; classification: C }>;
export function l2Output(classification: z.ZodTypeAny, fields?: z.ZodRawShape) {
  return z.object({
    ok: z.literal(true),
    message: z.string(),
    classification,
    ...(fields ?? {}),
  });
}

/**
 * Compose an **L3 (instructions)** output schema: envelope + a required
 * `instructions` string + optional extras. Use when the tool builds a
 * verbatim procedure for the LLM to execute.
 *
 * @example
 * const schema = l3Output({ plan_level: z.enum(["lean", "standard", "full"]) });
 *
 * @param fields - Optional extras (e.g. classification alongside instructions) merged into the output.
 * @returns A `z.object` carrying `ok`, `message`, `instructions`, and extras.
 */
export function l3Output<T extends z.ZodRawShape>(
  fields: T,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; instructions: z.ZodString } & T>;
// No-arg overload intentionally omits `& T` — the base shape is the full type when no extras are passed.
export function l3Output(): z.ZodObject<{
  ok: z.ZodLiteral<true>;
  message: z.ZodString;
  instructions: z.ZodString;
}>;
export function l3Output(fields?: z.ZodRawShape) {
  return z.object({
    ok: z.literal(true),
    message: z.string(),
    instructions: z.string(),
    ...(fields ?? {}),
  });
}
