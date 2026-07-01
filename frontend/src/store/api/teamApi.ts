import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';

export interface TeamMember {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string | null;
}

export const teamApi = createApi({
  reducerPath: 'teamApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Team'],
  endpoints: (builder) => ({
    listTeam: builder.query<{ members: TeamMember[] }, void>({
      query: () => '/team',
      providesTags: ['Team'],
    }),
    inviteMember: builder.mutation<{ message: string }, { email: string; role: string }>({
      query: (body) => ({ url: '/team/invite', method: 'POST', body }),
      invalidatesTags: ['Team'],
    }),
    updateMemberRole: builder.mutation<{ message: string }, { memberId: string; role: string }>({
      query: ({ memberId, role }) => ({ url: `/team/${memberId}/role`, method: 'PATCH', body: { role } }),
      invalidatesTags: ['Team'],
    }),
    removeMember: builder.mutation<void, string>({
      query: (memberId) => ({ url: `/team/${memberId}`, method: 'DELETE' }),
      invalidatesTags: ['Team'],
    }),
  }),
});

export const { useListTeamQuery, useInviteMemberMutation, useUpdateMemberRoleMutation, useRemoveMemberMutation } = teamApi;
