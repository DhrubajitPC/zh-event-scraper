import { parseNormalizedEvent } from "./validate.ts";
import type { NormalizedEvent } from "./types.ts";

function quoteIfNeeded(value: string): string {
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

function serializeNullable(value: string | null): string {
  if (value === null) return "~";
  return quoteIfNeeded(value);
}

function serializeArray(items: string[]): string {
  if (items.length === 0) return "[]";
  return "\n" + items.map((item) => `  - ${quoteIfNeeded(item)}`).join("\n");
}

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

function parseFrontmatter(yaml: string): ParsedFrontmatter {
  const result: ParsedFrontmatter = {};
  const lines = yaml.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === "") {
      i++;
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIdx).trim();
    const rest = line.slice(colonIdx + 1);

    if (rest.trim() === "[]") {
      result[key] = [];
      i++;
      continue;
    }

    if (rest.trim() === "") {
      const items: string[] = [];
      i++;
      while (i < lines.length && /^\s{2}-\s/.test(lines[i])) {
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

export function deserializeEvent(markdown: string): NormalizedEvent {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(normalized);
  if (!match) {
    throw new Error(
      "Invalid event markdown: expected YAML frontmatter delimited by `---`",
    );
  }

  const [, yamlBlock, rawBody] = match;
  const body = rawBody.startsWith("\n") ? rawBody.slice(1) : rawBody;
  const fm = parseFrontmatter(yamlBlock);

  const raw = {
    id: fm["id"],
    title: fm["title"],
    description: body,
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
