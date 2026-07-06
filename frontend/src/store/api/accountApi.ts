import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';
import { updateUser } from '../authSlice';
import type { AuthUser } from '../authSlice';

export const accountApi = createApi({
  reducerPath: 'accountApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    updateProfile: builder.mutation<{ user: AuthUser }, { full_name?: string }>({
      query: (body) => ({ url: '/account/profile', method: 'PATCH', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(updateUser(data.user));
      },
    }),
    deleteOrganization: builder.mutation<{ message: string }, void>({
      query: () => ({ url: '/account/organization', method: 'DELETE' }),
    }),
  }),
});

export const { useUpdateProfileMutation, useDeleteOrganizationMutation } = accountApi;
