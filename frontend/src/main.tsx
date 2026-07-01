import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { store } from './store';
import { AppRouter } from './router/AppRouter';
import './theme/globals.css';

const GOOGLE_CLIENT_ID = '1041724724475-lp27ndbbv5osclmo3dpdcaop5fq12bq9.apps.googleusercontent.com';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <Provider store={store}>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#ffffff',
            color: '#1a1b23',
            border: '1px solid #e3e1ec',
            borderRadius: '10px',
            fontFamily: 'Geist, Inter, sans-serif',
            fontSize: '14px',
          },
        }}
      />
    </Provider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
