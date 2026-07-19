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
      SELECT
        id,
        external_id,
        title,
        abstract,
        authors,
        category,
        published_at
      FROM documents
      WHERE search_vector @@ websearch_to_tsquery('english', $1)
      ORDER BY published_at DESC NULLS LAST
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
