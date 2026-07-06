import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { store } from './store';
import { AppRouter } from './router/AppRouter';
import { ErrorBoundary } from './components/system/ErrorBoundary';
import { colors } from './theme/tokens';
import './theme/globals.css';

const GOOGLE_CLIENT_ID = '1041724724475-lp27ndbbv5osclmo3dpdcaop5fq12bq9.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: colors['surface-container-lowest'],
            color: colors['on-surface'],
            border: `1px solid ${colors['outline-variant']}`,
            borderRadius: '10px',
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
          },
        }}
      />
    </Provider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
