/**
 * Shared event schema types — consumed by the scraper pipeline and the UI.
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
