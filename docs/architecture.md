# Architecture Decisions

## Why PostgreSQL?

PostgreSQL stores the paper data, metadata, Full Text Search data, and vectors in one database. This keeps the project simpler than operating separate databases.

## Why Full Text Search?

Full Text Search is used for exact keyword matching. It supports stemming, stop words, and GIN indexes, which are much better than SQL `LIKE` for large text collections.

## Why pgvector?

pgvector allows PostgreSQL to store embeddings and compare them using cosine similarity. It gives semantic search without requiring a separate vector database.

## Why Local Embeddings?

The project uses the free local `Xenova/all-MiniLM-L6-v2` model. This avoids API cost and keeps the learning project independent from paid embedding APIs.

## Why HNSW?

HNSW is an approximate nearest-neighbor vector index. It makes vector search much faster by avoiding comparison with every document vector.

The trade-off is that it may return results that are slightly less perfect than exact vector search.

## Why Reciprocal Rank Fusion?

Keyword ranking and semantic similarity have different score scales. Adding them directly is unreliable.

RRF combines rank positions instead. Documents that rank highly in keyword search, semantic search, or both receive stronger final scores.

## Why Not Exact BM25?

PostgreSQL `ts_rank_cd` is used for lexical ranking. It has a similar purpose to BM25 but is not exact BM25 because it does not use all corpus-wide BM25 statistics.

## What Changes at One Million Documents?

At a larger scale, the system would need:

- Background jobs and queues for embedding generation
- More database memory and storage
- Keyset pagination instead of large OFFSET values
- Read replicas for search traffic
- Monitoring for latency and errors
- Possibly a dedicated search engine such as Elasticsearch or OpenSearch