import { describe, expect, it } from "vitest";
import {
  SchemaValidationError,
  parseNormalizedEvent,
  parseRawEventRecord,
  validateNormalizedEvent,
} from "./event.ts";
import type { NormalizedEvent } from "./event.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const validVenue = {
  name: "The Working Capitol",
  address: "140 Robinson Rd",
  city: "Singapore",
  country: "SG",
  online: false,
};

const validEvent: NormalizedEvent = {
  id: "meetup:300123456",
  title: "Tech Networking Night",
  description: "An evening of networking for Singapore engineers.",
  startDate: "2026-07-15T18:00:00+08:00",
  endDate: "2026-07-15T21:00:00+08:00",
  venue: validVenue,
  source: "meetup",
  sourceEventId: "300123456",
  sourceUrl: "https://www.meetup.com/sg-tech/events/300123456",
  lowConfidence: false,
  categories: ["tech", "networking"],
  whyIncluded: "Relevant to engineers in Singapore",
  createdAt: "2026-07-08T00:00:00+08:00",
  updatedAt: "2026-07-08T00:00:00+08:00",
};

// ---------------------------------------------------------------------------
// validateNormalizedEvent — discriminated-union API
// ---------------------------------------------------------------------------

describe("validateNormalizedEvent", () => {
  it("returns ok:true for a fully valid event", () => {
    const result = validateNormalizedEvent(validEvent);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual(validEvent);
    }
  });

  it("accepts null endDate", () => {
    const result = validateNormalizedEvent({ ...validEvent, endDate: null });
    expect(result.ok).toBe(true);
  });

  it("accepts an empty categories array", () => {
    const result = validateNormalizedEvent({ ...validEvent, categories: [] });
    expect(result.ok).toBe(true);
  });

  it("returns ok:false for a non-object input", () => {
    const result = validateNormalizedEvent(null);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(SchemaValidationError);
      expect(result.error.field).toBe("(root)");
    }
  });

  it("returns ok:false when a required string field is missing", () => {
    const { title: _title, ...rest } = validEvent;
    const result = validateNormalizedEvent(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("title");
      expect(result.error.message).toMatch(/"title"/);
    }
  });

  it("returns ok:false when startDate is not ISO 8601 with offset", () => {
    const result = validateNormalizedEvent({
      ...validEvent,
      startDate: "2026-07-15",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("startDate");
      expect(result.error.message).toMatch(/ISO 8601/);
    }
  });

  it("returns ok:false when startDate has a non-Singapore offset", () => {
    const result = validateNormalizedEvent({
      ...validEvent,
      startDate: "2026-07-15T18:00:00+09:00",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("startDate");
      expect(result.error.message).toMatch(/\+08:00/);
    }
  });

  it("returns ok:false when id does not match <source>:<sourceEventId>", () => {
    const result = validateNormalizedEvent({
      ...validEvent,
      id: "wrong:id",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("id");
      expect(result.error.message).toContain("meetup:300123456");
    }
  });

  it("returns ok:false when lowConfidence is not a boolean", () => {
    const result = validateNormalizedEvent({
      ...validEvent,
      lowConfidence: "yes",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("lowConfidence");
    }
  });

  it("returns ok:false when categories contains a non-string", () => {
    const result = validateNormalizedEvent({
      ...validEvent,
      categories: ["tech", 42],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("categories");
    }
  });

  it("returns ok:false when venue is missing", () => {
    const { venue: _venue, ...rest } = validEvent;
    const result = validateNormalizedEvent(rest);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("venue");
    }
  });

  it("returns ok:false when venue.online is not a boolean", () => {
    const result = validateNormalizedEvent({
      ...validEvent,
      venue: { ...validVenue, online: "yes" },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.field).toBe("venue.online");
    }
  });
});

// ---------------------------------------------------------------------------
// parseNormalizedEvent — throwing API
// ---------------------------------------------------------------------------

describe("parseNormalizedEvent", () => {
  it("returns the event when valid", () => {
    expect(parseNormalizedEvent(validEvent)).toEqual(validEvent);
  });

  it("throws SchemaValidationError with actionable message on invalid input", () => {
    expect(() =>
      parseNormalizedEvent({ ...validEvent, startDate: "not-a-date" }),
    ).toThrowError(SchemaValidationError);

    try {
      parseNormalizedEvent({ ...validEvent, startDate: "not-a-date" });
    } catch (err) {
      expect(err).toBeInstanceOf(SchemaValidationError);
      if (err instanceof SchemaValidationError) {
        expect(err.field).toBe("startDate");
        expect(err.message).toContain("startDate");
        expect(err.message).toContain("ISO 8601");
        expect(err.received).toBe("not-a-date");
      }
    }
  });
});

// ---------------------------------------------------------------------------
// parseRawEventRecord
// ---------------------------------------------------------------------------

describe("parseRawEventRecord", () => {
  const validRaw = {
    source: "meetup",
    sourceEventId: "300123456",
    sourceUrl: "https://www.meetup.com/sg-tech/events/300123456",
    rawTitle: "Tech Networking Night",
    rawDescription: "An evening of networking.",
    rawStart: "Wed, 15 Jul 2026 18:00:00 +0800",
    rawEnd: null,
    rawLocation: null,
    scrapedAt: "2026-07-08T03:00:00Z",
  };

  it("returns the record when valid", () => {
    expect(parseRawEventRecord(validRaw)).toEqual(validRaw);
  });

  it("accepts null rawEnd and rawLocation", () => {
    expect(() => parseRawEventRecord(validRaw)).not.toThrow();
  });

  it("throws SchemaValidationError when source is missing", () => {
    const { source: _source, ...rest } = validRaw;
    expect(() => parseRawEventRecord(rest)).toThrowError(SchemaValidationError);
    try {
      parseRawEventRecord(rest);
    } catch (err) {
      if (err instanceof SchemaValidationError) {
        expect(err.field).toBe("source");
        expect(err.message).toMatch(/"source"/);
      }
    }
  });

  it("throws SchemaValidationError when rawEnd is not a string or null", () => {
    expect(() =>
      parseRawEventRecord({ ...validRaw, rawEnd: 42 }),
    ).toThrowError(SchemaValidationError);
  });

  it("throws SchemaValidationError for non-object input", () => {
    expect(() => parseRawEventRecord("not an object")).toThrowError(
      SchemaValidationError,
    );
  });

  it("throws SchemaValidationError when scrapedAt is not a UTC ISO 8601 timestamp", () => {
    expect(() =>
      parseRawEventRecord({ ...validRaw, scrapedAt: "not-a-date" }),
    ).toThrowError(SchemaValidationError);
    // +08:00 offset is not a UTC (Z) timestamp
    expect(() =>
      parseRawEventRecord({
        ...validRaw,
        scrapedAt: "2026-07-08T03:00:00+08:00",
      }),
    ).toThrowError(SchemaValidationError);
  });
});
