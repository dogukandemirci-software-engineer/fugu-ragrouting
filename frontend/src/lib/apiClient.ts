import { fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { RootState } from '../store';

const BASE_URL = '/api';

const baseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) headers.set('authorization', `Bearer ${token}`);
    return headers;
  },
});

// Auto-refresh on 401
export const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refresh_token = localStorage.getItem('refresh_token');
    if (refresh_token) {
      const refreshResult = await baseQuery(
        { url: '/auth/refresh', method: 'POST', body: { refresh_token } },
        api,
        extraOptions
      );
      if (refreshResult.data) {
        const { access_token, refresh_token: newRefresh } = refreshResult.data as {
          access_token: string;
          refresh_token: string;
        };
        const { refreshToken } = await import('../store/authSlice');
        api.dispatch(refreshToken(access_token));
        localStorage.setItem('refresh_token', newRefresh);
        result = await baseQuery(args, api, extraOptions);
      } else {
        const { logout } = await import('../store/authSlice');
        api.dispatch(logout());
      }
    }
  }

  return result;
};
