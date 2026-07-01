import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';

export interface Document {
  id: string;
  name: string;
  file_type: string;
  file_size: number;
  status: 'pending' | 'processing' | 'ready' | 'failed';
  error_message: string | null;
  chunk_count: number;
  created_at: string;
}

export const documentApi = createApi({
  reducerPath: 'documentApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Document'],
  endpoints: (builder) => ({
    listDocuments: builder.query<{ documents: Document[] }, void>({
      query: () => '/documents',
      providesTags: ['Document'],
    }),
    getDocument: builder.query<{ document: Document }, string>({
      query: (id) => `/documents/${id}`,
      providesTags: (_result, _err, id) => [{ type: 'Document', id }],
    }),
    uploadDocument: builder.mutation<{ document_id: string; status: string }, FormData>({
      query: (body) => ({ url: '/documents', method: 'POST', body }),
      invalidatesTags: ['Document'],
    }),
    deleteDocument: builder.mutation<void, string>({
      query: (id) => ({ url: `/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Document'],
    }),
    retryDocument: builder.mutation<{ status: string }, string>({
      query: (id) => ({ url: `/documents/${id}/retry`, method: 'POST' }),
      invalidatesTags: ['Document'],
    }),
  }),
});

export const {
  useListDocumentsQuery,
  useGetDocumentQuery,
  useUploadDocumentMutation,
  useDeleteDocumentMutation,
  useRetryDocumentMutation,
} = documentApi;
