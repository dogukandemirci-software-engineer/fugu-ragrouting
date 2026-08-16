import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { Toaster } from 'react-hot-toast';
import { store } from './store';
import { AppRouter } from './router/AppRouter';
import { ErrorBoundary } from './components/system/ErrorBoundary';
import { colors } from './theme/tokens';
import './theme/globals.css';


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0a0a0a',
            color: '#ffffff',
            border: `1px solid ${colors['outline-variant']}`,
            borderRadius: '12px',
            fontFamily: 'IBM Plex Sans, sans-serif',
            fontSize: '14px',
          },
        }}
      />
    </Provider>
  </React.StrictMode>
);
