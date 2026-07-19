import { Router } from "express";
import { z } from "zod";
import {
  EMBEDDING_MODEL_NAME,
  generateEmbedding,
} from "../../embeddings/embeddings.service.js";
import { postgresPool } from "../../database/postgres.js";

export const hybridSearchRouter = Router();

const RRF_K = 60;

const CANDIDATE_LIMIT = 100;

const hybridSearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required"),

  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(50).default(10),

  category: z.string().trim().min(1).optional(),
});

function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}

hybridSearchRouter.get("/search/hybrid", async (req, res, next) => {
  try {
    const query = hybridSearchQuerySchema.parse(req.query);

    const queryEmbedding = await generateEmbedding(query.q);
    const vectorLiteral = toVectorLiteral(queryEmbedding);

    const candidateResult = await postgresPool.query(
      `
        WITH keyword_results AS (
          SELECT
            documents.id,

            -- Position 1 is the strongest keyword result.
            (ROW_NUMBER() OVER (
              ORDER BY ts_rank_cd(
                documents.search_vector,
                websearch_to_tsquery('english', $1),
                32
              ) DESC
            ))::int AS keyword_rank
          FROM documents
          WHERE documents.search_vector @@ websearch_to_tsquery(
            'english',
            $1
          )
            AND ($3::text IS NULL OR documents.category = $3)
          ORDER BY ts_rank_cd(
            documents.search_vector,
            websearch_to_tsquery('english', $1),
            32
          ) DESC
          LIMIT $4
        ),

        semantic_results AS (
          SELECT
            documents.id,

            -- Position 1 is the closest semantic match.
            (ROW_NUMBER() OVER (
              ORDER BY documents.embedding <=> $2::vector ASC
            ))::int AS semantic_rank
          FROM documents
          WHERE documents.embedding IS NOT NULL
            AND ($3::text IS NULL OR documents.category = $3)
          ORDER BY documents.embedding <=> $2::vector ASC
          LIMIT $4
        ),

        fused_results AS (
          SELECT
            COALESCE(keyword_results.id, semantic_results.id) AS document_id,
            keyword_results.keyword_rank,
            semantic_results.semantic_rank,

            -- A document gets points from keyword rank, semantic rank, or both.
            COALESCE(
              1.0 / ($5::double precision + keyword_results.keyword_rank),
              0
            ) +
            COALESCE(
              1.0 / ($5::double precision + semantic_results.semantic_rank),
              0
            ) AS rrf_score
          FROM keyword_results
          FULL OUTER JOIN semantic_results
            ON keyword_results.id = semantic_results.id
        )

        SELECT
          documents.id,
          documents.external_id,
          documents.title,
          documents.abstract,
          documents.authors,
          documents.category,
          documents.published_at,
          fused_results.keyword_rank AS "keywordRank",
          fused_results.semantic_rank AS "semanticRank",
          fused_results.rrf_score AS "rrfScore"
        FROM fused_results
        INNER JOIN documents
          ON documents.id = fused_results.document_id
        ORDER BY
          fused_results.rrf_score DESC,
          documents.published_at DESC NULLS LAST
      `,
      [
        query.q,
        vectorLiteral,
        query.category ?? null,
        CANDIDATE_LIMIT,
        RRF_K,
      ],
    );

    const totalCandidates = candidateResult.rowCount ?? 0;
    const offset = (query.page - 1) * query.pageSize;
    const results = candidateResult.rows.slice(
      offset,
      offset + query.pageSize,
    );
    const totalPages = Math.ceil(totalCandidates / query.pageSize);

    return res.status(200).json({
      query: query.q,
      searchMode: "hybrid",
      rankingMethod: "reciprocal_rank_fusion",
      embeddingModel: EMBEDDING_MODEL_NAME,
      rrf: {
        k: RRF_K,
        keywordCandidateLimit: CANDIDATE_LIMIT,
        semanticCandidateLimit: CANDIDATE_LIMIT,
      },
      filters: {
        category: query.category ?? null,
      },
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalCandidates,
        totalPages,
        hasPreviousPage: query.page > 1,
        hasNextPage: query.page < totalPages,
      },
      results,
    });
  } catch (error) {
    next(error);
  }
});