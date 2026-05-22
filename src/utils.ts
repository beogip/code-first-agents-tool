/** Standard JSON envelope for all tool stdout output. */
export type ToolOutput = { ok: boolean; message: string; [key: string]: unknown };

/**
 * Print a {@link ToolOutput} as JSON to stdout and terminate with exit code 0.
 * @param data - The tool output envelope to serialize.
 * @returns Never — the process exits.
 */
export function jsonOutput(data: ToolOutput): never {
  // biome-ignore lint/suspicious/noConsole: designated tool output channel
  console.log(JSON.stringify(data));
  process.exit(0);
}

/**
 * Extract a human-readable message from an unknown thrown value. Preserves
 * the `Error.message` when available; otherwise coerces via `String(...)`.
 * @param err - The caught value (Error instance, string, null, etc.).
 * @returns A non-undefined string suitable for envelope `message` / log output.
 */
export function stringifyError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
