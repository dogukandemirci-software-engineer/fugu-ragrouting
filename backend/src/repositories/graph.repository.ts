import { BaseRepository } from './base.repository';
import { IGraphRepository, GraphSearchResult, GraphNode, GraphEdge } from '../interfaces/i-graph-repository';
import { pool } from '../config/database';
import { logger } from '../utils/logger';

// Apache AGE queries run via cypher() function within a SET search_path context.
// Cypher syntax: SELECT * FROM cypher('graph_name', $$ ... $$) AS (col agtype);
//
// AGE's cypher() body is a dollar-quoted SQL string literal parsed as Cypher AFTER
// the outer SQL parse — standard $1-style SQL parameterization cannot reach inside
// it. Labels and relationship types can never be parameterized in Cypher at all, so
// those are validated against a strict identifier allow-list. String VALUES are
// escaped and quoted explicitly before being spliced in.

const IDENTIFIER_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

// Common English stop-words filtered out of natural-language queries before
// entity matching — without this, a query like "How is Alice related to ACME?"
// never matches a node named "Alice" because the whole sentence (including
// "how", "is", "related", "to") is used as a single regex against n.name.
const STOP_WORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'how', 'what', 'when', 'where', 'who', 'whom', 'which', 'why',
  'do', 'does', 'did', 'has', 'have', 'had',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'related', 'relate', 'relates',
  'and', 'or', 'but', 'not', 'this', 'that', 'these', 'those',
  'can', 'could', 'will', 'would', 'should', 'shall', 'may', 'might',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them',
]);

// Extracts meaningful search terms from a natural-language query: strips
// punctuation, lowercases, drops stop-words and very short tokens. Falls back
// to the original (truncated) query if nothing meaningful survives, so a
// query of just stop-words still attempts a match rather than matching nothing.
function extractKeywords(query: string, maxKeywords = 6): string[] {
  const tokens = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP_WORDS.has(t));

  const unique = Array.from(new Set(tokens)).slice(0, maxKeywords);
  return unique.length > 0 ? unique : [query.substring(0, 200)];
}

function assertSafeIdentifier(value: string, kind: string): string {
  if (!IDENTIFIER_RE.test(value)) {
    throw new Error(`Invalid ${kind}: "${value}" is not a safe Cypher identifier`);
  }
  return value;
}

// Escapes a string for use inside a single-quoted Cypher string literal, and
// strips '$$' which would otherwise terminate the outer SQL dollar-quoted block
// regardless of Cypher-level escaping.
function escapeCypherString(value: string): string {
  return value
    .replace(/\$\$/g, '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

function cypherStringLiteral(value: string): string {
  return `'${escapeCypherString(value)}'`;
}

// Builds a Cypher map literal from a properties object, escaping every string
// value and validating every key as a safe identifier — never splices raw
// JSON.stringify output into the query body.
function cypherPropertyMap(properties: Record<string, unknown>): string {
  const entries = Object.entries(properties).map(([key, value]) => {
    assertSafeIdentifier(key, 'property key');
    return `${key}: ${cypherValueLiteral(value)}`;
  });
  return `{${entries.join(', ')}}`;
}

function cypherValueLiteral(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'string') return cypherStringLiteral(value);
  if (Array.isArray(value)) return `[${value.map(cypherValueLiteral).join(', ')}]`;
  if (typeof value === 'object') return cypherPropertyMap(value as Record<string, unknown>);
  return cypherStringLiteral(String(value));
}

// Strips AGE's agtype type suffixes. These appear both at the top level
// (e.g. a single "{...}::vertex") and after every element of an array result
// (e.g. "[{...}::vertex, {...}::vertex]" from nodes(p)/relationships(p)) —
// each occurrence must be stripped before the string is valid JSON.
function stripAgtypeSuffixes(raw: string): string {
  return raw.replace(/([}\]])::[a-zA-Z]+/g, '$1');
}

