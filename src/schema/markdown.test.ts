import { describe, expect, it } from "vitest";
import { deserializeEvent, serializeEvent } from "./markdown.ts";
import type { NormalizedEvent } from "./event.ts";
import { SchemaValidationError } from "./event.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const baseEvent: NormalizedEvent = {
  id: "meetup:300123456",
  title: "Tech Networking Night",
  description: "An evening of **networking** for Singapore engineers.\n\nAll welcome.",
  startDate: "2026-07-15T18:00:00+08:00",
  endDate: "2026-07-15T21:00:00+08:00",
  venue: {
    name: "The Working Capitol",
    address: "140 Robinson Rd",
    city: "Singapore",
    country: "SG",
    online: false,
  },
  source: "meetup",
  sourceEventId: "300123456",
  sourceUrl: "https://www.meetup.com/sg-tech/events/300123456",
  lowConfidence: false,
  categories: ["tech", "networking"],
  whyIncluded: "Relevant to engineers in Singapore",
  createdAt: "2026-07-08T00:00:00+08:00",
  updatedAt: "2026-07-08T00:00:00+08:00",
};

const onlineEvent: NormalizedEvent = {
  ...baseEvent,
  id: "luma:abc123",
  endDate: null,
  venue: {
    name: "Online",
    address: "",
    city: "Singapore",
    country: "SG",
    online: true,
  },
  source: "luma",
  sourceEventId: "abc123",
  sourceUrl: "https://lu.ma/abc123",
  lowConfidence: true,
  categories: [],
};

// ---------------------------------------------------------------------------
// serializeEvent
// ---------------------------------------------------------------------------

describe("serializeEvent", () => {
  it("produces a string with YAML frontmatter delimiters", () => {
    const md = serializeEvent(baseEvent);
    expect(md.startsWith("---\n")).toBe(true);
    expect(md).toContain("\n---\n");
  });

  it("includes all frontmatter fields", () => {
    const md = serializeEvent(baseEvent);
    expect(md).toContain("id:");
    expect(md).toContain("title:");
    expect(md).toContain("start_date:");
    expect(md).toContain("end_date:");
    expect(md).toContain("venue_name:");
    expect(md).toContain("venue_address:");
    expect(md).toContain("venue_city:");
    expect(md).toContain("venue_country:");
    expect(md).toContain("venue_online:");
    expect(md).toContain("source:");
    expect(md).toContain("source_event_id:");
    expect(md).toContain("source_url:");
    expect(md).toContain("low_confidence:");
    expect(md).toContain("categories:");
    expect(md).toContain("why_included:");
    expect(md).toContain("created_at:");
    expect(md).toContain("updated_at:");
  });

  it("places the description in the markdown body", () => {
    const md = serializeEvent(baseEvent);
    // Body appears after the closing ---
    const bodyStart = md.indexOf("\n---\n") + 5;
    const body = md.slice(bodyStart).trim();
    expect(body).toBe(baseEvent.description.trim());
  });

  it("serializes null endDate as ~", () => {
    const md = serializeEvent(onlineEvent);
    expect(md).toContain("end_date: ~");
  });

  it("serializes empty categories as []", () => {
    const md = serializeEvent(onlineEvent);
    expect(md).toContain("categories: []");
  });

  it("serializes boolean true/false without quotes", () => {
    const md = serializeEvent(baseEvent);
    expect(md).toContain("venue_online: false");
    expect(md).toContain("low_confidence: false");

    const mdOnline = serializeEvent(onlineEvent);
    expect(mdOnline).toContain("venue_online: true");
    expect(mdOnline).toContain("low_confidence: true");
  });

  it("serializes category array as block sequence", () => {
    const md = serializeEvent(baseEvent);
    expect(md).toContain("  - tech");
    expect(md).toContain("  - networking");
  });
});

// ---------------------------------------------------------------------------
// deserializeEvent
// ---------------------------------------------------------------------------

describe("deserializeEvent", () => {
  it("parses a valid markdown string", () => {
    const md = serializeEvent(baseEvent);
    const parsed = deserializeEvent(md);
    expect(parsed).toEqual(baseEvent);
  });

  it("parses an event with null endDate", () => {
    const md = serializeEvent(onlineEvent);
    const parsed = deserializeEvent(md);
    expect(parsed.endDate).toBeNull();
  });

  it("parses an event with empty categories", () => {
    const md = serializeEvent(onlineEvent);
    const parsed = deserializeEvent(md);
    expect(parsed.categories).toEqual([]);
  });

  it("parses an event with online venue", () => {
    const md = serializeEvent(onlineEvent);
    const parsed = deserializeEvent(md);
    expect(parsed.venue.online).toBe(true);
  });

  it("throws when frontmatter delimiters are missing", () => {
    expect(() => deserializeEvent("No frontmatter here.")).toThrowError(
      /frontmatter/i,
    );
  });

  it("throws SchemaValidationError when a required field is absent from frontmatter", () => {
    const md = serializeEvent(baseEvent).replace(/^title:.*\n/m, "");
    expect(() => deserializeEvent(md)).toThrowError(SchemaValidationError);
  });

  it("parses a file with CRLF line endings", () => {
    const lf = serializeEvent(baseEvent);
    const crlf = lf.replace(/\n/g, "\r\n");
    expect(deserializeEvent(crlf)).toEqual(baseEvent);
  });
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

describe("round-trip (serialize → deserialize)", () => {
  it("is lossless for a typical in-person event", () => {
    expect(deserializeEvent(serializeEvent(baseEvent))).toEqual(baseEvent);
  });

  it("is lossless for an online event with null endDate and no categories", () => {
    expect(deserializeEvent(serializeEvent(onlineEvent))).toEqual(onlineEvent);
  });

  it("is lossless for an event with special characters in title", () => {
    const special: NormalizedEvent = {
      ...baseEvent,
      title: 'Colon: semicolon; quote" hash# bracket[0]',
    };
    expect(deserializeEvent(serializeEvent(special))).toEqual(special);
  });

  it("is lossless for a multi-line description", () => {
    const multi: NormalizedEvent = {
      ...baseEvent,
      description: "Line one.\n\nLine two.\n\n## Heading\n\n- bullet",
    };
    expect(deserializeEvent(serializeEvent(multi))).toEqual(multi);
  });
});
