import { Router } from "express";
import { z } from "zod";
import { postgresPool } from "../../database/postgres.js";

export const searchRouter = Router();

const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),

  page: z.coerce.number().int().min(1).default(1),

  pageSize: z.coerce.number().int().min(1).max(50).default(10),

  category: z.string().trim().min(1).optional(),

  sort: z.enum(["relevance", "newest"]).default("relevance"),
});

searchRouter.get("/search", async (req, res, next) => {
  try {
    const query = searchQuerySchema.parse(req.query);

    const offset = (query.page - 1) * query.pageSize;
    const orderBy =
      query.sort === "newest"
        ? "documents.published_at DESC NULLS LAST, keyword_score DESC"
        : "keyword_score DESC, documents.published_at DESC NULLS LAST";

    const countParameters = [query.q, query.category ?? null];
    const documentParameters = [query.q, query.category ?? null, query.pageSize, offset];

    const categoryFilter = query.category ? "AND documents.category = $2" : "AND ($2::text IS NULL)";

    const countQuery = `
      WITH search_input AS (
        SELECT websearch_to_tsquery('english', $1) AS tsquery
      )
      SELECT COUNT(*)::int AS total
      FROM documents
      CROSS JOIN search_input
      WHERE documents.search_vector @@ search_input.tsquery
        ${categoryFilter}
    `;

    const documentQuery = `
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
        ${categoryFilter}
      ORDER BY ${orderBy}
      LIMIT $3
      OFFSET $4
    `;

    const [countResult, documentResult] = await Promise.all([
      postgresPool.query(countQuery, countParameters),
      postgresPool.query(documentQuery, documentParameters),
    ]);

    const total = countResult.rows[0].total as number;

    const totalPages = Math.ceil(total / query.pageSize);

    return res.status(200).json({
      query: query.q,
      searchMode: "full_text",
      rankingMethod: "postgresql_ts_rank_cd",
      filters: {
        category: query.category ?? null,
      },
      sorting: {
        requested: query.sort,
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
    return next(error);
  }
});