/**
 * Markdown ⇄ NormalizedEvent serialization.
 *
 * Storage format
 * ──────────────
 * Each NormalizedEvent is stored as a single `.md` file:
 *
 *   ---
 *   id: meetup:300123456
 *   title: "Tech Networking Night"
 *   start_date: "2026-07-15T18:00:00+08:00"
 *   end_date: "2026-07-15T21:00:00+08:00"
 *   venue_name: "The Working Capitol"
 *   venue_address: "140 Robinson Rd"
 *   venue_city: Singapore
 *   venue_country: SG
 *   venue_online: false
 *   source: meetup
 *   source_event_id: "300123456"
 *   source_url: https://www.meetup.com/sg-tech/events/300123456
 *   low_confidence: false
 *   categories:
 *     - tech
 *     - networking
 *   why_included: "Relevant to engineers in Singapore"
 *   created_at: "2026-07-08T00:00:00+08:00"
 *   updated_at: "2026-07-08T00:00:00+08:00"
 *   ---
 *
 *   Full event description in Markdown.
 *
 * The YAML subset used is deliberately narrow so no external YAML library is
 * needed:
 *   • Scalar strings  — optionally double-quoted
 *   • Booleans        — bare `true` or `false`
 *   • Null            — bare `~` or absent key
 *   • String arrays   — block sequence (`  - item`)
 */

import { parseNormalizedEvent } from "./event.ts";
import type { NormalizedEvent } from "./event.ts";

// ---------------------------------------------------------------------------
// Serialization helpers
// ---------------------------------------------------------------------------

/** Quote a string value only when necessary. */
function quoteIfNeeded(value: string): string {
  // Quote if empty, contains special YAML characters, or starts/ends with whitespace.
  if (
    value === "" ||
    /[:#[\]{}&*!|>'"%@`,]/.test(value) ||
    value !== value.trim() ||
    value === "true" ||
    value === "false" ||
    value === "~" ||
    value === "null"
  ) {
    return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  }
  return value;
}

/** Serialize a nullable string frontmatter field. */
function serializeNullable(value: string | null): string {
  if (value === null) return "~";
  return quoteIfNeeded(value);
}

/** Serialize a string array as a YAML block sequence. */
function serializeArray(items: string[]): string {
  if (items.length === 0) return "[]";
  return "\n" + items.map((item) => `  - ${quoteIfNeeded(item)}`).join("\n");
}

// ---------------------------------------------------------------------------
// Public API — serialize
// ---------------------------------------------------------------------------

/**
 * Serialize a NormalizedEvent to a Markdown string with YAML frontmatter.
 *
 * The `description` field becomes the Markdown body; all other fields become
 * frontmatter entries.
 */
export function serializeEvent(event: NormalizedEvent): string {
  const lines: string[] = [
    "---",
    `id: ${quoteIfNeeded(event.id)}`,
    `title: ${quoteIfNeeded(event.title)}`,
    `start_date: ${quoteIfNeeded(event.startDate)}`,
    `end_date: ${serializeNullable(event.endDate)}`,
    `venue_name: ${quoteIfNeeded(event.venue.name)}`,
    `venue_address: ${serializeNullable(event.venue.address)}`,
    `venue_city: ${quoteIfNeeded(event.venue.city)}`,
    `venue_country: ${quoteIfNeeded(event.venue.country)}`,
    `venue_online: ${String(event.venue.online)}`,
    `source: ${quoteIfNeeded(event.source)}`,
    `source_event_id: ${quoteIfNeeded(event.sourceEventId)}`,
    `source_url: ${quoteIfNeeded(event.sourceUrl)}`,
    `low_confidence: ${String(event.lowConfidence)}`,
    `categories: ${serializeArray(event.categories)}`,
    `why_included: ${quoteIfNeeded(event.whyIncluded)}`,
    `created_at: ${quoteIfNeeded(event.createdAt)}`,
    `updated_at: ${quoteIfNeeded(event.updatedAt)}`,
    "---",
    "",
    event.description,
  ];

  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Deserialization helpers
// ---------------------------------------------------------------------------

/** Unquote a double-quoted string; return bare value unchanged. */
function unquote(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed
      .slice(1, -1)
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }
  return trimmed;
}

/** Parse a scalar YAML value to string, boolean, or null. */
function parseScalar(raw: string): string | boolean | null {
  const trimmed = raw.trim();
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (trimmed === "~" || trimmed === "null") return null;
  return unquote(trimmed);
}

type FrontmatterValue = string | boolean | null | string[];

interface ParsedFrontmatter {
  [key: string]: FrontmatterValue;
}

/**
 * Parse the narrow YAML subset used in event frontmatter.
 * Supports: scalars (string / bool / null) and block-sequence string arrays.
 */
function parseFrontmatter(yaml: string): ParsedFrontmatter {
  const result: ParsedFrontmatter = {};
  const lines = yaml.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Skip blank lines
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Top-level key: value
    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1);

    // Check for inline empty array `[]`
    if (rest.trim() === "[]") {
      result[key] = [];
      i++;
      continue;
    }

    // Check if the value is a block sequence (nothing after the colon, next
    // lines start with `  - `).
    if (rest.trim() === "") {
      const items: string[] = [];
      i++;
      while (i < lines.length && /^\s{2}-\s/.test(lines[i])) {
        // Extract the item after `  - `
        const itemRaw = lines[i].replace(/^\s{2}-\s/, "");
        items.push(unquote(itemRaw.trim()));
        i++;
      }
      result[key] = items;
      continue;
    }

    result[key] = parseScalar(rest);
    i++;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Public API — deserialize
// ---------------------------------------------------------------------------

/**
 * Parse a Markdown string (YAML frontmatter + body) into a NormalizedEvent.
 *
 * @throws {Error} when the frontmatter delimiters are missing or malformed.
 * @throws {SchemaValidationError} when any required field is absent or invalid.
 */
export function deserializeEvent(markdown: string): NormalizedEvent {
  // Split on the frontmatter delimiters `---`.
  // Allow for an optional leading newline after the opening `---`.
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(markdown.trim());
  if (!match) {
    throw new Error(
      "Invalid event markdown: expected YAML frontmatter delimited by `---`",
    );
  }

  const [, yamlBlock, body] = match;
  const fm = parseFrontmatter(yamlBlock);

  // Reconstruct the NormalizedEvent shape from flat frontmatter keys.
  const raw = {
    id: fm["id"],
    title: fm["title"],
    description: body.trim(),
    startDate: fm["start_date"],
    endDate: fm["end_date"],
    venue: {
      name: fm["venue_name"],
      address: fm["venue_address"],
      city: fm["venue_city"],
      country: fm["venue_country"],
      online: fm["venue_online"],
    },
    source: fm["source"],
    sourceEventId: fm["source_event_id"],
    sourceUrl: fm["source_url"],
    lowConfidence: fm["low_confidence"],
    categories: fm["categories"] ?? [],
    whyIncluded: fm["why_included"],
    createdAt: fm["created_at"],
    updatedAt: fm["updated_at"],
  };

  return parseNormalizedEvent(raw);
}
