/**
 * types.ts — Public interfaces for the code-first-agents Tool base class.
 *
 * Kept pure: no imports beyond `zod`, no runtime logic. Consumers of the
 * `Tool` class type their code against these.
 *
 * @module code-first-agents-tool/types
 */

import type { z } from "zod";

/** Metadata describing the tool itself. Used in help output. */
export interface ToolMeta {
  /** Tool identifier (usually matches the filename stem). */
  name: string;
  /** One-line human description shown in help output. */
  description: string;
}

/**
 * Raw CLI args after parsing. Flags are `--key value` pairs; bare `--flag`
 * (with no following value) resolves to `true`. Positional args are any
 * tokens that don't start with `--`.
 *
 * **`_` is reserved:** at validation time positional args are attached under
 * the `_` key, so an explicit `--_` flag is overwritten by positionals when
 * both are present (a stderr warning is emitted in that case).
 */
export interface ParsedArgs {
  /**
   * Flag key → value mapping. Last-one-wins on repeated keys. The `_` key is
   * reserved for positional args and should not be used as a flag name.
   */
  flags: Record<string, string | true>;
  /** Positional (non-flag) tokens in order. */
  positional: string[];
}

/**
 * What a handler is expected to return: the output shape **without** `ok`.
 * The base class stamps `ok: true` onto the result before output validation,
 * so handlers stay focused on `message` + business data. This also avoids
 * TypeScript widening `ok: true` to `boolean` in object-literal returns.
 */
export type HandlerReturn<O extends z.ZodTypeAny> = Omit<z.infer<O>, "ok">;

/**
 * A registered subcommand spec. Both `input` and `output` Zod schemas are
 * required — they validate CLI args before the handler runs and the
 * handler's return value before emit.
 *
 * @typeParam I - Input Zod schema type
 * @typeParam O - Output Zod schema type
 */
export interface SubcommandSpec<I extends z.ZodTypeAny, O extends z.ZodTypeAny> {
  /** Subcommand name as it appears on the CLI (e.g. "classify"). */
  name: string;
  /** One-line description shown in help output. */
  description: string;
  /**
   * Zod schema for the validated flags + positional args. Positional args
   * are exposed under a reserved `_` key when present — declare `_` in the
   * schema to consume them. Avoid declaring a `--_` flag: positionals
   * overwrite it (with a stderr warning). Use `.strict()` to reject unknown
   * flags loudly.
   *
   * **Sync only:** the base class uses `safeParse` (not `safeParseAsync`).
   * Schemas with `.refine(async ...)` or `.transform(async ...)` will cause
   * a hard runtime throw at dispatch time (caught by the outer `unexpected_error`
   * envelope, but with a cryptic message). Use synchronous validators only.
   */
  input: I;
  /**
   * Zod schema for the full output envelope, including `ok: z.literal(true)`
   * and `message: z.string()`. Composing this by hand is the low-level path —
   * prefer the per-type registration methods, which build the envelope for you
   * from the fields you declare.
   * The handler returns everything **except** `ok`; the base class adds it.
   *
   * **Sync only:** same constraint as `input` — no async transforms or refinements.
   */
  output: O;
  /**
   * Business logic. Receives the validated, typed input. Returns the output
   * shape **without** `ok` — the base class adds `ok: true` before validating
   * against the output schema. May return a plain value or a Promise.
   */
  handler: (args: z.infer<I>) => HandlerReturn<O> | Promise<HandlerReturn<O>>;
}

/**
 * Raw shape constraint for **Classification** outputs: the `classification`
 * key is mandatory. Omitting it from the `output` shape passed to
 * {@link Tool.classificationSubcommand} is a compile error.
 *
 * The enum itself is the subcommand author's choice, which is why it lives in
 * `output` alongside the extras — unlike `ok`, `message` and `instructions`,
 * which are fixed by the envelope and never declared.
 */
export type ClassificationShape = z.ZodRawShape & { classification: z.ZodTypeAny };

/**
 * The composed output schema {@link Tool.dataSubcommand} registers:
 * the envelope plus the author's raw fields.
 *
 * @typeParam S - The raw shape passed as `output`.
 */
export type DataTypeSchema<S extends z.ZodRawShape> = z.ZodObject<
  { ok: z.ZodLiteral<true>; message: z.ZodString } & S
