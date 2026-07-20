# Hybrid Search Engine

A full-stack hybrid search engine for Computer Science research papers.

It combines:

- PostgreSQL Full Text Search for exact keyword matching
- Local embeddings for semantic similarity search
- pgvector for vector storage and cosine similarity
- Reciprocal Rank Fusion (RRF) for hybrid ranking
- Angular frontend for searching and filtering results

## Features

- Keyword search using PostgreSQL `tsvector`, `tsquery`, GIN indexes, and `ts_rank_cd`
- Semantic search using the free local `Xenova/all-MiniLM-L6-v2` embedding model
- pgvector cosine similarity search with an HNSW index
- Hybrid retrieval using Reciprocal Rank Fusion
- Category filters, pagination, sorting, and result highlighting
- Input validation, error handling, rate limiting, security headers, and tests
- Around 75,000 arXiv Computer Science research-paper records

## Architecture

```mermaid
flowchart LR
    User[User] --> Web[Angular Frontend]
    Web --> API[Express API]

    API --> Keyword[PostgreSQL Full Text Search]
    API --> Semantic[Embedding Model]
    Semantic --> Vector[pgvector Similarity Search]

    Keyword --> RRF[Reciprocal Rank Fusion]
    Vector --> RRF
    RRF --> API

    API --> Database[(PostgreSQL + pgvector)]
