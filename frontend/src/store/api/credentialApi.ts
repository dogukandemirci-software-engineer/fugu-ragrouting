import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';

export type LLMCredentialProvider = 'anthropic' | 'openai' | 'gemini' | 'openrouter';

export interface LLMCredential {
  provider: LLMCredentialProvider;
  model: string;
  keyLastFour: string;
  lastVerifiedAt: string;
}

export const credentialApi = createApi({
  reducerPath: 'credentialApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Credential'],
  endpoints: (builder) => ({
    getCredential: builder.query<{ credential: LLMCredential | null }, void>({
      query: () => '/organization/llm-credential',
      providesTags: ['Credential'],
    }),
    saveCredential: builder.mutation<{ credential: LLMCredential }, { provider: LLMCredentialProvider; model: string; apiKey: string }>({
      query: (body) => ({ url: '/organization/llm-credential', method: 'PUT', body }),
      invalidatesTags: ['Credential'],
    }),
    removeCredential: builder.mutation<void, void>({
      query: () => ({ url: '/organization/llm-credential', method: 'DELETE' }),
      invalidatesTags: ['Credential'],
    }),
  }),
});

export const {
  useGetCredentialQuery,
  useSaveCredentialMutation,
  useRemoveCredentialMutation,
} = credentialApi;
