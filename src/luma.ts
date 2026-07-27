import type { NormalizedEvent } from "./schema/index.ts";

export const LUMA_SINGAPORE_URL = "https://lu.ma/singapore";

export type LumaEvent = {
  name: string;
  description: string;
  startDate: string;
  endDate: string | null;
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

export function parseLumaEvents(jsonString: string): LumaEvent[] {
  try {
    const parsed = JSON.parse(jsonString);
    const events: LumaEvent[] = [];

    const rawList = Array.isArray(parsed) ? parsed : (parsed.events || [parsed]);
    for (const item of rawList) {
      if (item && item.name) {
        events.push({
          name: item.name,
          description: item.description || "",
          startDate: item.startDate || new Date().toISOString(),
          endDate: item.endDate || null,
          location: {
            name: item.location?.name || "Singapore Venue",
            address: item.location?.address || "Singapore",
            city: "Singapore",
            country: "SG",
            online: Boolean(item.location?.online),
          },
          organizerName: item.organizer?.name || "Luma Host",
          url: item.url || LUMA_SINGAPORE_URL,
        });
      }
    }
    return events;
  } catch (error) {
    return [];
  }
}
