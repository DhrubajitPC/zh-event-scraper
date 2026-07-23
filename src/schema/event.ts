/**
 * Shared event schema — consumed by the scraper pipeline and the UI.
 *
 * Field-by-field documentation
 * ─────────────────────────────
 * RawEventRecord
 *   source         — Identifier of the originating platform (e.g. "meetup", "eventbrite", "luma").
 *   sourceEventId  — Platform-native event ID (used for deduplication within a source).
 *   sourceUrl      — Canonical URL to the original listing page.
 *   rawTitle       — Event title exactly as returned by the source, before any normalisation.
 *   rawDescription — Event description/body exactly as returned by the source.
 *   rawStart       — Start date/time string exactly as returned by the source (unparsed).
 *   rawEnd         — End date/time string as returned by the source; null when absent.
 *   rawLocation    — Location/venue string as returned by the source; null when absent.
 *   scrapedAt      — ISO 8601 timestamp (UTC) at which the record was scraped.
 *
 * Venue
 *   name           — Human-readable venue name (e.g. "Marina Bay Sands Expo").
 *   address        — Street address; null for fully online events.
 *   city           — City; "Singapore" for in-person SG events.
 *   country        — ISO 3166-1 alpha-2 country code (e.g. "SG").
 *   online         — true when the event is fully online (Zoom, Teams, etc.).
 *
 * NormalizedEvent
 *   id             — Stable unique identifier for this event record (source + ":" + sourceEventId).
 *   title          — Cleaned, human-readable event title.
 *   description    — Cleaned event description in plain text or Markdown.
 *   startDate      — ISO 8601 date-time in Asia/Singapore offset (+08:00).
 *   endDate        — ISO 8601 date-time in Asia/Singapore offset (+08:00); null when unknown.
 *   venue          — Structured venue object (see Venue above).
 *   source         — Originating platform identifier (mirrors RawEventRecord.source).
 *   sourceEventId  — Platform-native event ID (mirrors RawEventRecord.sourceEventId).
 *   sourceUrl      — Canonical URL to the original listing (mirrors RawEventRecord.sourceUrl).
 *   lowConfidence  — true when relevance to Singapore professionals is uncertain.
 *   categories     — Ordered list of category/tag strings (placeholder for Phase 2 tagging).
 *   whyIncluded    — One-sentence explanation of why this event was included in the digest.
 *   createdAt      — ISO 8601 timestamp (Asia/Singapore) when this record was first created.
 *   updatedAt      — ISO 8601 timestamp (Asia/Singapore) when this record was last updated.
 */

/** Raw event data as scraped from a source platform, before normalisation. */
export type RawEventRecord = {
  /** Originating platform (e.g. "meetup", "eventbrite", "luma"). */
  source: string;
  /** Platform-native event ID. */
  sourceEventId: string;
  /** Canonical URL to the original listing. */
  sourceUrl: string;
  /** Event title exactly as returned by the source. */
  rawTitle: string;
  /** Event description/body exactly as returned by the source. */
  rawDescription: string;
  /** Start date/time string exactly as returned by the source. */
  rawStart: string;
  /** End date/time string as returned by the source; null when absent. */
  rawEnd: string | null;
  /** Location/venue string as returned by the source; null when absent. */
  rawLocation: string | null;
  /** ISO 8601 timestamp (UTC) at which the record was scraped. */
  scrapedAt: string;
};

/** Structured venue information for a NormalizedEvent. */
export type Venue = {
  /** Human-readable venue name. */
  name: string;
  /** Street address; null for fully online events. */
  address: string | null;
  /** City (typically "Singapore" for in-person SG events). */
  city: string;
  /** ISO 3166-1 alpha-2 country code (e.g. "SG"). */
  country: string;
  /** true when the event is fully online. */
  online: boolean;
};

/**
 * Normalised event record — the shared contract between the scraper pipeline and the UI.
 *
 * Dates are ISO 8601 strings with the Asia/Singapore UTC offset (+08:00) so
 * they are human-readable and unambiguous without a separate timezone field.
 */
