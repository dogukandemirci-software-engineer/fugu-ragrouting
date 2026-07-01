-- Enable pgvector for similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Apache AGE (graph extension) — optional, graph queries fallback gracefully if absent
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS age;
  LOAD 'age';
  SET search_path = ag_catalog, "$user", public;
  PERFORM create_graph('fugu_graph');
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Apache AGE not available — graph queries will use vector-only fallback';
END $$;
