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
   * Zod schema for the full output envelope (including `ok: z.literal(true)`
   * and `message: z.string()`). Use the level helpers `l1Output` / `l2Output`
   * / `l3Output` to get the envelope baked in, or pass a raw `z.object`.
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
