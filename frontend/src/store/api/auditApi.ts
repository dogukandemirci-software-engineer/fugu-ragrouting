import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';

export interface AuditLogEntry {
  id: string;
  action: string;
  resource_id?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  actor_full_name?: string | null;
  actor_email?: string | null;
}

export const auditApi = createApi({
  reducerPath: 'auditApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['AuditLog', 'Notification'],
  endpoints: (builder) => ({
    listAuditLogs: builder.query<{ logs: AuditLogEntry[] }, { limit?: number; offset?: number } | void>({
      query: (params) => `/audit-logs?limit=${params?.limit ?? 50}&offset=${params?.offset ?? 0}`,
      providesTags: ['AuditLog'],
    }),
    listNotifications: builder.query<{ notifications: AuditLogEntry[] }, void>({
      query: () => '/notifications',
      providesTags: ['Notification'],
    }),
  }),
});

export const { useListAuditLogsQuery, useListNotificationsQuery } = auditApi;