export type NormalizedEvent = {
  /** Stable unique identifier: "<source>:<sourceEventId>". */
  id: string;
  /** Cleaned, human-readable event title. */
  title: string;
  /** Cleaned event description in plain text or Markdown. */
  description: string;
  /** ISO 8601 date-time in Asia/Singapore (+08:00). */
  startDate: string;
  /** ISO 8601 date-time in Asia/Singapore (+08:00); null when unknown. */
  endDate: string | null;
  /** Structured venue. */
  venue: Venue;
  /** Originating platform identifier. */
  source: string;
  /** Platform-native event ID. */
  sourceEventId: string;
  /** Canonical URL to the original listing. */
  sourceUrl: string;
  /**
   * true when the relevance of this event to Singapore professionals is uncertain.
   * Downstream steps may filter or flag these for human review.
   */
  lowConfidence: boolean;
  /**
   * Ordered list of category/tag strings.
   * Placeholder for Phase 2 categorisation — may be empty in the MVP.
   */
  categories: string[];
  /** One-sentence explanation of why this event was included in the digest. */
  whyIncluded: string;
  /** ISO 8601 timestamp (Asia/Singapore) when this record was first created. */
  createdAt: string;
  /** ISO 8601 timestamp (Asia/Singapore) when this record was last updated. */
  updatedAt: string;
};

// ---------------------------------------------------------------------------
// Runtime validation
// ---------------------------------------------------------------------------

/** Error thrown when a record does not conform to the schema. */
export class SchemaValidationError extends Error {
  readonly field: string;
  readonly received: unknown;

  constructor(message: string, field: string, received: unknown) {
    super(message);
    this.name = "SchemaValidationError";
    this.field = field;
    this.received = received;
  }
}

type ValidationResult =
  | { ok: true; value: NormalizedEvent }
  | { ok: false; error: SchemaValidationError };

function requireString(
  data: Record<string, unknown>,
  field: string,
): string | SchemaValidationError {
  const value = data[field];
  if (typeof value !== "string" || value.trim() === "") {
    return new SchemaValidationError(
      `Field "${field}" must be a non-empty string, got: ${JSON.stringify(value)}`,
      field,
      value,
    );
  }
  return value;
}

function requireNullableString(
  data: Record<string, unknown>,
  field: string,
): string | null | SchemaValidationError {
  const value = data[field];
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") {
    return new SchemaValidationError(
      `Field "${field}" must be a string or null, got: ${JSON.stringify(value)}`,
      field,
      value,
    );
  }
  return value;
}

function requireBoolean(
  data: Record<string, unknown>,
  field: string,
): boolean | SchemaValidationError {
  const value = data[field];
  if (typeof value !== "boolean") {
    return new SchemaValidationError(
      `Field "${field}" must be a boolean, got: ${JSON.stringify(value)}`,
      field,
      value,
    );
  }
  return value;
}

function requireStringArray(
  data: Record<string, unknown>,
  field: string,
): string[] | SchemaValidationError {
  const value = data[field];
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) {
    return new SchemaValidationError(
      `Field "${field}" must be an array of strings, got: ${JSON.stringify(value)}`,
      field,
      value,
    );
  }
  return value;
}

/**
 * ISO 8601 pattern with the Asia/Singapore UTC offset (+08:00 only).
 * All NormalizedEvent dates must carry this offset so they are unambiguous
 * without a separate timezone field.
 */
const SINGAPORE_UTC_OFFSET = "+08:00";
const ISO_8601_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;

/** ISO 8601 UTC timestamp pattern (Z suffix, e.g. 2026-07-08T03:00:00Z). */
const ISO_8601_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;

