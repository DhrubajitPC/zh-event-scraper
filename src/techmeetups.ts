import type { NormalizedEvent } from "./schema/index.ts";

export const TECHMEETUPS_SINGAPORE_URL = "https://techmeetups.io/singapore";
const TECHMEETUPS_ITEM_LIST_NAME = "Upcoming Tech Events in Singapore";
const SINGAPORE_CITY = "Singapore";
const SINGAPORE_COUNTRY = "SG";
const SINGAPORE_OFFSET = "+08:00";

type JsonObject = Record<string, unknown>;

export type TechMeetupsEvent = {
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
  eventStatus: string | null;
  eventAttendanceMode: string | null;
  location: {
    name: string | null;
    address: string | null;
    city: string;
    country: string;
    online: boolean;
  };
  organizerName: string | null;
  url: string;
};

function isObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [value];
}

function readString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Expected ${field} to be a non-empty string`);
  }
  return value;
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value;
}

function typeIncludes(value: unknown, expected: string): boolean {
  return asArray(value).some((item) => item === expected);
}

function extractJsonLdEntries(html: string): unknown[] {
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  const entries: unknown[] = [];

  for (const match of matches) {
    const rawJson = match[1]?.trim();
    if (!rawJson) continue;
    const parsed = JSON.parse(rawJson) as unknown;
    entries.push(...asArray(parsed));
  }

  return entries;
}

function extractPostalAddress(address: unknown): {
  address: string | null;
  city: string;
  country: string;
} {
  if (!isObject(address)) {
    return {
      address: null,
      city: SINGAPORE_CITY,
      country: SINGAPORE_COUNTRY,
    };
  }

  const street = readOptionalString(address["streetAddress"]);
  const city = readOptionalString(address["addressLocality"]) ?? SINGAPORE_CITY;
  const country =
    readOptionalString(address["addressCountry"]) ?? SINGAPORE_COUNTRY;

  return {
    address: street,
    city,
    country,
  };
}

function parseLocation(
  location: unknown,
  eventAttendanceMode: string | null,
): TechMeetupsEvent["location"] {
  const online =
    eventAttendanceMode === "https://schema.org/OnlineEventAttendanceMode";

  if (!isObject(location)) {
    return {
      name: online ? "Online" : null,
      address: null,
      city: SINGAPORE_CITY,
      country: SINGAPORE_COUNTRY,
      online,
    };
  }

  const name = readOptionalString(location["name"]);
  const postalAddress = extractPostalAddress(location["address"]);

  return {
    name: name ?? (online ? "Online" : null),
    address: postalAddress.address,
    city: postalAddress.city,
    country: postalAddress.country,
    online,
  };
}

function ensureSingaporeTimestamp(value: string, field: string): string {
  const trimmed = value.trim();
  if (!trimmed.endsWith(SINGAPORE_OFFSET)) {
    throw new Error(`Expected ${field} to use the Singapore offset`);
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/.test(trimmed)) {
    return trimmed;
  }

  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}\+08:00$/.test(trimmed)) {
    return trimmed.replace("+08:00", `:00${SINGAPORE_OFFSET}`);
  }

  throw new Error(`Expected ${field} to be an ISO 8601 Singapore timestamp`);
}

function formatSingaporeNow(now: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: Intl.DateTimeFormatPartTypes): string => {
    const value = parts.find((part) => part.type === type)?.value;
    if (!value) throw new Error(`Missing date part: ${type}`);
    return value;
  };

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}:${get("second")}${SINGAPORE_OFFSET}`;
}

function humanizeSchemaValue(value: string | null): string | null {
  if (!value) return null;
  const tail = value.split("/").at(-1) ?? value;
  return tail.replace(/([a-z])([A-Z])/g, "$1 $2");
}

function buildDescription(event: TechMeetupsEvent): string {
  const lines = [event.name];
  const organizer = event.organizerName
    ? `Organized by ${event.organizerName}.`
    : null;
  const status = humanizeSchemaValue(event.eventStatus);
  const attendance = humanizeSchemaValue(event.eventAttendanceMode);

  if (organizer) lines.push(organizer);
  if (status) lines.push(`Status: ${status}.`);
  if (attendance) lines.push(`Attendance: ${attendance}.`);

  return lines.join("\n\n");
}

function extractSourceEventId(url: string): string {
  const parsed = new URL(url);
  const path = parsed.pathname.replace(/\/+$/, "");
  return `${parsed.hostname}${path}${parsed.search}`;
}

export function extractFirstTechMeetupsSingaporeEvent(html: string): TechMeetupsEvent {
  const itemList = extractJsonLdEntries(html).find((entry) => {
    if (!isObject(entry)) return false;
    return (
      typeIncludes(entry["@type"], "ItemList") &&
      entry["name"] === TECHMEETUPS_ITEM_LIST_NAME
    );
  });

  if (!isObject(itemList)) {
    throw new Error("Could not find the Singapore TechMeetups ItemList JSON-LD");
  }

  const rawFirstItem = asArray(itemList["itemListElement"])[0];
  const rawEvent =
    isObject(rawFirstItem) && isObject(rawFirstItem["item"])
      ? rawFirstItem["item"]
      : rawFirstItem;

  if (!isObject(rawEvent) || !typeIncludes(rawEvent["@type"], "Event")) {
    throw new Error("Could not find the first Event inside itemListElement");
  }

  const name = readString(rawEvent["name"], "event.name");
  const eventStatus = readOptionalString(rawEvent["eventStatus"]);
  const eventAttendanceMode = readOptionalString(rawEvent["eventAttendanceMode"]);
  const location = parseLocation(rawEvent["location"], eventAttendanceMode);
  const organizerName = isObject(rawEvent["organizer"])
    ? readOptionalString(rawEvent["organizer"]["name"])
    : null;

  return {
    name,
    description: "",
    startDate: ensureSingaporeTimestamp(
      readString(rawEvent["startDate"], "event.startDate"),
      "event.startDate",
    ),
    endDate: (() => {
      const endDate = readOptionalString(rawEvent["endDate"]);
      return endDate ? ensureSingaporeTimestamp(endDate, "event.endDate") : null;
    })(),
    eventStatus,
    eventAttendanceMode,
    location,
    organizerName,
    url: readString(rawEvent["url"], "event.url"),
  };
}

export function normalizeTechMeetupsEvent(
  event: TechMeetupsEvent,
  now: Date,
): NormalizedEvent {
  const source = "techmeetups";
  const sourceEventId = extractSourceEventId(event.url);
  const timestamp = formatSingaporeNow(now);

  return {
    id: `${source}:${sourceEventId}`,
    title: event.name,
    description: buildDescription(event),
    startDate: event.startDate,
    endDate: event.endDate,
    venue: {
      name: event.location.name ?? event.organizerName ?? "Singapore",
      address: event.location.address,
      city: event.location.city,
      country: event.location.country,
      online: event.location.online,
    },
    source,
    sourceEventId,
    sourceUrl: event.url,
    lowConfidence: false,
    categories: [],
    whyIncluded: "Upcoming tech event listed on TechMeetups.io Singapore.",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function slugifyEventId(sourceEventId: string): string {
  return sourceEventId
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
