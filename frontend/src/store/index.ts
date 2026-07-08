import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import uiReducer from './uiSlice';
import { authApi } from './api/authApi';
import { apiKeyApi } from './api/apiKeyApi';
import { documentApi } from './api/documentApi';
import { queryApi } from './api/queryApi';
import { billingApi } from './api/billingApi';
import { teamApi } from './api/teamApi';
import { webhookApi } from './api/webhookApi';
import { auditApi } from './api/auditApi';
import { accountApi } from './api/accountApi';
import { credentialApi } from './api/credentialApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    [authApi.reducerPath]: authApi.reducer,
    [apiKeyApi.reducerPath]: apiKeyApi.reducer,
    [documentApi.reducerPath]: documentApi.reducer,
    [queryApi.reducerPath]: queryApi.reducer,
    [billingApi.reducerPath]: billingApi.reducer,
    [teamApi.reducerPath]: teamApi.reducer,
    [webhookApi.reducerPath]: webhookApi.reducer,
    [auditApi.reducerPath]: auditApi.reducer,
    [accountApi.reducerPath]: accountApi.reducer,
    [credentialApi.reducerPath]: credentialApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(
      authApi.middleware,
      apiKeyApi.middleware,
      documentApi.middleware,
      queryApi.middleware,
      billingApi.middleware,
      teamApi.middleware,
      webhookApi.middleware,
      auditApi.middleware,
      accountApi.middleware,
      credentialApi.middleware
    ),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