>;

/**
 * The composed output schema {@link Tool.classificationSubcommand}
 * registers. `classification` already lives inside `S`, so no split is needed
 * at the type level.
 *
 * @typeParam S - The raw shape passed as `output`, carrying `classification`.
 */
export type ClassificationTypeSchema<S extends ClassificationShape> = z.ZodObject<
  { ok: z.ZodLiteral<true>; message: z.ZodString } & S
>;

/**
 * The composed output schema {@link Tool.procedureSubcommand} registers.
 * `instructions` is always `z.string()`, so it is baked in here rather than
 * declared by the author.
 *
 * @typeParam S - The raw shape passed as `output` (extras only).
 */
export type ProcedureTypeSchema<S extends z.ZodRawShape> = z.ZodObject<
  { ok: z.ZodLiteral<true>; message: z.ZodString; instructions: z.ZodString } & S
>;

/**
 * Spec for {@link Tool.dataSubcommand}. Identical to
 * {@link SubcommandSpec} except that `output` is a raw Zod **shape** carrying
 * only the fields this subcommand returns — the `ok`/`message` envelope is
 * composed for you.
 *
 * @typeParam I - Input Zod schema type
 * @typeParam S - Raw output shape (accepts `{}` for an envelope-only output)
 */
export interface DataTypeSubcommandSpec<I extends z.ZodTypeAny, S extends z.ZodRawShape> {
  /** Subcommand name as it appears on the CLI (e.g. "stats"). */
  name: string;
  /** One-line description shown in help output. */
  description: string;
  /** Zod schema for the validated flags + positional args. See {@link SubcommandSpec.input}. */
  input: I;
  /** Raw data fields to emit alongside the envelope. Pass `{}` for envelope-only output. */
  output: S;
  /**
   * Business logic. Returns `message` plus the declared fields — never `ok`,
   * which the base class stamps before output validation.
   */
  handler: (
    args: z.infer<I>,
  ) => HandlerReturn<DataTypeSchema<S>> | Promise<HandlerReturn<DataTypeSchema<S>>>;
}

/**
 * Spec for {@link Tool.classificationSubcommand}. `output` must declare a
 * `classification` key — the enum is the author's choice — and may carry extras
 * alongside it.
 *
 * @typeParam I - Input Zod schema type
 * @typeParam S - Raw output shape, required to include `classification`
 */
export interface ClassificationTypeSubcommandSpec<
  I extends z.ZodTypeAny,
  S extends ClassificationShape,
> {
  /** Subcommand name as it appears on the CLI (e.g. "size"). */
  name: string;
  /** One-line description shown in help output. */
  description: string;
  /** Zod schema for the validated flags + positional args. See {@link SubcommandSpec.input}. */
  input: I;
  /** The required `classification` schema plus any extras (e.g. a score, raw signals). */
  output: S;
  /**
   * Business logic. Returns `message`, `classification` and the declared
   * extras — never `ok`, which the base class stamps before output validation.
   */
  handler: (
    args: z.infer<I>,
  ) =>
    | HandlerReturn<ClassificationTypeSchema<S>>
    | Promise<HandlerReturn<ClassificationTypeSchema<S>>>;
}

/**
 * Spec for {@link Tool.procedureSubcommand}. `output` is optional because
 * the required `instructions` string is composed for you — pass a shape only
 * when the subcommand emits extras alongside it.
 *
 * @typeParam I - Input Zod schema type
 * @typeParam S - Raw output shape for extras beyond `instructions`
 */
export interface ProcedureTypeSubcommandSpec<I extends z.ZodTypeAny, S extends z.ZodRawShape> {
  /** Subcommand name as it appears on the CLI (e.g. "review-plan"). */
  name: string;
  /** One-line description shown in help output. */
  description: string;
  /** Zod schema for the validated flags + positional args. See {@link SubcommandSpec.input}. */
  input: I;
  /** Extras to emit alongside `instructions`. Omit entirely when there are none. */
  output?: S;
  /**
   * Business logic. Returns `message`, `instructions` and the declared
   * extras — never `ok`, which the base class stamps before output validation.
   */
  handler: (
    args: z.infer<I>,
  ) => HandlerReturn<ProcedureTypeSchema<S>> | Promise<HandlerReturn<ProcedureTypeSchema<S>>>;
}
