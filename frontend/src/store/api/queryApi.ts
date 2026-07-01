import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';
import { setGraphUnavailable } from '../uiSlice';

export interface QueryLog {
  id: string;
  query_text: string;
  routing_strategy: string;
  classifier_used: string;
  classifier_confidence: number | null;
  response_time_ms: number;
  explain_data: Record<string, unknown>;
  created_at: string;
}

export interface QueryResult {
  content: string;
  source: 'vector' | 'graph';
  score: number;
  document_id?: string;
  metadata: Record<string, unknown>;
}

export interface QueryResponse {
  results: QueryResult[];
  explain: Record<string, unknown>;
  quota: { used: number; limit: number; percent: number; warn: boolean };
}

export const queryApi = createApi({
  reducerPath: 'queryApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['QueryLog'],
  endpoints: (builder) => ({
    executeQuery: builder.mutation<QueryResponse, { query: string; strategy?: string; top_k?: number }>({
      query: (body) => ({ url: '/queries/execute', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        // Signal graph unavailable if explain data indicates fallback
        const graphAvail = (data.explain as any)?.graph_available;
        if (graphAvail === false) dispatch(setGraphUnavailable(true));
      },
    }),
    listQueryLogs: builder.query<{ logs: QueryLog[] }, { limit?: number; offset?: number }>({
      query: (params) => `/queries/logs?limit=${params.limit ?? 20}&offset=${params.offset ?? 0}`,
      providesTags: ['QueryLog'],
    }),
    getQueryLog: builder.query<{ log: QueryLog }, string>({
      query: (id) => `/queries/logs/${id}`,
    }),
  }),
});

export const { useExecuteQueryMutation, useListQueryLogsQuery, useGetQueryLogQuery } = queryApi;
