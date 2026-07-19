import { Router } from "express";
import { z } from "zod";
import { postgresPool } from "../../database/postgres.js";

export const searchRouter = Router();

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),
  limit: z.number().int().min(1).max(50).default(10),
});

searchRouter.get("/search", async (req, res, next) => {
  try {
    const query = searchQuerySchema.parse(req.query);

    const result = await postgresPool.query(
      `
      WITH search_input AS (
        SELECT websearch_to_tsquery('english', $1) AS tsquery
      )
      SELECT
        documents.id,
        documents.external_id,
        documents.title,
        documents.abstract,
        documents.authors,
        documents.category,
        documents.published_at,
        ts_rank_cd(
          documents.search_vector,
          search_input.tsquery,
          32
        ) AS keyword_score
      FROM documents
      CROSS JOIN search_input
      WHERE documents.search_vector @@ search_input.tsquery
      ORDER BY
        keyword_score DESC,
        documents.published_at DESC NULLS LAST
      LIMIT $2
      `,
      [query.q, query.limit],
    );
    res.status(200).json({
      query: query.q,
      searchMode: "full-text",
      count: result.rowCount,
      results: result.rows,
    });
  } catch (error) {
    next(error);
  }
});
