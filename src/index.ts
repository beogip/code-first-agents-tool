/**
 * index.ts — Barrel for the code-first-agents Tool base class.
 *
 * Implementation lives in `src/*.ts`. This file re-exports the public API
 * so consumers import from the package root:
 *
 *   import { Tool, l1Output, l2Output, l3Output } from "@code-first-agents/tool";
 *
 * @module @code-first-agents/tool
 */

export type { ErrorEnvelope } from "./envelopes.ts";
export { ToolError } from "./envelopes.ts";
export type {
  HelpPayload,
  HelpPayloadEntry,
  SchemaOutputEntry,
} from "./introspection.ts";
export { buildHelpPayload, buildSchemaOutput } from "./introspection.ts";
export type { JSONSchemaResult } from "./json-schema.ts";
export { l1Output, l2Output, l3Output } from "./output-helpers.ts";
export { Tool } from "./tool-class.ts";
export type {
  HandlerReturn,
  ParsedArgs,
  SubcommandSpec,
  ToolMeta,
} from "./types.ts";
export type { ToolOutput } from "./utils.ts";
