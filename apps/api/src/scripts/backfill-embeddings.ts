import {
  EMBEDDING_MODEL_NAME,
  generateEmbeddings,
} from "../embeddings/embeddings.service.js";
import { postgresPool } from "../database/postgres.js";

const BATCH_SIZE = 8;

const MAX_EMBEDDING_TEXT_LENGTH = 3_000;

type DocumentToEmbed = {
  id: string;
  title: string;
  abstract: string;
};

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

function buildEmbeddingText(document: DocumentToEmbed): string {
  const text = `${document.title}\n\n${document.abstract}`
    .replace(/\s+/g, " ")
    .trim();

  return text.slice(0, MAX_EMBEDDING_TEXT_LENGTH);
}

function getImportLimit(): number {
  const rawLimit = process.env.EMBEDDING_BACKFILL_LIMIT ?? "0";
  const limit = Number(rawLimit);

  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error(
      "EMBEDDING_BACKFILL_LIMIT must be a whole number greater than or equal to 0.",
    );
  }

  return limit;
}

async function main(): Promise<void> {
  const importLimit = getImportLimit();
  let processedCount = 0;

  console.log(`Using embedding model: ${EMBEDDING_MODEL_NAME}`);

  if (importLimit === 0) {
    console.log("Processing every document without a current embedding.\n");
  } else {
    console.log(`Processing at most ${importLimit} document(s).\n`);
  }

  while (importLimit === 0 || processedCount < importLimit) {
    const remainingCount =
      importLimit === 0
        ? BATCH_SIZE
        : Math.min(BATCH_SIZE, importLimit - processedCount);

    const documentResult = await postgresPool.query<DocumentToEmbed>(
      `
        SELECT
          id,
          title,
          abstract
        FROM documents
        WHERE embedding IS NULL
           OR embedding_model IS DISTINCT FROM $1
        ORDER BY created_at ASC
        LIMIT $2
      `,
      [EMBEDDING_MODEL_NAME, remainingCount],
    );

    const documents = documentResult.rows;

    if (documents.length === 0) {
      break;
    }

    const texts = documents.map(buildEmbeddingText);

    const embeddings = await generateEmbeddings(texts);

    const client = await postgresPool.connect();

    try {
      await client.query("BEGIN");

      for (const [index, document] of documents.entries()) {
        const embedding = embeddings[index];
        if (!embedding) {
          throw new Error(`Missing embedding for document ${document.id}`);
        }
        await client.query(
          `
            UPDATE documents
            SET
              embedding = $1::vector,
              embedding_model = $2,
              embedded_at = NOW()
            WHERE id = $3
          `,
          [
            toVectorLiteral(embedding),
            EMBEDDING_MODEL_NAME,
            document.id,
          ],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    processedCount += documents.length;

    console.log(
      `Embedded ${processedCount.toLocaleString()} document(s) in this run...`,
    );
  }

  console.log("\nEmbedding backfill finished.");
  console.log(`Documents processed in this run: ${processedCount.toLocaleString()}`);
}

main()
  .catch((error: unknown) => {
    console.error("Embedding backfill failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await postgresPool.end();
  });