export interface GraphNode {
  id: string;
  labels: string[];
  properties: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  type: string;
  start_node_id: string;
  end_node_id: string;
  properties: Record<string, unknown>;
}

export interface GraphSearchResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  paths: Array<{ nodes: GraphNode[]; edges: GraphEdge[] }>;
  score: number;
}

export interface IGraphRepository {
  upsertNode(data: { org_id: string; external_id: string; labels: string[]; properties: Record<string, unknown> }): Promise<string>;
  upsertEdge(data: { org_id: string; from_id: string; to_id: string; type: string; properties?: Record<string, unknown> }): Promise<void>;
  traversalSearch(params: { org_id: string; query: string; depth?: number; top_k?: number }): Promise<GraphSearchResult[]>;
  deleteByOrg(org_id: string): Promise<void>;
}
