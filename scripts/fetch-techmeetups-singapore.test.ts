import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { deserializeEvent } from "../src/schema/index.ts";
import {
  extractFirstTechMeetupsSingaporeEvent,
  normalizeTechMeetupsEvent,
} from "../src/techmeetups.ts";
import { runTechMeetupsWalkingSkeleton } from "./fetch-techmeetups-singapore.ts";

const sampleHtml = `
<!doctype html>
<html>
  <head>
    <script type="application/ld+json">
      {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":[]}
    </script>
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": "Upcoming Tech Events in Singapore",
        "itemListElement": [
          {
            "@type": "Event",
            "name": "Tech Founders Mixer",
            "startDate": "2026-08-14T18:30:00+08:00",
            "endDate": "2026-08-14T21:00:00+08:00",
            "eventStatus": "https://schema.org/EventScheduled",
            "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
            "location": {
              "@type": "Place",
              "name": "The Executive Centre",
              "address": {
                "@type": "PostalAddress",
                "streetAddress": "1 Raffles Quay",
                "addressLocality": "Singapore",
                "addressCountry": "SG"
              }
            },
            "organizer": {
              "@type": "Organization",
              "name": "TechMeetups"
            },
            "url": "https://techmeetups.io/event/sg-tech-founders-mixer"
          }
        ]
      }
    </script>
  </head>
</html>
`;

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("extractFirstTechMeetupsSingaporeEvent", () => {
  it("extracts the first Event from the Singapore ItemList JSON-LD block", () => {
    expect(extractFirstTechMeetupsSingaporeEvent(sampleHtml)).toEqual({
      name: "Tech Founders Mixer",
      description: "",
      startDate: "2026-08-14T18:30:00+08:00",
      endDate: "2026-08-14T21:00:00+08:00",
      eventStatus: "https://schema.org/EventScheduled",
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      location: {
        name: "The Executive Centre",
        address: "1 Raffles Quay",
        city: "Singapore",
        country: "SG",
        online: false,
      },
      organizerName: "TechMeetups",
      url: "https://techmeetups.io/event/sg-tech-founders-mixer",
    });
  });
});

describe("normalizeTechMeetupsEvent", () => {
  it("maps the extracted event into a NormalizedEvent", () => {
    const extracted = extractFirstTechMeetupsSingaporeEvent(sampleHtml);
    expect(normalizeTechMeetupsEvent(extracted, new Date("2026-07-23T05:55:32Z"))).toEqual({
      id: "techmeetups:techmeetups.io/event/sg-tech-founders-mixer",
      title: "Tech Founders Mixer",
      description:
        "Tech Founders Mixer\n\nOrganized by TechMeetups.\n\nStatus: Event Scheduled.\n\nAttendance: Offline Event Attendance Mode.",
      startDate: "2026-08-14T18:30:00+08:00",
      endDate: "2026-08-14T21:00:00+08:00",
      venue: {
        name: "The Executive Centre",
        address: "1 Raffles Quay",
        city: "Singapore",
        country: "SG",
        online: false,
      },
      source: "techmeetups",
      sourceEventId: "techmeetups.io/event/sg-tech-founders-mixer",
      sourceUrl: "https://techmeetups.io/event/sg-tech-founders-mixer",
      lowConfidence: false,
      categories: [],
      whyIncluded: "Upcoming tech event listed on TechMeetups.io Singapore.",
      createdAt: "2026-07-23T13:55:32+08:00",
      updatedAt: "2026-07-23T13:55:32+08:00",
    });
  });
});

describe("runTechMeetupsWalkingSkeleton", () => {
  it("writes exactly one markdown file and round-trips it back to the same event", async () => {
    const dataDir = await mkdtemp(path.join(os.tmpdir(), "techmeetups-"));
    tempDirs.push(dataDir);

    const response = new Response(sampleHtml, {
      status: 200,
      headers: { "content-type": "text/html" },
    });

    const { filePath } = await runTechMeetupsWalkingSkeleton({
      dataDir,
      now: new Date("2026-07-23T05:55:32Z"),
      fetchImpl: async () => response,
    });

    const files = await readdir(dataDir);
    expect(files).toEqual(["techmeetups-io-event-sg-tech-founders-mixer.md"]);
    expect(path.basename(filePath)).toBe(files[0]);

    const persisted = deserializeEvent(await readFile(filePath, "utf8"));
    expect(persisted.id).toBe("techmeetups:techmeetups.io/event/sg-tech-founders-mixer");
    expect(persisted.sourceUrl).toBe("https://techmeetups.io/event/sg-tech-founders-mixer");
    expect(persisted.venue.name).toBe("The Executive Centre");
  });
});
