import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from '../../lib/apiClient';
import { setCredentials, logout } from '../authSlice';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: baseQueryWithReauth,
  endpoints: (builder) => ({
    signUp: builder.mutation<
      { tokens: { access_token: string; refresh_token: string }; user: any; organization_id: string },
      { email: string; password: string; full_name: string; organization_name: string }
    >({
      query: (body) => ({ url: '/auth/sign-up', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials({ user: data.user, organizationId: data.organization_id, accessToken: data.tokens.access_token }));
        localStorage.setItem('refresh_token', data.tokens.refresh_token);
      },
    }),
    logIn: builder.mutation<
      { tokens: { access_token: string; refresh_token: string }; user: any; organization_id: string },
      { email: string; password: string }
    >({
      query: (body) => ({ url: '/auth/log-in', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials({ user: data.user, organizationId: data.organization_id, accessToken: data.tokens.access_token }));
        localStorage.setItem('refresh_token', data.tokens.refresh_token);
      },
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST', body: { refresh_token: localStorage.getItem('refresh_token') } }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        dispatch(logout());
        await queryFulfilled.catch(() => {});
      },
    }),
    forgotPassword: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: '/auth/forgot-password', method: 'POST', body }),
    }),
    resetPassword: builder.mutation<{ message: string }, { token: string; new_password: string }>({
      query: (body) => ({ url: '/auth/reset-password', method: 'POST', body }),
    }),
    googleAuth: builder.mutation<
      { tokens: { access_token: string; refresh_token: string }; user: any; organization_id: string },
      { id_token: string }
    >({
      query: (body) => ({ url: '/auth/google', method: 'POST', body }),
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled;
        dispatch(setCredentials({ user: data.user, organizationId: data.organization_id, accessToken: data.tokens.access_token }));
        localStorage.setItem('refresh_token', data.tokens.refresh_token);
      },
    }),
  }),
});

export const { useSignUpMutation, useLogInMutation, useLogoutMutation, useForgotPasswordMutation, useResetPasswordMutation, useGoogleAuthMutation } = authApi;
