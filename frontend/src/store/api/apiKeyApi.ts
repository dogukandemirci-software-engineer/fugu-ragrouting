import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  last_used_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export const apiKeyApi = createApi({
  reducerPath: 'apiKeyApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['ApiKey'],
  endpoints: (builder) => ({
    listApiKeys: builder.query<{ keys: ApiKey[] }, void>({
      query: () => '/api-keys',
      providesTags: ['ApiKey'],
    }),
    createApiKey: builder.mutation<{ key: ApiKey; raw_key: string }, { name: string; permissions: string[]; expires_at?: string }>({
      query: (body) => ({ url: '/api-keys', method: 'POST', body }),
      invalidatesTags: ['ApiKey'],
    }),
    revokeApiKey: builder.mutation<void, string>({
      query: (id) => ({ url: `/api-keys/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ApiKey'],
    }),
  }),
});

export const { useListApiKeysQuery, useCreateApiKeyMutation, useRevokeApiKeyMutation } = apiKeyApi;
