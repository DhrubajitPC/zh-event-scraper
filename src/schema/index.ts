/**
 * Single entry point for the shared event schema.
 *
 * Import types and utilities from here in both the pipeline and the UI:
 *
 *   import type { NormalizedEvent, RawEventRecord, Venue } from "@/schema";
 *   import { parseNormalizedEvent, serializeEvent, deserializeEvent } from "@/schema";
 */

export type { NormalizedEvent, RawEventRecord, Venue } from "./event.ts";
export {
  SchemaValidationError,
  validateNormalizedEvent,
  parseNormalizedEvent,
  parseRawEventRecord,
} from "./event.ts";
export { serializeEvent, deserializeEvent } from "./markdown.ts";
