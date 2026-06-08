/**
 * index.ts — Barrel for the code-first-agents Tool base class.
 *
 * Implementation lives in `src/*.ts`. This file re-exports the public API
 * so consumers import from the package root:
 *
 *   import { Tool, l1Output, parseArgs, validateInput } from "@code-first-agents/tool";
 *
 * @module @code-first-agents/tool
 */

export { parseArgs, validateInput } from "./args";
export type { ErrorEnvelope } from "./envelopes";
export { ToolError } from "./envelopes";
export type { JSONSchemaResult } from "./json-schema";
export { l1Output, l2Output, l3Output } from "./output-helpers";
export { Tool } from "./tool-class";
export type {
  HandlerReturn,
  ParsedArgs,
  SubcommandSpec,
  ToolMeta,
} from "./types";
export type { ToolOutput } from "./utils";
export { jsonOutput, stringifyError } from "./utils";
