export type RawEventRecord = {
  source: string;
  sourceEventId: string;
  sourceUrl: string;
  rawTitle: string;
  rawDescription: string;
  rawStart: string;
  rawEnd: string | null;
  rawLocation: string | null;
  scrapedAt: string;
};

export type Venue = {
  name: string;
  address: string | null;
  city: string;
  country: string;
  online: boolean;
};

export type NormalizedEvent = {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string | null;
  venue: Venue;
  source: string;
  sourceEventId: string;
  sourceUrl: string;
  lowConfidence: boolean;
  categories: string[];
  whyIncluded: string;
  createdAt: string;
  updatedAt: string;
};
