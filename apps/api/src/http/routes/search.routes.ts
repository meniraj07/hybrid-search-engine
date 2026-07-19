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
    const likePattern = `%${query.q}%`;

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
      WHERE title ILIKE $1 OR abstract ILIKE $1
      ORDER BY published_at DESC NULLS LAST
      LIMIT $2
      `,
      [likePattern, query.limit],
    );
    res.status(200).json({
      query: query.q,
      count: result.rowCount,
      results: result.rows,
    });
  } catch (error) {
    next(error);
  }
});