// Parses an agtype string after stripping type suffixes. Returns null on any
// malformed input rather than throwing, since agtype formatting has
// version-specific quirks.
function parseAgtypeValue(raw: string): unknown {
  try {
    return JSON.parse(stripAgtypeSuffixes(raw).trim());
  } catch (err) {
    logger.warn('Failed to parse agtype value', { raw: raw.slice(0, 200), err: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

function toGraphNode(raw: unknown): GraphNode | null {
  const parsed = (typeof raw === 'string' ? parseAgtypeValue(raw) : raw) as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== 'object') return null;
  const id = parsed.id;
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    labels: Array.isArray(parsed.label) ? (parsed.label as string[]) : parsed.label ? [String(parsed.label)] : [],
    properties: (parsed.properties as Record<string, unknown>) ?? {},
  };
}

function toGraphEdge(raw: unknown): GraphEdge | null {
  const parsed = (typeof raw === 'string' ? parseAgtypeValue(raw) : raw) as Record<string, unknown> | null;
  if (!parsed || typeof parsed !== 'object') return null;
  const id = parsed.id;
  if (id === undefined || id === null) return null;
  return {
    id: String(id),
    type: String(parsed.label ?? 'RELATED_TO'),
    start_node_id: String(parsed.start_id ?? ''),
    end_node_id: String(parsed.end_id ?? ''),
    properties: (parsed.properties as Record<string, unknown>) ?? {},
  };
}

export class GraphRepository extends BaseRepository implements IGraphRepository {
  private readonly graphName = 'fugu_graph';

  // `columns` must match the number and order of expressions in the Cypher
  // query's RETURN clause — AGE's cypher() requires the SQL-side column list
  // declared via AS (...) to line up exactly, or Postgres raises "return row
  // and column definition list do not match".
  private async ageQuery<T>(cypher: string, columns: string[] = ['result']): Promise<T[]> {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path = ag_catalog, "$user", public`);
      await client.query(`LOAD 'age'`);
      const columnList = columns.map((c) => `${c} agtype`).join(', ');
      const result = await client.query(`
        SELECT * FROM cypher('${this.graphName}', $$ ${cypher} $$) AS (${columnList})
      `);
      return result.rows as T[];
    } finally {
      client.release();
    }
  }

  async upsertNode(data: {
    org_id: string;
    external_id: string;
    labels: string[];
    properties: Record<string, unknown>;
  }): Promise<string> {
    const label = assertSafeIdentifier(data.labels[0] ?? 'Entity', 'node label');
    const orgId = cypherStringLiteral(data.org_id);
    const externalId = cypherStringLiteral(data.external_id);
    const props = cypherPropertyMap({ ...data.properties, org_id: data.org_id, external_id: data.external_id });

    await this.ageQuery(
      `MERGE (n:${label} {org_id: ${orgId}, external_id: ${externalId}})
       SET n = ${props}
       RETURN id(n)`
    );
    return data.external_id;
  }

  async upsertEdge(data: {
    org_id: string;
    from_id: string;
    to_id: string;
    type: string;
    properties?: Record<string, unknown>;
  }): Promise<void> {
    const relType = assertSafeIdentifier(data.type, 'relationship type');
    const orgId = cypherStringLiteral(data.org_id);
    const fromId = cypherStringLiteral(data.from_id);
    const toId = cypherStringLiteral(data.to_id);
    const props = cypherPropertyMap(data.properties ?? {});

    await this.ageQuery(
      `MATCH (a {org_id: ${orgId}, external_id: ${fromId}})
       MATCH (b {org_id: ${orgId}, external_id: ${toId}})
       MERGE (a)-[r:${relType}]->(b)
       SET r = ${props}
       RETURN r`
    );
  }

  async traversalSearch(params: {
    org_id: string;
    query: string;
    depth?: number;
    top_k?: number;
  }): Promise<GraphSearchResult[]> {
    // Keyword-based entity lookup + neighborhood traversal: natural-language
    // queries are reduced to meaningful terms (stop-words stripped) and
    // matched against node name/labels with OR, so a query like "How is
    // Alice related to ACME?" matches nodes named "Alice" or "ACME" rather
    // than requiring the entire sentence to appear in a single property.
    const depth = Math.max(0, Math.min(params.depth ?? 2, 5));
    const limit = Math.max(1, Math.min(params.top_k ?? 10, 100));
    const orgId = cypherStringLiteral(params.org_id);
    const keywords = extractKeywords(params.query);
    const nameMatchClause = keywords
      .map((kw) => `n.name =~ ${cypherStringLiteral('(?i).*' + escapeCypherString(kw) + '.*')}`)
      .join(' OR ');

    try {
      // Both path endpoints are org-scoped in the MATCH pattern. Apache AGE
      // does not support ALL()/list-comprehension predicates, so intermediate
      // nodes of a multi-hop path cannot be constrained in Cypher — they are
      // re-verified below in application code (nodes with a foreign org_id and
      // any edge touching them are dropped) since AGE has no FK-style
      // constraint stopping cross-org relationships.
      const rows = await this.ageQuery<{ nodes: string; edges: string }>(
        `MATCH p = (n {org_id: ${orgId}})-[*0..${depth}]-(m {org_id: ${orgId}})
         WHERE (${nameMatchClause})
         RETURN nodes(p), relationships(p)
         LIMIT ${limit}`,
        ['nodes', 'edges']
      );

      const graphResults: GraphSearchResult[] = [];
      for (const row of rows) {
        const rawNodes = Array.isArray(row.nodes) ? row.nodes : parseAgtypeValue(String(row.nodes));
        const rawEdges = Array.isArray(row.edges) ? row.edges : parseAgtypeValue(String(row.edges));

        // Tenant re-verification: drop any path node not belonging to this
        // org (AGE cannot constrain intermediate path nodes in Cypher) and
        // any edge that touches a dropped node.
        const nodes = (Array.isArray(rawNodes) ? rawNodes : [])
          .map(toGraphNode)
          .filter((n): n is GraphNode => n !== null && n.properties.org_id === params.org_id);
        const allowedIds = new Set(nodes.map((n) => n.id));
        const edges = (Array.isArray(rawEdges) ? rawEdges : [])
          .map(toGraphEdge)
          .filter((e): e is GraphEdge => e !== null && allowedIds.has(e.start_node_id) && allowedIds.has(e.end_node_id));

        graphResults.push({
          nodes,
          edges,
          paths: [{ nodes, edges }],
          score: nodes.length > 0 ? 1 / nodes.length : 0,
        });
      }

      // Dedupe nodes/edges across path rows by id, keep per-path score ordering.
      const seenNodeIds = new Set<string>();
      const seenEdgeIds = new Set<string>();
      for (const result of graphResults) {
        result.nodes = result.nodes.filter((n) => (seenNodeIds.has(n.id) ? false : (seenNodeIds.add(n.id), true)));
        result.edges = result.edges.filter((e) => (seenEdgeIds.has(e.id) ? false : (seenEdgeIds.add(e.id), true)));
      }

      return graphResults.filter((r) => r.nodes.length > 0 || r.edges.length > 0);
    } catch (err) {
      // Graceful fallback: graph backend unavailable, return empty
      logger.warn('Graph traversalSearch failed', { err: err instanceof Error ? err.message : String(err) });
      return [];
    }
  }

  async deleteByOrg(org_id: string): Promise<void> {
    const orgId = cypherStringLiteral(org_id);
    await this.ageQuery(`MATCH (n {org_id: ${orgId}}) DETACH DELETE n`);
  }
}
