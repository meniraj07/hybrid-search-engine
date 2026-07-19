import { createReadStream, existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { env } from "../config/env.js";
import { postgresPool } from "../database/postgres.js"

type ArxivRecord = {
  id?: string;
  title?: string;
  abstract?: string;
  authors_parsed?: string[][];
  categories?: string;
  versions?: Array<{
    created?: string;
  }>;
};

type ImportDocument = {
  externalId: string;
  title: string;
  abstract: string;
  authors: string[];
  category: string;
  publishedAt: string | null;
};

const BATCH_SIZE = 250;

const TARGET_DOCUMENT_COUNT = 75_000;

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function toDatabaseDate(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function toImportDocument(record: ArxivRecord): ImportDocument | null {
  const externalId = normalizeText(record.id ?? "");
  const title = normalizeText(record.title ?? "");
  const abstract = normalizeText(record.abstract ?? "");

  const categories = (record.categories ?? "")
    .split(/\s+/)
    .filter(Boolean);

  const primaryCategory = categories[0];

  if (
    !externalId ||
    !title ||
    !abstract ||
    !primaryCategory ||
    !primaryCategory.startsWith("cs.")
  ) {
    return null;
  }

  const authors =
    record.authors_parsed
      ?.map((nameParts) =>
        nameParts
          .filter((part) => typeof part === "string" && part.trim().length > 0)
          .join(" "),
      )
      .filter((author) => author.length > 0) ?? [];

  return {
    externalId,
    title,
    abstract,
    authors: authors.length > 0 ? authors : ["Unknown author"],
    category: primaryCategory,
    publishedAt: toDatabaseDate(record.versions?.[0]?.created),
  };
}

async function insertBatch(documents: ImportDocument[]): Promise<void> {
  const values: unknown[] = [];
  const placeholders = documents
    .map((document, index) => {
      const position = index * 6;

      values.push(
        document.externalId,
        document.title,
        document.abstract,
        document.authors,
        document.category,
        document.publishedAt,
      );

      return `(
        $${position + 1},
        $${position + 2},
        $${position + 3},
        $${position + 4},
        $${position + 5},
        $${position + 6}
      )`;
    })
    .join(", ");

  await postgresPool.query(
    `
    INSERT INTO documents (
      external_id,
      title,
      abstract,
      authors,
      category,
      published_at
    )
    VALUES ${placeholders}

    -- If you run the import again, update existing records instead of
    -- creating duplicates. The database trigger will also refresh search_vector.
    ON CONFLICT (external_id) DO UPDATE
    SET
      title = EXCLUDED.title,
      abstract = EXCLUDED.abstract,
      authors = EXCLUDED.authors,
      category = EXCLUDED.category,
      published_at = EXCLUDED.published_at,
      updated_at = NOW()
    `,
    values,
  );
}

async function main(): Promise<void> {
  const datasetPath =
    env.ARXIV_DATASET_PATH ??
    path.resolve(
      process.cwd(),
      "../../data/raw/arxiv-metadata-oai-snapshot.json",
    );

  if (!existsSync(datasetPath)) {
    throw new Error(
      `Dataset file was not found at: ${datasetPath}\n` +
      "Move arxiv-metadata-oai-snapshot.json into data/raw, then try again.",
    );
  }

  console.log(`Reading dataset from: ${datasetPath}`);

  const input = createReadStream(datasetPath, {
    encoding: "utf8",
  });

  const lineReader = readline.createInterface({
    input,
    crlfDelay: Infinity,
  });

  let scannedCount = 0;
  let importedCount = 0;
  let invalidJsonCount = 0;
  let batch: ImportDocument[] = [];

  for await (const line of lineReader) {
    scannedCount += 1;

    if (!line.trim()) {
      continue;
    }

    let record: ArxivRecord;

    try {
      record = JSON.parse(line) as ArxivRecord;
    } catch {
      invalidJsonCount += 1;
      continue;
    }

    const document = toImportDocument(record);
    if (!document) {
      continue;
    }

    batch.push(document);

    if (batch.length === BATCH_SIZE) {
      await insertBatch(batch);
      importedCount += batch.length;
      batch = [];

      console.log(
        `Imported ${importedCount.toLocaleString()} of ${TARGET_DOCUMENT_COUNT.toLocaleString()} documents...`,
      );
    }

    if (importedCount + batch.length >= TARGET_DOCUMENT_COUNT) {
      break;
    }
  }

  if (batch.length > 0) {
    await insertBatch(batch);
    importedCount += batch.length;
  }

  console.log("\nImport complete.");
  console.log(`Lines scanned: ${scannedCount.toLocaleString()}`);
  console.log(`Documents imported or updated: ${importedCount.toLocaleString()}`);
  console.log(`Invalid JSON lines skipped: ${invalidJsonCount.toLocaleString()}`);
}

main()
  .catch((error: unknown) => {
    console.error("Dataset import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgresPool.end();
  });