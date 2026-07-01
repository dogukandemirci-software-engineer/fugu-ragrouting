export interface QueryLog {
  id: string;
  organization_id: string;
  api_key_id: string | null;
  user_id: string | null;
  query_text: string;
  routing_strategy: 'vector_only' | 'graph_only' | 'hybrid';
  classifier_used: string;
  classifier_confidence: number | null;
  vector_results_count: number | null;
  graph_results_count: number | null;
  fusion_score: number | null;
  response_time_ms: number;
  error: string | null;
  explain_data: Record<string, unknown>;
  created_at: Date;
}
