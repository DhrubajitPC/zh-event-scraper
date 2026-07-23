import { strict as assert } from "node:assert";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deserializeEvent, serializeEvent } from "../src/schema/index.ts";
import {
  extractFirstTechMeetupsSingaporeEvent,
  normalizeTechMeetupsEvent,
  slugifyEventId,
  TECHMEETUPS_SINGAPORE_URL,
} from "../src/techmeetups.ts";

const EVENTS_DATA_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../data/events",
);

type FetchLike = typeof fetch;

async function emptyEventsDirectory(dataDir: string): Promise<void> {
  const entries = await readdir(dataDir, { withFileTypes: true });

  await Promise.all(
    entries
      .filter(
        (entry) =>
          entry.isFile() &&
          entry.name.endsWith(".md") &&
          entry.name.startsWith("techmeetups-"),
      )
      .map((entry) => rm(path.join(dataDir, entry.name))),
  );
}

export async function runTechMeetupsWalkingSkeleton(options?: {
  fetchImpl?: FetchLike;
  now?: Date;
  dataDir?: string;
}): Promise<{ filePath: string }> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const now = options?.now ?? new Date();
  const dataDir = options?.dataDir ?? EVENTS_DATA_DIR;

  const response = await fetchImpl(TECHMEETUPS_SINGAPORE_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${TECHMEETUPS_SINGAPORE_URL}: ${response.status}`);
  }

  const html = await response.text();
  const sourceEvent = extractFirstTechMeetupsSingaporeEvent(html);
  const normalizedEvent = normalizeTechMeetupsEvent(sourceEvent, now);

  await mkdir(dataDir, { recursive: true });
  await emptyEventsDirectory(dataDir);

  const fileName = `${slugifyEventId(normalizedEvent.sourceEventId)}.md`;
  const filePath = path.join(dataDir, fileName);
  await writeFile(filePath, serializeEvent(normalizedEvent), "utf8");

  const persistedMarkdown = await readFile(filePath, "utf8");
  const roundTripEvent = deserializeEvent(persistedMarkdown);
  assert.deepEqual(roundTripEvent, normalizedEvent);

  return { filePath };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { filePath } = await runTechMeetupsWalkingSkeleton();
  console.log(`Wrote ${filePath}`);
}
