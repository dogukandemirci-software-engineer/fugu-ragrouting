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

export interface PendingInvitation {
  id: string;
  organization_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  invited_at: string;
  org_name: string;
  invited_by_email: string | null;
}

export const teamApi = createApi({
  reducerPath: 'teamApi',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Team', 'Invitations'],
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
    listPendingInvitations: builder.query<{ invitations: PendingInvitation[] }, void>({
      query: () => '/account/invitations',
      providesTags: ['Invitations'],
    }),
    acceptInvitation: builder.mutation<{ message: string }, string>({
      query: (orgId) => ({ url: `/account/invitations/${orgId}/accept`, method: 'POST' }),
      invalidatesTags: ['Invitations'],
    }),
    declineInvitation: builder.mutation<{ message: string }, string>({
      query: (orgId) => ({ url: `/account/invitations/${orgId}/decline`, method: 'POST' }),
      invalidatesTags: ['Invitations'],
    }),
  }),
});

export const {
  useListTeamQuery,
  useInviteMemberMutation,
  useUpdateMemberRoleMutation,
  useRemoveMemberMutation,
  useListPendingInvitationsQuery,
  useAcceptInvitationMutation,
  useDeclineInvitationMutation,
} = teamApi;
