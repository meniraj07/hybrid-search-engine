ALTER TABLE documents
ADD COLUMN IF NOT EXISTS search_vector tsvector;

UPDATE documents
SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(abstract, '')), 'B');

CREATE  OR REPLACE FUNCTION update_documents_search_vector()
 RETURNS trigger
 language plpgsql
 AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS documents_search_vector_trigger ON documents;

CREATE TRIGGER documents_search_vector_trigger
BEFORE INSERT OR UPDATE OF title, abstract ON documents
FOR EACH ROW EXECUTE FUNCTION update_documents_search_vector();

CREATE INDEX IF NOT EXISTS documents_search_vector_gin_idx ON documents USING GIN (search_vector);