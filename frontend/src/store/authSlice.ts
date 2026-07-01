import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  email_verified_at: string | null;
}

interface AuthState {
  user: AuthUser | null;
  organizationId: string | null;
  accessToken: string | null;
  isAuthenticated: boolean;
}

const initialState: AuthState = {
  user: null,
  organizationId: null,
  accessToken: localStorage.getItem('access_token'),
  isAuthenticated: !!localStorage.getItem('access_token'),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: AuthUser; organizationId: string; accessToken: string }>) {
      state.user = action.payload.user;
      state.organizationId = action.payload.organizationId;
      state.accessToken = action.payload.accessToken;
      state.isAuthenticated = true;
      localStorage.setItem('access_token', action.payload.accessToken);
    },
    logout(state) {
      state.user = null;
      state.organizationId = null;
      state.accessToken = null;
      state.isAuthenticated = false;
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    },
    refreshToken(state, action: PayloadAction<string>) {
      state.accessToken = action.payload;
      localStorage.setItem('access_token', action.payload);
    },
  },
});

export const { setCredentials, logout, refreshToken } = authSlice.actions;
export default authSlice.reducer;
