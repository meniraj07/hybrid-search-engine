import { Router } from "express";
import { z } from "zod";
import { generateEmbedding, EMBEDDING_MODEL_NAME } from "../../embeddings/embeddings.service.js";
import { postgresPool } from "../../database/postgres.js";

export const semanticSearchRouter = Router();

const semanticSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),

  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),

  category: z.string().trim().min(1).optional(),
});

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

semanticSearchRouter.get("/search/semantic", async (req, res, next) => {
  try {
    const query = semanticSearchQuerySchema.parse(req.query);
    const offset = (query.page - 1) * query.pageSize;

    const queryEmbedding = await generateEmbedding(query.q);
    const vectorLiteral = toVectorLiteral(queryEmbedding);

    const countResult = await postgresPool.query(
      `
        SELECT COUNT(*)::int AS total
        FROM documents
        WHERE embedding IS NOT NULL
          AND ($1::text IS NULL OR category = $1)
      `,
      [query.category ?? null],
    );

    const documentResult = await postgresPool.query(
      `
        SELECT
          id,
          external_id,
          title,
          abstract,
          authors,
          category,
          published_at,

          -- Convert distance into a friendlier “higher is better” score.
          1 - (embedding <=> $1::vector) AS semantic_score
        FROM documents
        WHERE embedding IS NOT NULL
          AND ($2::text IS NULL OR category = $2)
        ORDER BY embedding <=> $1::vector ASC
        LIMIT $3
        OFFSET $4
      `,
      [
        vectorLiteral,
        query.category ?? null,
        query.pageSize,
        offset,
      ],
    );

    const total = countResult.rows[0].total as number;
    const totalPages = Math.ceil(total / query.pageSize);

    return res.status(200).json({
      query: query.q,
      searchMode: "semantic",
      embeddingModel: EMBEDDING_MODEL_NAME,
      filters: {
        category: query.category ?? null,
      },
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        total,
        totalPages,
        hasPreviousPage: query.page > 1,
        hasNextPage: query.page < totalPages,
      },
      results: documentResult.rows,
    });
  } catch (error) {
    next(error);
  }
});