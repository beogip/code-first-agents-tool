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
 * Fields the envelope owns are rejected, not merged: passing `ok`, `message`
 * (or `instructions`, for Procedure) in a shape throws a `RangeError` at
 * registration time instead of letting the author's weaker Zod type win the
 * spread.
 *
 * @module code-first-agents-tool/output-helpers
 */

import { z } from "zod";

/**
 * Reserved envelope keys, one set per call surface. Exported for `./types.ts`
 * but kept out of the `./index.ts` barrel, like `RESERVED_SUBCOMMANDS`.
 *
 * The two Classification sets differ deliberately. On the standalone helper the
 * enum arrives as a positional argument, so a `classification` among `fields`
 * would win the spread and silently replace it. On `classificationSubcommand`
 * it is the author's own required key, destructured out of `output` before the
 * guard runs — so it stays legal there.
 */
export const DATA_RESERVED_KEYS = ["ok", "message"] as const;
export const CLASSIFICATION_HELPER_RESERVED_KEYS = ["ok", "message", "classification"] as const;
export const CLASSIFICATION_SUBCOMMAND_RESERVED_KEYS = ["ok", "message"] as const;
export const PROCEDURE_RESERVED_KEYS = ["ok", "message", "instructions"] as const;

/** Array → literal-union bridge, so each array above serves both layers. */
export type ReservedKey<A extends readonly string[]> = A[number];

/**
 * Compile-time counterpart of {@link assertNoReservedCollision}.
 *
 * Depends on `R` only, never on the shape being constrained: a `keyof`-based
 * conditional would stay unresolved wherever the shape is still a generic
 * parameter — exactly the case in `tool-class.ts`, where the per-type methods
 * forward `S` to these helpers.
 *
 * The `= Record<never, never>` defaults below keep an empty call (`helper({})`)
 * from widening `T` to the `z.ZodRawShape` index signature and leaking it into
 * the return type. They do not affect reserved-key rejection either way.
 */
export type NoReserved<R extends string> = { [K in R]?: never };

/**
 * Reject a shape that redeclares a field the helper composes itself.
 *
 * @param fields - Raw shape to inspect. `undefined` (no-arg overloads) passes.
 * @param reserved - Reserved-key set for the calling helper.
 * @throws `RangeError` naming every colliding key, in author declaration order.
 */
function assertNoReservedCollision(
  fields: Readonly<Record<string, unknown>> | undefined,
  reserved: readonly string[],
): void {
  if (!fields) return;
  const collisions = Object.keys(fields).filter((key) => reserved.includes(key));
  if (collisions.length === 0) return;
  throw new RangeError(
    `output shape redeclares reserved envelope field(s): ${collisions.join(", ")} — the output helper composes these, so declaring them would silently override the envelope contract`,
  );
}

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
 * @throws `RangeError` when `fields` redeclares `ok` or `message`.
 */
export function dataTypeOutput<T extends z.ZodRawShape = Record<never, never>>(
  fields: T & NoReserved<ReservedKey<typeof DATA_RESERVED_KEYS>>,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString } & T> {
  assertNoReservedCollision(fields, DATA_RESERVED_KEYS);
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
 * @param fields - Optional extras (e.g. score, raw signals) merged into the
 * output. Pass the enum as the first argument, not as a key here.
 * @returns A `z.object` carrying `ok`, `message`, `classification`, and extras.
 * @throws `RangeError` when `fields` redeclares `ok`, `message` or `classification`.
 */
export function classificationTypeOutput<
  C extends z.ZodTypeAny,
  T extends z.ZodRawShape = Record<never, never>,
>(
  classification: C,
  fields: T & NoReserved<ReservedKey<typeof CLASSIFICATION_HELPER_RESERVED_KEYS>>,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; classification: C } & T>;
// No-arg overload intentionally omits `& T` — the base shape is the full type when no extras are passed.
export function classificationTypeOutput<C extends z.ZodTypeAny>(
  classification: C,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; classification: C }>;
export function classificationTypeOutput(classification: z.ZodTypeAny, fields?: z.ZodRawShape) {
  assertNoReservedCollision(fields, CLASSIFICATION_HELPER_RESERVED_KEYS);
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
 * @param fields - Optional extras (e.g. classification alongside instructions)
 * merged into the output.
 * @returns A `z.object` carrying `ok`, `message`, `instructions`, and extras.
 * @throws `RangeError` when `fields` redeclares `ok`, `message` or `instructions`.
 */
export function procedureTypeOutput<T extends z.ZodRawShape = Record<never, never>>(
  fields: T & NoReserved<ReservedKey<typeof PROCEDURE_RESERVED_KEYS>>,
): z.ZodObject<{ ok: z.ZodLiteral<true>; message: z.ZodString; instructions: z.ZodString } & T>;
// No-arg overload intentionally omits `& T` — the base shape is the full type when no extras are passed.
export function procedureTypeOutput(): z.ZodObject<{
  ok: z.ZodLiteral<true>;
  message: z.ZodString;
  instructions: z.ZodString;
}>;
export function procedureTypeOutput(fields?: z.ZodRawShape) {
  assertNoReservedCollision(fields, PROCEDURE_RESERVED_KEYS);
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
