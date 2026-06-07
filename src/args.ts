/**
 * args.ts — CLI argv parsing and input validation for the Tool base class.
 *
 * Contains only the pre-dispatch concerns: turning `process.argv.slice(2)`
 * into a structured `{subcommand, ParsedArgs}` pair and validating the
 * parsed args against a subcommand's Zod input schema.
 *
 * @module code-first-agents-tool/args
 */

import type { z } from "zod";
import type { ParsedArgs } from "./types";

/**
 * Subcommand names reserved by the base class (`schema`, `help`).
 * Module-private: not re-exported from `./index.ts`.
 */
export const RESERVED_SUBCOMMANDS: ReadonlySet<string> = new Set(["schema", "help"]);

/**
 * Normalize the subcommand token: strip a leading `--` prefix so that both
 * `help` and `--help` resolve to the same subcommand name. The bare `--`
 * sentinel and `undefined` both return an empty string (no subcommand).
 *
 * Only a single `--` prefix is stripped: `---help` normalizes to `-help`
 * (not `help`), which will be rejected as an unknown subcommand.
 *
 * @param raw - The raw first token from argv (may be `undefined`).
 * @returns The normalized subcommand name, or empty string.
 */
function normalizeSubcommand(raw: string | undefined): string {
  if (raw === undefined || raw === "--") return "";
  return raw.startsWith("--") ? raw.slice(2) : raw;
}

/**
 * Parse a raw argv slice into subcommand + typed flags + positional args.
 *
 * Rules:
 * - `argv[0]` is the subcommand. A leading `--` prefix is stripped so that
 *   `--help` and `help` both resolve to `"help"`. The bare `--` sentinel
 *   yields an empty subcommand.
 * - When `argv[0]` is NOT already a reserved builtin, a `--help` or
 *   `--schema` flag in the remaining tokens (up to the `--` sentinel)
 *   promotes to the subcommand (global-flag override).
 * - Tokens starting with `--` are flag keys; the next token (if not also a
 *   flag) is the value. A bare `--flag` at end-of-argv or followed by
 *   another `--flag` resolves to `true`.
 * - Repeated `--flag v1 --flag v2` → last-one-wins (`v2`).
 * - The bare `--` token is the end-of-options sentinel (POSIX convention):
 *   all subsequent tokens become positional, even if they start with `--`.
 * - Non-flag tokens become positional args in order.
 *
 * Pure function — no I/O, no side effects.
 *
 * @param argv - Array of CLI tokens, typically `process.argv.slice(2)`.
 * @returns Parsed subcommand + {@link ParsedArgs}.
 */
export function parseArgs(argv: string[]): { subcommand: string; parsed: ParsedArgs } {
  let subcommand = normalizeSubcommand(argv[0]);
  const flags: Record<string, string | true> = {};
  const positional: string[] = [];

  let i = 1;
  while (i < argv.length) {
    // biome-ignore lint/style/noNonNullAssertion: loop guard `i < argv.length` ensures defined
    const tok = argv[i]!;

    // End-of-options sentinel (POSIX convention): all remaining tokens are positional.
    if (tok === "--") {
      positional.push(...argv.slice(i + 1));
      break;
    }

    if (!tok.startsWith("--")) {
      positional.push(tok);
      i += 1;
      continue;
    }

    const key = tok.slice(2);

    // Global-flag override: --help or --schema promotes to subcommand,
    // but only when argv[0] was not already an explicit builtin.
    if (RESERVED_SUBCOMMANDS.has(key) && !RESERVED_SUBCOMMANDS.has(subcommand)) {
      subcommand = key;
      i += 1;
      continue;
    }

    const next = argv[i + 1];

    if (next === undefined || next.startsWith("--")) {
      flags[key] = true;
      i += 1;
      continue;
    }

    flags[key] = next;
    i += 2;
  }

  return { subcommand, parsed: { flags, positional } };
}

/**
 * Validate raw {@link ParsedArgs} against a subcommand's input Zod schema.
 * Flags are merged as-is; positional args are attached under a reserved `_`
 * key only when present (so strict schemas without `_` stay happy when no
 * positional args are passed).
 *
 * @param parsed - Raw parsed args from {@link parseArgs}.
 * @param inputSchema - The subcommand's input Zod schema.
 * @returns The Zod `safeParse` result carrying either validated data or a structured error.
 */
export function validateInput<I extends z.ZodTypeAny>(parsed: ParsedArgs, inputSchema: I) {
  const toValidate: Record<string, unknown> = { ...parsed.flags };
  if (parsed.positional.length > 0) {
    toValidate._ = parsed.positional;
  }
  return inputSchema.safeParse(toValidate);
}