function requireIsoDate(
  data: Record<string, unknown>,
  field: string,
): string | SchemaValidationError {
  const value = requireString(data, field);
  if (value instanceof SchemaValidationError) return value;
  if (!ISO_8601_WITH_OFFSET.test(value)) {
    return new SchemaValidationError(
      `Field "${field}" must be an ISO 8601 date-time with the Asia/Singapore offset (${SINGAPORE_UTC_OFFSET}), e.g. 2026-07-15T18:00:00+08:00, got: ${JSON.stringify(value)}`,
      field,
      value,
    );
  }
  return value;
}

function requireNullableIsoDate(
  data: Record<string, unknown>,
  field: string,
): string | null | SchemaValidationError {
  const raw = requireNullableString(data, field);
  if (raw instanceof SchemaValidationError) return raw;
  if (raw === null) return null;
  if (!ISO_8601_WITH_OFFSET.test(raw)) {
    return new SchemaValidationError(
      `Field "${field}" must be an ISO 8601 date-time with the Asia/Singapore offset (${SINGAPORE_UTC_OFFSET}) or null, e.g. 2026-07-15T18:00:00+08:00, got: ${JSON.stringify(raw)}`,
      field,
      raw,
    );
  }
  return raw;
}

function parseVenue(
  data: Record<string, unknown>,
): Venue | SchemaValidationError {
  const venueRaw = data["venue"];
  if (
    venueRaw === null ||
    venueRaw === undefined ||
    typeof venueRaw !== "object" ||
    Array.isArray(venueRaw)
  ) {
    return new SchemaValidationError(
      `Field "venue" must be a Venue object, got: ${JSON.stringify(venueRaw)}`,
      "venue",
      venueRaw,
    );
  }
  const v = venueRaw as Record<string, unknown>;

  const name = requireString(v, "name");
  if (name instanceof SchemaValidationError)
    return new SchemaValidationError(
      `venue.${name.field}: ${name.message}`,
      `venue.${name.field}`,
      name.received,
    );

  const address = requireNullableString(v, "address");
  if (address instanceof SchemaValidationError)
    return new SchemaValidationError(
      `venue.${address.field}: ${address.message}`,
      `venue.${address.field}`,
      address.received,
    );

  const city = requireString(v, "city");
  if (city instanceof SchemaValidationError)
    return new SchemaValidationError(
      `venue.${city.field}: ${city.message}`,
      `venue.${city.field}`,
      city.received,
    );

  const country = requireString(v, "country");
  if (country instanceof SchemaValidationError)
    return new SchemaValidationError(
      `venue.${country.field}: ${country.message}`,
      `venue.${country.field}`,
      country.received,
    );

  const online = requireBoolean(v, "online");
  if (online instanceof SchemaValidationError)
    return new SchemaValidationError(
      `venue.${online.field}: ${online.message}`,
      `venue.${online.field}`,
      online.received,
    );

  return { name, address, city, country, online };
}

/**
 * Validate an unknown value as a NormalizedEvent.
 *
 * Returns a discriminated union so callers can handle errors without try/catch:
 *   const result = validateNormalizedEvent(data);
 *   if (!result.ok) throw result.error;
 */
