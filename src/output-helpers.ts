/**
 * output-helpers.ts — Tool-type-specific output-schema composers for the
 * code-first-agents Tool contract.
 *
 * Every tool output includes the `ok: z.literal(true)` + `message: z.string()`
 * envelope. These helpers bake that in and add the fields the spec requires
 * for each tool type (none for Data; required `classification` enum for
 * Classification; required `instructions` string for Procedure), so the caller
 * can't forget them and VS Code shows a fully-resolved handler return type.
 *
 * Opt-in: tools with shapes that don't fit a tool type may pass a raw
 * `z.object({...})` to `output`. The base class doesn't require a helper.
 *
 * @module code-first-agents-tool/output-helpers
 */

import { z } from "zod";

/**
 * Compose a **Data** output schema: envelope + arbitrary raw fields.
 * Use when the tool returns facts for the LLM to interpret.
 *
 * @example
 * const schema = dataTypeOutput({ checkboxes: z.number(), file_paths: z.number() });
 *
 * @remarks
 * Changing this helper's type is a breaking change. At that point the
 * deprecated `l1Output` alias stops being supported and is removed rather
 * than adapted to the new type.
 *
 * @param fields - Raw data fields to include alongside the envelope.
 * @returns A `z.object` carrying `ok`, `message`, and the caller's fields.
 */
export function dataTypeOutput<T extends z.ZodRawShape>(
  fields: T,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString } & T> {
  return z.object({
    ok: z.literal(true),
    message: z.string(),
    ...fields,
  });
}

/**
 * Compose a **Classification** output schema: envelope + a required
 * `classification` enum + optional extras. Use when the tool returns a
 * discrete category the skill can branch on.
 *
 * @example
 * const schema = classificationTypeOutput(
 *   z.enum(["lean", "standard", "full"]),
 *   { score: z.number(), signals: z.object({ checkboxes: z.number() }) },
 * );
 *
 * @remarks
 * Changing this helper's type is a breaking change. At that point the
 * deprecated `l2Output` alias stops being supported and is removed rather
 * than adapted to the new type.
 *
 * @param classification - Zod enum describing the discrete classification result.
 * @param fields - Optional extras (e.g. score, raw signals) merged into the output.
 * @returns A `z.object` carrying `ok`, `message`, `classification`, and extras.
 */
export function classificationTypeOutput<C extends z.ZodTypeAny, T extends z.ZodRawShape>(
  classification: C,
  fields: T,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; classification: C } & T>;
// No-arg overload intentionally omits `& T` — the base shape is the full type when no extras are passed.
export function classificationTypeOutput<C extends z.ZodTypeAny>(
  classification: C,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; classification: C }>;
export function classificationTypeOutput(classification: z.ZodTypeAny, fields?: z.ZodRawShape) {
  return z.object({
    ok: z.literal(true),
    message: z.string(),
    classification,
    ...(fields ?? {}),
  });
}

/**
 * Compose a **Procedure** output schema: envelope + a required
 * `instructions` string + optional extras. Use when the tool builds a
 * verbatim procedure for the LLM to execute.
 *
 * @example
 * const schema = procedureTypeOutput({ plan_level: z.enum(["lean", "standard", "full"]) });
 *
 * @remarks
 * Changing this helper's type is a breaking change. At that point the
 * deprecated `l3Output` alias stops being supported and is removed rather
 * than adapted to the new type.
 *
 * @param fields - Optional extras (e.g. classification alongside instructions) merged into the output.
 * @returns A `z.object` carrying `ok`, `message`, `instructions`, and extras.
 */
export function procedureTypeOutput<T extends z.ZodRawShape>(
  fields: T,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; instructions: z.ZodString } & T>;
// No-arg overload intentionally omits `& T` — the base shape is the full type when no extras are passed.
export function procedureTypeOutput(): z.ZodObject<{
  ok: z.ZodLiteral<true>;
  message: z.ZodString;
  instructions: z.ZodString;
}>;
export function procedureTypeOutput(fields?: z.ZodRawShape) {
  return z.object({
    ok: z.literal(true),
    message: z.string(),
    instructions: z.string(),
    ...(fields ?? {}),
  });
}

/**
 * @deprecated Use {@link dataTypeOutput}. Kept until the next breaking change,
 * then removed.
 */
export const l1Output = dataTypeOutput;

/**
 * @deprecated Use {@link classificationTypeOutput}. Kept until the next
 * breaking change, then removed.
 */
export const l2Output = classificationTypeOutput;

/**
 * @deprecated Use {@link procedureTypeOutput}. Kept until the next breaking
 * change, then removed.
 */
export const l3Output = procedureTypeOutput;
