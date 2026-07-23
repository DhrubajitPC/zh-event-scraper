import type { NormalizedEvent, RawEventRecord, Venue } from "./types.ts";

// ---------------------------------------------------------------------------
// Validation error
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

export type ValidationResult =
  | { ok: true; value: NormalizedEvent }
  | { ok: false; error: SchemaValidationError };

// ---------------------------------------------------------------------------
// Internal field helpers
// ---------------------------------------------------------------------------

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
const ISO_8601_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+08:00$/;

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

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