export function validateNormalizedEvent(data: unknown): ValidationResult {
  if (
    data === null ||
    data === undefined ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    return {
      ok: false,
      error: new SchemaValidationError(
        `Expected a NormalizedEvent object, got: ${JSON.stringify(data)}`,
        "(root)",
        data,
      ),
    };
  }

  const d = data as Record<string, unknown>;

  const checks = [
    requireString(d, "id"),
    requireString(d, "title"),
    requireString(d, "description"),
    requireIsoDate(d, "startDate"),
    requireNullableIsoDate(d, "endDate"),
    parseVenue(d),
    requireString(d, "source"),
    requireString(d, "sourceEventId"),
    requireString(d, "sourceUrl"),
    requireBoolean(d, "lowConfidence"),
    requireStringArray(d, "categories"),
    requireString(d, "whyIncluded"),
    requireIsoDate(d, "createdAt"),
    requireIsoDate(d, "updatedAt"),
  ] as const;

  for (const check of checks) {
    if (check instanceof SchemaValidationError) {
      return { ok: false, error: check };
    }
  }

  const [
    id,
    title,
    description,
    startDate,
    endDate,
    venue,
    source,
    sourceEventId,
    sourceUrl,
    lowConfidence,
    categories,
    whyIncluded,
    createdAt,
    updatedAt,
  ] = checks as [
    string,
    string,
    string,
    string,
    string | null,
    Venue,
    string,
    string,
    string,
    boolean,
    string[],
    string,
    string,
    string,
  ];

  // Enforce the id invariant: id must equal "<source>:<sourceEventId>".
  const expectedId = `${source}:${sourceEventId}`;
  if (id !== expectedId) {
    return {
      ok: false,
      error: new SchemaValidationError(
        `Field "id" must be "${expectedId}" (<source>:<sourceEventId>), got: ${JSON.stringify(id)}`,
        "id",
        id,
      ),
    };
  }

  return {
    ok: true,
    value: {
      id,
      title,
      description,
      startDate,
      endDate,
      venue,
      source,
      sourceEventId,
      sourceUrl,
      lowConfidence,
      categories,
      whyIncluded,
      createdAt,
      updatedAt,
    },
  };
}

/**
 * Parse and validate a NormalizedEvent, throwing on any validation failure.
 *
 * @throws {SchemaValidationError} with an actionable message describing the invalid field.
 */
export function parseNormalizedEvent(data: unknown): NormalizedEvent {
  const result = validateNormalizedEvent(data);
  if (!result.ok) throw result.error;
  return result.value;
}

/**
 * Validate an unknown value as a RawEventRecord.
 *
 * @throws {SchemaValidationError} with an actionable message describing the invalid field.
 */
export function parseRawEventRecord(data: unknown): RawEventRecord {
  if (
    data === null ||
    data === undefined ||
    typeof data !== "object" ||
    Array.isArray(data)
  ) {
    throw new SchemaValidationError(
      `Expected a RawEventRecord object, got: ${JSON.stringify(data)}`,
      "(root)",
      data,
    );
  }

  const d = data as Record<string, unknown>;

  const source = requireString(d, "source");
  if (source instanceof SchemaValidationError) throw source;

  const sourceEventId = requireString(d, "sourceEventId");
  if (sourceEventId instanceof SchemaValidationError) throw sourceEventId;

  const sourceUrl = requireString(d, "sourceUrl");
  if (sourceUrl instanceof SchemaValidationError) throw sourceUrl;

  const rawTitle = requireString(d, "rawTitle");
  if (rawTitle instanceof SchemaValidationError) throw rawTitle;

  const rawDescription = requireString(d, "rawDescription");
  if (rawDescription instanceof SchemaValidationError) throw rawDescription;

  const rawStart = requireString(d, "rawStart");
  if (rawStart instanceof SchemaValidationError) throw rawStart;

  const rawEnd = requireNullableString(d, "rawEnd");
  if (rawEnd instanceof SchemaValidationError) throw rawEnd;

  const rawLocation = requireNullableString(d, "rawLocation");
  if (rawLocation instanceof SchemaValidationError) throw rawLocation;

  const scrapedAt = requireString(d, "scrapedAt");
  if (scrapedAt instanceof SchemaValidationError) throw scrapedAt;
  if (!ISO_8601_UTC.test(scrapedAt)) {
    throw new SchemaValidationError(
      `Field "scrapedAt" must be an ISO 8601 UTC timestamp (e.g. 2026-07-08T03:00:00Z), got: ${JSON.stringify(scrapedAt)}`,
      "scrapedAt",
      scrapedAt,
    );
  }

  return {
    source,
    sourceEventId,
    sourceUrl,
    rawTitle,
    rawDescription,
    rawStart,
    rawEnd,
    rawLocation,
    scrapedAt,
  };
}
