import { BaseRepository } from './base.repository';
import { IGraphRepository, GraphSearchResult } from '../interfaces/i-graph-repository';
import { pool } from '../config/database';

// Apache AGE queries run via cypher() function within a SET search_path context.
// Cypher syntax: SELECT * FROM cypher('graph_name', $$ ... $$) AS (col agtype);

export class GraphRepository extends BaseRepository implements IGraphRepository {
  private readonly graphName = 'fugu_graph';

  private async ageQuery<T>(cypher: string, params?: Record<string, unknown>): Promise<T[]> {
    const client = await pool.connect();
    try {
      await client.query(`SET search_path = ag_catalog, "$user", public`);
      await client.query(`LOAD 'age'`);
      const result = await client.query(`
        SELECT * FROM cypher('${this.graphName}', $$ ${cypher} $$) AS (result agtype)
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
    const label = data.labels[0] ?? 'Entity';
    const props = JSON.stringify({ ...data.properties, org_id: data.org_id, external_id: data.external_id });
    await this.ageQuery(
      `MERGE (n:${label} {org_id: '${data.org_id}', external_id: '${data.external_id}'})
       ON CREATE SET n = ${props}
       ON MATCH SET n += ${props}
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
    const props = JSON.stringify(data.properties ?? {});
    await this.ageQuery(
      `MATCH (a {org_id: '${data.org_id}', external_id: '${data.from_id}'})
       MATCH (b {org_id: '${data.org_id}', external_id: '${data.to_id}'})
       MERGE (a)-[r:${data.type}]->(b)
       ON CREATE SET r = ${props}
       RETURN r`
    );
  }

  async traversalSearch(params: {
    org_id: string;
    query: string;
    depth?: number;
    top_k?: number;
  }): Promise<GraphSearchResult[]> {
    // Keyword-based entity lookup + neighborhood traversal
    // Production implementation would use full-text search on node properties first,
    // then traverse. This is a simplified version.
    const depth = params.depth ?? 2;
    const limit = params.top_k ?? 10;
    const keyword = params.query.replace(/'/g, "\\'").substring(0, 200);

    try {
      const rows = await this.ageQuery<{ result: string }>(
        `MATCH p = (n {org_id: '${params.org_id}'})-[*0..${depth}]-(m)
         WHERE n.name =~ '(?i).*${keyword}.*'
         RETURN p
         LIMIT ${limit}`
      );

      // AGE returns agtype — parse into structured result
      return rows.map((row) => ({
        nodes: [],
        edges: [],
        paths: [],
        score: 1.0,
        raw: row.result,
      })) as unknown as GraphSearchResult[];
    } catch {
      // Graceful fallback: graph backend unavailable, return empty
      return [];
    }
  }

  async deleteByOrg(org_id: string): Promise<void> {
    await this.ageQuery(
      `MATCH (n {org_id: '${org_id}'}) DETACH DELETE n`
    );
  }
}
