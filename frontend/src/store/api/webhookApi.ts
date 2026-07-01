import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';

export interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  last_triggered_at: string | null;
  failure_count: number;
  created_at: string;
}

export const webhookApi = createApi({
  reducerPath: 'webhookApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Webhook'],
  endpoints: (builder) => ({
    listWebhooks: builder.query<{ webhooks: Webhook[] }, void>({
      query: () => '/webhooks',
      providesTags: ['Webhook'],
    }),
    createWebhook: builder.mutation<{ webhook: Webhook; raw_secret: string }, { name: string; url: string; events: string[] }>({
      query: (body) => ({ url: '/webhooks', method: 'POST', body }),
      invalidatesTags: ['Webhook'],
    }),
    deleteWebhook: builder.mutation<void, string>({
      query: (id) => ({ url: `/webhooks/${id}`, method: 'DELETE' }),
      invalidatesTags: ['Webhook'],
    }),
  }),
});

export const { useListWebhooksQuery, useCreateWebhookMutation, useDeleteWebhookMutation } = webhookApi;
