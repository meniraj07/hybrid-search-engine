INSERT INTO documents (external_id, title, abstract, authors, category, published_at)
VALUES
  (
    'doc-001',
    'Building Hybrid Search Systems',
    'A practical guide to combining keyword and vector search for modern applications.',
    ARRAY['Alice Johnson', 'Bob Smith'],
    'engineering',
    '2024-01-15'
  ),
  (
    'doc-002',
    'Introduction to PostgreSQL Vectors',
    'Learn how to store and query embeddings in PostgreSQL using pgvector.',
    ARRAY['Carol Lee'],
    'database',
    '2024-02-10'
  ),
  (
    'doc-003',
    'Designing Scalable APIs',
    'Best practices for building resilient APIs that handle high traffic and large data sets.',
    ARRAY['David Kim', 'Eva Patel'],
    'backend',
    '2024-03-05'
  ),
  (
    'doc-004',
    'Machine Learning for Search Ranking',
    'Explores ranking models that improve retrieval quality in search engines.',
    ARRAY['Frank Moore'],
    'ai',
    '2024-04-20'
  ),
  (
    'doc-005',
    'Full-Text Search with PostgreSQL',
    'An overview of full-text search capabilities and how to optimize them.',
    ARRAY['Grace Nguyen', 'Henry Torres'],
    'database',
    '2024-05-01'
  )

  ON CONFLICT (external_id) DO NOTHING;
